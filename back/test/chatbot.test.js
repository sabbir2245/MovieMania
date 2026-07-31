// Chatbot backend tests — MovieMania.
//
// Uses Node's built-in test runner (run with:  npm test) plus mock-require and
// supertest, exactly like the existing backend.test.js. The Postgres pool is
// mocked with a tiny in-memory dataset so the suite is fully offline.
//
// Sample data mirrors real rows the user has in Supabase:
//   Gladiator          rating 8.5
//   Top Gun: Maverick  rating 8.6
//   The Batman         rating 8.0 (2 reviews)

process.env.JWT_SECRET = 'test_secret';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const mock = require('mock-require');

const BASE = path.join(__dirname, '..');

// ---------- Mock DB ----------
const dataset = [
  {
    id: 1,
    title: 'Gladiator',
    year: 2000,
    release_date: '2000-05-05T00:00:00.000Z',
    plot: 'A betrayed Roman general seeks vengeance.',
    budget: '103000000',
    boxoffice: '460500000',
    rating: 8.5,
    runtime: 155,
    votes: 1500000,
    poster_url: null,
    rating_label: 'R',
    trailer_link: null,
  },
  {
    id: 2,
    title: 'Top Gun: Maverick',
    year: 2022,
    release_date: '2022-05-27T00:00:00.000Z',
    plot: 'Maverick trains a new squad of fighter pilots.',
    budget: '170000000',
    boxoffice: '1496000000',
    rating: 8.6,
    runtime: 130,
    votes: 500000,
    poster_url: null,
    rating_label: 'PG-13',
    trailer_link: null,
  },
  {
    id: 27,
    title: 'The Batman',
    year: 2022,
    release_date: '2022-03-04T00:00:00.000Z',
    plot: 'Batman investigates a serial killer in Gotham.',
    budget: '185000000',
    boxoffice: '770800000',
    rating: 8.0,
    runtime: 176,
    votes: 2,
    poster_url: null,
    rating_label: 'PG-13',
    trailer_link: null,
  },
  {
    id: 1,
    title: 'The Shawshank Redemption',
    year: 1994,
    release_date: '1994-10-14T00:00:00.000Z',
    plot: 'A banker is sentenced to life in Shawshank prison.',
    budget: null,
    boxoffice: null,
    rating: 7.14,
    runtime: 142,
    votes: 7,
    poster_url: null,
    rating_label: 'R',
    trailer_link: null,
  },
];

const poolCalls = [];
const fakePool = {
  query: async (sql) => {
    poolCalls.push(sql);
    if (sql.includes('COUNT(')) {
      // review-count queries
      return { rows: [{ count: 2 }] };
    }
    return { rows: dataset };
  },
};

mock(path.join(BASE, 'pool.js'), { pool: fakePool });

const request = require('supertest');
const { createApp } = require(path.join(BASE, 'app.js'));
const app = createApp();

const service = require(path.join(BASE, 'services', 'chatbotService.js'));

beforeEach(() => {
  poolCalls.length = 0;
});

// ---------- Classifier (pure logic) ----------
test('classifyIntent detects rating questions', () => {
  assert.strictEqual(service.classifyIntent('what is the rating of gladiator', dataset), 'rating');
});

test('classifyIntent detects "better rating than X"', () => {
  assert.strictEqual(service.classifyIntent('which movies have a better rating than gladiator', dataset), 'better_rating');
});

test('classifyIntent detects "greater rating than X" (typo variant)', () => {
  assert.strictEqual(service.classifyIntent('which movies have greater rating than the batman', dataset), 'better_rating');
});

test('classifyIntent detects release date questions', () => {
  assert.strictEqual(service.classifyIntent('when was top gun maverick released', dataset), 'release_date');
});

test('classifyIntent detects top rated', () => {
  assert.strictEqual(service.classifyIntent('what are the top rated movies', dataset), 'top_movies');
});

test('classifyIntent detects review count', () => {
  assert.strictEqual(service.classifyIntent('how many people have reviewed the batman', dataset), 'review_count');
});

test('classifyIntent detects compare', () => {
  assert.strictEqual(service.classifyIntent('compare gladiator and top gun maverick', dataset), 'compare');
});

test('classifyIntent falls back to unknown', () => {
  assert.strictEqual(service.classifyIntent('what is the weather today', dataset), 'unknown');
});

// ---------- Title matching ----------
test('findMovie matches a title inside a sentence', () => {
  const m = service.findMovie('what is the rating of top gun maverick', dataset);
  assert.strictEqual(m.title, 'Top Gun: Maverick');
});

test('findMovie returns null when no title present', () => {
  assert.strictEqual(service.findMovie('hello there', dataset), null);
});

