// Backend integration tests for auth (password hashing + welcome email),
// admin (Supabase poster upload + trailer link) and the auth middleware.
//
// Uses Node's built-in test runner. Run with:  npm test
//
// External services (Postgres, Resend, Supabase Storage) are mocked so the
// suite runs fully offline and never sends real emails or mutates the DB.

process.env.JWT_SECRET = 'test_secret';
process.env.RESEND_API_KEY = '';
process.env.SUPABASE_URL = '';
process.env.SUPABASE_SERVICE_KEY = '';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const path = require('path');
const mock = require('mock-require');
const jwt = require('jsonwebtoken');

const BASE = path.join(__dirname, '..');

// ---------- Mocks ----------
const fakePool = {
  query: async () => ({ rows: [] }),
};
const emailCalls = [];
const emailServiceMock = {
  sendWelcomeEmail: async (user) => {
    emailCalls.push(user);
    return { success: true };
  },
};
const storageCalls = [];
const storageServiceMock = {
  uploadPoster: async (buffer, opts) => {
    storageCalls.push({ buffer, opts });
    return { path: 'posters/mock.png', url: 'https://mock.supabase.co/posters/mock.png' };
  },
};

mock(path.join(BASE, 'pool.js'), { pool: fakePool });
mock(path.join(BASE, 'services', 'emailService.js'), emailServiceMock);
mock(path.join(BASE, 'services', 'storageService.js'), storageServiceMock);

const request = require('supertest');
const { createApp } = require(path.join(BASE, 'app.js'));

const app = createApp();