test('findMovie matches a title even when the query drops the leading "the"', () => {
  const m = service.findMovie('how many reviews does shawshank redemption have', dataset);
  assert.strictEqual(m.title, 'The Shawshank Redemption');
});

test('findMovie matches a partial title ("shawshank")', () => {
  const m = service.findMovie('how many reviews does shawshank have', dataset);
  assert.strictEqual(m.title, 'The Shawshank Redemption');
});

test('answerMessage answers partial-title review count', async () => {
  const { intent, reply } = await service.answerMessage('how many reviews does shawshank have');
  assert.strictEqual(intent, 'review_count');
  assert.match(reply, /The Shawshank Redemption/);
  assert.match(reply, /2 people/);
});

test('answerMessage uses the clean default when a movie is not found', async () => {
  const { reply } = await service.answerMessage('how many reviews does flargblaster have');
  assert.match(reply, /couldn't find that movie/);
  assert.doesNotMatch(reply, /Gladiator/);
});

// ---------- Session memory ----------
test('findLastMovieInHistory returns the most recent movie', () => {
  const history = [
    { role: 'user', content: 'what is the rating of the batman' },
    { role: 'assistant', content: 'The Batman has a rating of 8.00/10' },
    { role: 'user', content: 'what about its budget' },
  ];
  const m = service.findLastMovieInHistory(history, dataset);
  assert.strictEqual(m.title, 'The Batman');
});

test('answerMessage remembers the movie across a session', async () => {
  const history = [
    { role: 'user', content: 'what is the rating of the batman' },
    { role: 'assistant', content: 'The Batman has a rating of 8.00/10' },
    { role: 'user', content: 'what about its budget' },
  ];
  const { intent, reply } = await service.answerMessage('what about its budget', history);
  assert.strictEqual(intent, 'budget');
  assert.match(reply, /The Batman/);
});

// ---------- answerMessage (integration through service) ----------
test('answerMessage replies with the movie rating', async () => {
  const { reply, intent, data } = await service.answerMessage('what is the rating of gladiator');
  assert.strictEqual(intent, 'rating');
  assert.match(reply, /Gladiator/);
  assert.match(reply, /8\.50/);
  assert.strictEqual(data.title, 'Gladiator');
});

test('answerMessage lists movies with a better rating', async () => {
  const { reply, intent, data } = await service.answerMessage('which movies have a better rating than gladiator');
  assert.strictEqual(intent, 'better_rating');
  assert.match(reply, /Top Gun: Maverick/);
  assert.strictEqual(data.higherRated[0].title, 'Top Gun: Maverick');
});

test('answerMessage lists movies with a greater rating than The Batman', async () => {
  const { reply, intent } = await service.answerMessage('which movies have greater rating than the batman');
  assert.strictEqual(intent, 'better_rating');
  assert.match(reply, /Gladiator/);
  assert.match(reply, /Top Gun: Maverick/);
});

test('answerMessage replies with review count', async () => {
  const { reply, intent, data } = await service.answerMessage('how many people have reviewed the batman');
  assert.strictEqual(intent, 'review_count');
  assert.match(reply, /2 people/);
  assert.strictEqual(data.reviewCount, 2);
});

test('answerMessage replies with release date', async () => {
  const { reply, intent } = await service.answerMessage('when was gladiator released');
  assert.strictEqual(intent, 'release_date');
  assert.match(reply, /2000|released on/);
});

test('answerMessage handles unknown input gracefully', async () => {
  const { intent, reply } = await service.answerMessage('tell me a joke');
  assert.strictEqual(intent, 'unknown');
  assert.ok(reply.length > 0);
});

// ---------- HTTP routes ----------
test('POST /api/chat returns a rating answer', async () => {
  const res = await request(app)
    .post('/api/chat')
    .send({ message: 'what is the rating of top gun maverick' })
    .expect(200);

  assert.strictEqual(res.body.intent, 'rating');
  assert.match(res.body.reply, /8\.60/);
  assert.strictEqual(poolCalls.length, 1); // one dataset fetch
});

test('POST /api/chat handles empty message with 400', async () => {
  await request(app).post('/api/chat').send({}).expect(400);
  await request(app).post('/api/chat').send({ message: '   ' }).expect(400);
});

test('POST /api/chat/classify returns the intent + movie', async () => {
  const res = await request(app)
    .post('/api/chat/classify')
    .send({ message: 'when was gladiator released' })
    .expect(200);

  assert.strictEqual(res.body.intent, 'release_date');
  assert.strictEqual(res.body.movie, 'Gladiator');
});

test('GET /api/chat/health is ok', async () => {
  const res = await request(app).get('/api/chat/health').expect(200);
  assert.strictEqual(res.body.status, 'ok');
});