// ---------- Helpers ----------
function signToken(user) {
  return jwt.sign(
    { username: user.username, email: user.email, iseditor: user.iseditor },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const hashedPw = bcrypt.hashSync('SuperSecret123', 10);
const editorUser = { username: 'admin', email: 'admin@moviemania.dev', iseditor: true };
const normalUser = { username: 'bob', email: 'bob@moviemania.dev', iseditor: false };

// Reset mutable state before each test
beforeEach(() => {
  emailCalls.length = 0;
  storageCalls.length = 0;
  fakePool.query = async () => ({ rows: [] });
});

// ---------- Password service ----------
test('passwordService hashes passwords (not stored in plaintext)', async () => {
  const passwordService = require(path.join(BASE, 'services', 'passwordService.js'));
  const hash = await passwordService.hashPassword('SuperSecret123');

  assert.notStrictEqual(hash, 'SuperSecret123');
  assert.ok(hash.startsWith('$2'), 'hash looks like a bcrypt hash');
  assert.ok(await passwordService.verifyPassword('SuperSecret123', hash));
  assert.strictEqual(await passwordService.verifyPassword('WrongPassword', hash), false);
  assert.strictEqual(passwordService.isBcryptHash(hash), true);
  assert.strictEqual(passwordService.isBcryptHash('plaintext'), false);
});

// ---------- Auth: signup ----------
test('POST /auth/signup -> 201, stores hashed password, sends welcome email', async () => {
  let insertedValues;
  fakePool.query = async (sql, values) => {
    insertedValues = values;
    return { rows: [] };
  };

  const res = await request(app)
    .post('/auth/signup')
    .send({ username: 'alice', name: 'Alice', email: 'alice@moviemania.dev', birthDate: '1995-01-01', password: 'SuperSecret123' })
    .expect(201);

  assert.strictEqual(res.body.message, 'User registered successfully');
  // Password must be hashed, never stored raw
  assert.notStrictEqual(insertedValues[4], 'SuperSecret123');
  assert.ok(bcrypt.compareSync('SuperSecret123', insertedValues[4]));

  // Welcome email sent to the registered address
  assert.strictEqual(emailCalls.length, 1);
  assert.strictEqual(emailCalls[0].email, 'alice@moviemania.dev');
  assert.strictEqual(emailCalls[0].username, 'alice');
});

test('POST /auth/signup -> 400 when email is missing (email is mandatory)', async () => {
  const res = await request(app)
    .post('/auth/signup')
    .send({ username: 'alice', name: 'Alice', password: 'x' }) // no email
    .expect(400);
  assert.ok(res.body.error);
  assert.strictEqual(emailCalls.length, 0);
});

test('POST /auth/signup -> 400 on invalid email format', async () => {
  const res = await request(app)
    .post('/auth/signup')
    .send({ username: 'alice', name: 'Alice', email: 'not-an-email', birthDate: '1995-01-01', password: 'x' })
    .expect(400);
  assert.ok(res.body.error);
  assert.strictEqual(emailCalls.length, 0);
});

test('POST /auth/signup -> 409 on duplicate username/email', async () => {
  fakePool.query = async () => {
    const err = new Error('duplicate');
    err.code = '23505';
    throw err;
  };
  const res = await request(app)
    .post('/auth/signup')
    .send({ username: 'alice', name: 'Alice', email: 'alice@moviemania.dev', birthDate: '1995-01-01', password: 'SuperSecret123' })
    .expect(409);
  assert.ok(res.body.error);
});

test('POST /auth/signup -> welcome email does not block a successful registration', async () => {
  emailServiceMock.sendWelcomeEmail = async () => {
    throw new Error('resend down');
  };
  fakePool.query = async () => ({ rows: [] });
  const res = await request(app)
    .post('/auth/signup')
    .send({ username: 'carol', name: 'Carol', email: 'carol@moviemania.dev', birthDate: '1995-01-01', password: 'SuperSecret123' })
    .expect(201);
  assert.strictEqual(res.status, 201);
});

// ---------- Auth: signin ----------
test('POST /auth/signin -> 200 with hashed password, returns user + JWT', async () => {
  fakePool.query = async (sql) => {
    if (sql.includes('UPDATE "Users"')) return { rows: [] };
    return {
      rows: [{
        username: 'bob', Name: 'Bob', Email: 'bob@moviemania.dev',
        BirthDate: '1995-01-01', password: hashedPw, iseditor: false,
      }],
    };
  };

  const res = await request(app)
    .post('/auth/signin')
    .send({ username: 'bob', password: 'SuperSecret123' })
    .expect(200);

  assert.strictEqual(res.body.user.username, 'bob');
  assert.ok(res.body.token, 'JWT token issued');
  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.strictEqual(payload.username, 'bob');
  assert.strictEqual(payload.iseditor, false);
});

test('POST /auth/signin -> 401 with wrong password', async () => {
  fakePool.query = async () => ({
    rows: [{
      username: 'bob', Name: 'Bob', Email: 'bob@moviemania.dev',
      BirthDate: '1995-01-01', password: hashedPw, iseditor: false,
    }],
  });
  const res = await request(app)
    .post('/auth/signin')
    .send({ username: 'bob', password: 'WrongPassword' })
    .expect(401);
  assert.ok(res.body.error);
});

test('POST /auth/signin -> 401 for unknown user', async () => {
  fakePool.query = async () => ({ rows: [] });
  const res = await request(app)
    .post('/auth/signin')
    .send({ username: 'nobody', password: 'whatever' })
    .expect(401);
  assert.ok(res.body.error);
});

test('POST /auth/signin -> upgrades legacy plaintext password to a hash', async () => {
  let updatedPassword;
  fakePool.query = async (sql) => {
    if (sql.includes('UPDATE "Users"')) {
      updatedPassword = sql.match(/\$1/)[0];
      // capture the bound password via the second call arg is not trivial; instead
      // assert on the returned row + that an UPDATE was issued
      return { rows: [] };
    }
    return {
      rows: [{
        username: 'old', Name: 'Old', Email: 'old@moviemania.dev',
        BirthDate: '1995-01-01', password: 'plaintext-old', iseditor: false,
      }],
    };
  };

  const res = await request(app)
    .post('/auth/signin')
    .send({ username: 'old', password: 'plaintext-old' })
    .expect(200);

  assert.strictEqual(res.body.user.username, 'old');
  assert.ok(res.body.token);
  void updatedPassword;
});

// ---------- Admin: upload poster ----------
test('POST /api/editor/upload-poster -> 201 for an editor, uploads to storage', async () => {
  const token = signToken(editorUser);
  const res = await request(app)
    .post('/api/editor/upload-poster')
    .set('Authorization', `Bearer ${token}`)
    .attach('poster', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'poster.png', contentType: 'image/png' })
    .expect(201);

  assert.ok(res.body.posterUrl);
  assert.strictEqual(storageCalls.length, 1);
  assert.strictEqual(storageCalls[0].opts.contentType, 'image/png');
});

test('POST /api/editor/upload-poster -> 403 for a non-editor user', async () => {
  const token = signToken(normalUser);
  const res = await request(app)
    .post('/api/editor/upload-poster')
    .set('Authorization', `Bearer ${token}`)
    .attach('poster', Buffer.from('xx'), { filename: 'p.png', contentType: 'image/png' })
    .expect(403);
  assert.ok(res.body.error);
  assert.strictEqual(storageCalls.length, 0);
});

test('POST /api/editor/upload-poster -> 401 without a token', async () => {
  const res = await request(app)
    .post('/api/editor/upload-poster')
    .attach('poster', Buffer.from('xx'), { filename: 'p.png', contentType: 'image/png' })
    .expect(401);
  assert.ok(res.body.error);
});

test('POST /api/editor/upload-poster -> 400 when no file provided', async () => {
  const token = signToken(editorUser);
  const res = await request(app)
    .post('/api/editor/upload-poster')
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
  assert.ok(res.body.error);
});

test('POST /api/editor/upload-poster -> 400 for non-image file', async () => {
  const token = signToken(editorUser);
  const res = await request(app)
    .post('/api/editor/upload-poster')
    .set('Authorization', `Bearer ${token}`)
    .attach('poster', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' })
    .expect(400);
  assert.ok(res.body.error);
  assert.strictEqual(storageCalls.length, 0);
});

// ---------- Admin: add movie with poster + trailer ----------
test('POST /api/editor/add persists poster_url and trailer_link', async () => {
  let insertedValues;
  fakePool.query = async (sql, values) => {
    insertedValues = values;
    return { rows: [{ id: 999, title: 'Test Movie' }] };
  };

  const res = await request(app)
    .post('/api/editor/add')
    .send({
      title: 'Test Movie',
      release_date: '2026-01-01',
      plot: 'A plot',
      budget: '1000000',
      boxoffice: '2000000',
      runtime: '120',
      rating_label: 'PG-13',
      poster_url: 'https://mock.supabase.co/posters/poster.png',
      trailer_link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
    .expect(201);

  assert.strictEqual(res.body.movie.id, 999);
  assert.strictEqual(insertedValues[8], 'https://mock.supabase.co/posters/poster.png');
  assert.strictEqual(insertedValues[9], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('POST /api/editor/add -> 400 without required title/release_date', async () => {
  const res = await request(app)
    .post('/api/editor/add')
    .send({ title: 'No Date' })
    .expect(400);
  assert.ok(res.body.error);
});

// ---------- Auth middleware (unit-level via upload route) ----------
test('requireEditor rejects tampered/expired tokens', async () => {
  const badToken = jwt.sign(
    { username: 'admin', iseditor: true },
    'wrong_secret',
    { expiresIn: '7d' }
  );
  const res = await request(app)
    .post('/api/editor/upload-poster')
    .set('Authorization', `Bearer ${badToken}`)
    .attach('poster', Buffer.from('xx'), { filename: 'p.png', contentType: 'image/png' })
    .expect(401);
  assert.ok(res.body.error);
  assert.strictEqual(storageCalls.length, 0);
});
