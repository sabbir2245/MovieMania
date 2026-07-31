// ============================================================================
// MovieMania Chatbot Service
// ----------------------------------------------------------------------------
// Rule-based "brain" inspired by the PolyAgent pattern in aihelp/:
//   classify intent  ->  route to a specialist  ->  build a friendly reply.
// Every specialist answers from the Movies table (via the shared pg pool).
//
// NOTE: This is intentionally DB-first and needs NO external LLM or API key.
// We fetch the working movie set once per message, then match/filter in JS,
// which keeps it fast, offline-testable and easy to reason about.
// ============================================================================

const { pool } = require('../pool');

// Small logger so we can see exactly what the chatbot is doing in the console.
function debug(...args) {
  console.log('[DEBUG chatbot]', ...args);
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

// Words too common to help identify a specific movie title.
const STOPWORDS = new Set(['the', 'and', 'a', 'an', 'of', 'for', 'in', 'on', 'with', 'vs', 'at', 'to', 'is']);

// Lowercase, strip punctuation, collapse whitespace.
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// The "significant" words of a movie title — the ones that are actually useful
// for matching (non-stopwords, meaningful length).
function titleSignificantWords(title) {
  return normalize(title)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Remove every significant word of a matched movie from the query text, so a
// follow-up findMovie() call can discover a SECOND distinct title.
// e.g. "godfather or shawshank which has higher rating" + Shawshank
//      -> "  or       which has higher rating" (then Godfather is found).
function removeMovieFromQuery(query, movie) {
  let q = query || '';
  for (const w of titleSignificantWords(movie ? movie.title : '')) {
    q = q.replace(new RegExp(w, 'gi'), ' ');
  }
  return q;
}

// Longest-matching movie title found inside the query text.
// e.g. "what is the rating of top gun maverick" -> matches "Top Gun: Maverick".
//
// Matching strategy (priority order):
//   1. Full normalized title appears as a substring of the query (exact).
//   2. Fuzzy scoring: count how many "significant" words of each title appear
//      in the query, pick the movie with the most hits (then longest title).
//      Stopwords are ignored, so "shawshank" alone still matches
//      "The Shawshank Redemption".
function findMovie(query, movies) {
  debug('findMovie: looking for a title inside query:', `"${query}"`);
  const q = normalize(query);
  const qWords = new Set(q.split(' ').filter(Boolean));

  let exactBest = null;
  let exactLen = 0;
  let fuzzyBest = null;
  let fuzzyScore = 0;
  let fuzzyTitleLen = 0;

  for (const m of movies) {
    const title = normalize(m.title);
    if (!title) continue;

    // Priority 1: whole title appears as a substring of the query.
    if (q.includes(title) && title.length > exactLen) {
      exactBest = m;
      exactLen = title.length;
    }

    // Priority 2: fuzzy scoring — count whole-word hits of each significant
    // title word against the query's word set (never substring matches).
    const words = titleSignificantWords(m.title);
    if (words.length > 0) {
      let score = 0;
      for (const w of words) {
        if (qWords.has(w)) score++;
      }
      if (score > 0 && (score > fuzzyScore || (score === fuzzyScore && title.length > fuzzyTitleLen))) {
        fuzzyBest = m;
        fuzzyScore = score;
        fuzzyTitleLen = title.length;
      }
    }
  }

  const best = exactBest || fuzzyBest;
  debug('findMovie result:', best ? `"${best.title}"` : 'NO MATCH', exactBest ? '(exact)' : fuzzyBest ? `(fuzzy, score ${fuzzyScore})` : '');
  return best;
}

// ---------------------------------------------------------------------------
// Intent classifier (keyword/regex based, ordered by specificity)
// ---------------------------------------------------------------------------

function classifyIntent(message, movies) {
  const low = message.toLowerCase();

  debug('classifyIntent: analyzing message:', `"${message}"`);

  // --- "better / higher rating than X" (most specific, checked first) --------
  const isBetterRating =
    /(better|higher|greater|more).{0,8}(rating|rated|score)|rated (better|higher|greater|above)|rating (higher|greater|above)|(better|higher|greater).{0,14}than/.test(low);

  // --- Compare / "which is better" -------------------------------------------
  const isCompare =
    /compare|\bvs\b|versus|which (is )?(better|higher|worse)|better (than|movie)|which one/.test(low);

  // --- Head-to-head: TWO distinct movies + a comparison question -------------
  // e.g. "godfather or shawshank which has higher rating" must be treated as a
  // compare of the two titles, NOT as "list movies better rated than Shawshank".
  // We remove the first matched title's words from the query to find a second.
  const firstMovie = findMovie(message, movies);
  const secondMovie = firstMovie
    ? findMovie(removeMovieFromQuery(message, firstMovie), movies)
    : null;
  const hasTwoMovies = !!(firstMovie && secondMovie && firstMovie.id !== secondMovie.id);
  const isCompareQuestion =
    /which.{0,12}(higher|better|lower|worse|greater|rating|rated)|\b(or|and)\b.{0,20}(higher|better|lower|worse|greater) rating|(higher|better|greater|lower|worse).{0,12}rating/.test(low);

  const intentRules = [
    ['top_movies', /top rated|best movies|best film|highest rated|top 10|greatest movie/i],
    ['highest_grossing', /highest grossing|top grossing|biggest hit|most successful/i],
    ['release_date', /when (was|did|is)|release|released|come out|release date/i],
    ['budget', /budget|how much did it cost|production cost|made for/i],
    ['boxoffice', /box ?office|gross|earned?|how much (did it )?make/i],
    ['runtime', /runtime|how long|duration|how many minutes|length/i],
    ['votes', /\bvot(es|e|ed)\b|how many people (rated|voted)/i],
    ['review_count', /how many (people|users|reviews)|number of reviews|review count|how many (have |has )?reviewed/i],
    ['plot', /\babout\b|plot|story|what is it (about|based)|synopsis/i],
    ['genres', /genre|what type|category|what kind/i],
    ['rating', /rating|rated|score|stars?\b|\bhow good/i],
    ['help', /^(hi|hello|hey|help|what can you do|how do you work|thanks)\b/i],
  ];

  let intent = null;
  let matchedRule = null;

  // "which has higher rating" between two named movies wins over everything.
  if (hasTwoMovies && isCompareQuestion) {
    intent = 'compare';
    matchedRule = 'two movies + comparison question';
  } else if (isBetterRating && /\brating|rated|score/i.test(low)) {
    intent = 'better_rating';
    matchedRule = 'better-rating regex';
  } else if (isCompare) {
    intent = 'compare';
    matchedRule = 'compare regex';
  } else {
    for (const [name, re] of intentRules) {
      if (re.test(low)) {
        intent = name;
        matchedRule = String(re);
        break;
      }
    }
  }

  // Fall back to generic movie info if a title is present but no specific intent.
  if (!intent) {
    if (findMovie(message, movies)) {
      intent = 'movie_info';
      matchedRule = 'title present, default to movie_info';
    } else {
      intent = 'unknown';
      matchedRule = 'no rules matched';
    }
  }

  debug('classifyIntent -> intent:', intent, '| rule:', matchedRule);
  return intent;
}

// ---------------------------------------------------------------------------
// Specialists — each turns (movie, dataset, extras) into a reply string.
// ---------------------------------------------------------------------------

function formatRating(m) {
  return typeof m.rating === 'number' ? m.rating.toFixed(2) : 'N/A';
}

// Consistent "couldn't find it" response when no movie title is recognized.
function notFoundReply() {
  return {
    reply:
      "I couldn't find that movie. Try the full title, e.g. \"The Shawshank Redemption\", or ask \"What are the top rated movies?\" to see what's available.",
    data: null,
  };
}

function specialistRating(movie) {
  debug('specialist.rating for', movie && movie.title);
  if (!movie) return notFoundReply();
  const r = formatRating(movie);
  return {
    reply: `🎬 ${movie.title} has a rating of ${r}/10 ${typeof movie.rating === 'number' ? `(based on ${movie.votes || 0} votes)` : ''}.`,
    data: { title: movie.title, rating: movie.rating, votes: movie.votes },
  };
}

function specialistBetterRating(movie, movies) {
  debug('specialist.betterRating for', movie && movie.title);
  if (!movie) return { reply: "I couldn't find that movie. Which movie do you want to compare against?", data: null };
  const base = typeof movie.rating === 'number' ? movie.rating : -Infinity;
  const better = movies
    .filter((m) => typeof m.rating === 'number' && m.rating > base && m.id !== movie.id)
    .sort((a, b) => b.rating - a.rating || (b.votes || 0) - (a.votes || 0))
    .slice(0, 5);

  if (better.length === 0) {
    return {
      reply: `No movies in the database have a higher rating than ${movie.title} (${formatRating(movie)}/10). It's the top of the pile! 🏆`,
      data: { title: movie.title, rating: movie.rating, higherRated: [] },
    };
  }

  const list = better.map((m, i) => `${i + 1}. ${m.title} — ${formatRating(m)}/10`).join('\n');
  return {
    reply: `Movies with a better rating than ${movie.title} (${formatRating(movie)}/10):\n${list}`,
    data: { title: movie.title, rating: movie.rating, higherRated: better.map((m) => ({ title: m.title, rating: m.rating })) },
  };
}

function specialistReleaseDate(movie) {
  debug('specialist.releaseDate for', movie && movie.title);
  if (!movie) return notFoundReply();
  const d = movie.release_date ? new Date(movie.release_date).toISOString().slice(0, 10) : null;
  const reply = d
    ? `📅 ${movie.title} was released on ${d}${movie.year ? ` (${movie.year})` : ''}.`
    : `I don't have a release date for ${movie.title} yet.`;
  return { reply, data: { title: movie.title, release_date: d, year: movie.year } };
}

function specialistBudget(movie) {
  debug('specialist.budget for', movie && movie.title);
  if (!movie) return notFoundReply();
  const reply = movie.budget
    ? `💰 ${movie.title} had a budget of $${Number(movie.budget).toLocaleString()}.`
    : `I don't have budget info for ${movie.title}.`;
  return { reply, data: { title: movie.title, budget: movie.budget } };
}

function specialistBoxOffice(movie) {
  debug('specialist.boxOffice for', movie && movie.title);
  if (!movie) return notFoundReply();
  const reply = movie.boxoffice
    ? `🎟️ ${movie.title} grossed $${Number(movie.boxoffice).toLocaleString()} at the box office.`
    : `I don't have box office data for ${movie.title}.`;
  return { reply, data: { title: movie.title, boxoffice: movie.boxoffice } };
}

function specialistRuntime(movie) {
  debug('specialist.runtime for', movie && movie.title);
  if (!movie) return notFoundReply();
  const reply = movie.runtime ? `⏱️ ${movie.title} runs for ${movie.runtime} minutes.` : `I don't have runtime info for ${movie.title}.`;
  return { reply, data: { title: movie.title, runtime: movie.runtime } };
}

function specialistVotes(movie) {
  debug('specialist.votes for', movie && movie.title);
  if (!movie) return notFoundReply();
  return {
    reply: `🗳️ ${movie.title} has ${movie.votes || 0} votes.`,
    data: { title: movie.title, votes: movie.votes },
  };
}

async function specialistReviewCount(movie) {
  debug('specialist.reviewCount for', movie && movie.title);
  if (!movie) return notFoundReply();
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM public."Reviews" WHERE movie_id = $1',
    [movie.id]
  );
  const count = rows[0] ? rows[0].count : 0;
  debug('specialist.reviewCount ->', count);
  return {
    reply: `🗳️ ${movie.title} has been reviewed by ${count} ${count === 1 ? 'person' : 'people'} so far.`,
    data: { title: movie.title, reviewCount: count },
  };
}

// Session memory: walk the conversation history (newest first) and return the
// last movie title we talked about, so follow-ups like "what about its budget?"
// or "and which movies are better?" still know what "it" refers to.
function findLastMovieInHistory(history, movies) {
  debug('findLastMovieInHistory: scanning history for last mentioned movie');
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const content = history[i] && history[i].content;
    if (!content) continue;
    const m = findMovie(content, movies);
    if (m) {
      debug('findLastMovieInHistory -> last movie is:', m.title, 'from history index', i);
      return m;
    }
  }
  debug('findLastMovieInHistory -> no movie found in history');
  return null;
}

// Does the current message refer back to a previously-mentioned movie?
function isPronounReference(message) {
  return /\b(it|its|it's|this movie|that movie|this one|that one|them|those)\b/i.test(message || '');
}

function specialistPlot(movie) {
  debug('specialist.plot for', movie && movie.title);
  if (!movie) return notFoundReply();
  const reply = movie.plot ? `📖 ${movie.title}: ${movie.plot}` : `I don't have a plot summary for ${movie.title}.`;
  return { reply, data: { title: movie.title, plot: movie.plot } };
}

function specialistGenres(movie) {
  debug('specialist.genres for', movie && movie.title);
  if (!movie) return notFoundReply();
  return { reply: `🎭 ${movie.title} (${movie.year}) is a ${movie.rating_label || 'Not Rated'} film.`, data: { title: movie.title, rating_label: movie.rating_label } };
}

function specialistTopMovies(movies) {
  debug('specialist.topMovies');
  const top = movies
    .filter((m) => typeof m.rating === 'number' && m.rating > 0)
    .sort((a, b) => b.rating - a.rating || (b.votes || 0) - (a.votes || 0))
    .slice(0, 5);
  const list = top.map((m, i) => `${i + 1}. ${m.title} — ${formatRating(m)}/10`).join('\n');
  return {
    reply: top.length ? `🏆 Top rated movies:\n${list}` : "I don't have any rated movies yet.",
    data: { top: top.map((m) => ({ title: m.title, rating: m.rating })) },
  };
}

function specialistHighestGrossing(movies) {
  debug('specialist.highestGrossing');
  const top = movies
    .filter((m) => m.boxoffice && Number(m.boxoffice) > 0)
    .sort((a, b) => Number(b.boxoffice) - Number(a.boxoffice))
    .slice(0, 5);
  const list = top.map((m, i) => `${i + 1}. ${m.title} — $${Number(m.boxoffice).toLocaleString()}`).join('\n');
  return {
    reply: top.length ? `💰 Highest grossing movies:\n${list}` : "I don't have box office data yet.",
    data: { top: top.map((m) => ({ title: m.title, boxoffice: Number(m.boxoffice) })) },
  };
}

function specialistCompare(movieA, movieB) {
  debug('specialist.compare between', movieA && movieA.title, 'and', movieB && movieB.title);
  if (!movieA || !movieB) {
    return {
      reply: "I need TWO movies to compare. Try: 'compare Gladiator and Top Gun: Maverick'.",
      data: null,
    };
  }
  const lines = [
    `⚖️ ${movieA.title} vs ${movieB.title}:`,
    `  • Rating: ${movieA.title} ${formatRating(movieA)}/10 | ${movieB.title} ${formatRating(movieB)}/10`,
    `  • Runtime: ${movieA.runtime || '?'} min | ${movieB.runtime || '?'} min`,
    `  • Budget: ${movieA.budget ? '$' + Number(movieA.budget).toLocaleString() : '?'} | ${movieB.budget ? '$' + Number(movieB.budget).toLocaleString() : '?'}`,
    `  • Box office: ${movieA.boxoffice ? '$' + Number(movieA.boxoffice).toLocaleString() : '?'} | ${movieB.boxoffice ? '$' + Number(movieB.boxoffice).toLocaleString() : '?'}`,
  ];

  // Verdict on the rating (only when both movies actually have one).
  const ra = typeof movieA.rating === 'number' ? movieA.rating : null;
  const rb = typeof movieB.rating === 'number' ? movieB.rating : null;
  if (ra !== null && rb !== null) {
    if (ra > rb) lines.push(`🏆 Higher rated: ${movieA.title} (${formatRating(movieA)}/10)`);
    else if (rb > ra) lines.push(`🏆 Higher rated: ${movieB.title} (${formatRating(movieB)}/10)`);
    else lines.push(`🤝 It's a tie — both are rated ${formatRating(movieA)}/10`);
  }

  return {
    reply: lines.join('\n'),
    data: { a: { title: movieA.title, rating: movieA.rating }, b: { title: movieB.title, rating: movieB.rating } },
  };
}

function specialistHelp() {
  debug('specialist.help');
  return {
    reply:
      '🤖 Hi! I can answer questions about the movies on MovieMania. Try asking:\n' +
      '  • "What is the rating of Gladiator?"\n' +
      '  • "Which movies have a better rating than Top Gun: Maverick?"\n' +
      '  • "When was Gladiator released?"\n' +
      '  • "Compare Gladiator and Top Gun: Maverick"\n' +
      '  • "What are the top rated movies?"',
    data: null,
  };
}

function specialistUnknown() {
  debug('specialist.unknown');
  return {
    reply:
      "Hmm, I'm not sure how to answer that yet. 🤔 Try asking about a movie's rating, release date, budget, or runtime. Or ask which movies are better rated.",
    data: null,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator — the main entry point used by the route.
// ---------------------------------------------------------------------------

async function fetchMovies() {
  debug('fetching movie dataset from DB...');
  const { rows } = await pool.query('SELECT * FROM public."Movies"');
  debug('fetched', rows.length, 'movies');
  return rows;
}

async function answerMessage(message, history = []) {
  debug('=== answerMessage ===');
  debug('incoming message:', message);
  debug('history length:', Array.isArray(history) ? history.length : 'none');

  if (!message || !String(message).trim()) {
    debug('empty message -> returning help');
    return { reply: specialistHelp().reply, intent: 'help', data: null };
  }

  const movies = await fetchMovies();

  const intent = classifyIntent(message, movies);

  // Entities — resolve the target movie, falling back to session memory when
  // the user refers back to a previously-mentioned title ("its budget", etc.).
  let movie = findMovie(message, movies);
  if (!movie && isPronounReference(message)) {
    const remembered = findLastMovieInHistory(history, movies);
    if (remembered) {
      debug('using remembered movie from session:', remembered.title);
      movie = remembered;
    }
  }

  let movieB = null;
  if (intent === 'compare') {
    // Try to find a SECOND distinct title for compare questions. We strip the
    // first matched movie's words from the query so "X or Y ..." resolves Y.
    const remainder = removeMovieFromQuery(message, movie);
    movieB = findMovie(remainder, movies);
    if (movieB && movie && movieB.id === movie.id) movieB = null;
    debug('compare second title:', movieB && movieB.title);
  }

  const specialists = {
    rating: () => specialistRating(movie),
    better_rating: () => specialistBetterRating(movie, movies),
    release_date: () => specialistReleaseDate(movie),
    budget: () => specialistBudget(movie),
    boxoffice: () => specialistBoxOffice(movie),
    runtime: () => specialistRuntime(movie),
    votes: () => specialistVotes(movie),
    review_count: () => specialistReviewCount(movie),
    plot: () => specialistPlot(movie),
    genres: () => specialistGenres(movie),
    movie_info: () => specialistRating(movie),
    top_movies: () => specialistTopMovies(movies),
    highest_grossing: () => specialistHighestGrossing(movies),
    compare: () => specialistCompare(movie, movieB),
    help: specialistHelp,
    unknown: specialistUnknown,
  };

  const handler = specialists[intent] || specialistUnknown;
  debug('dispatching to specialist:', intent);
  const result = await handler();

  debug('reply preview:', String(result.reply).slice(0, 80) + '...');
  debug('=== answerMessage done ===');
  return { reply: result.reply, intent, data: result.data };
}

module.exports = {
  normalize,
  findMovie,
  removeMovieFromQuery,
  classifyIntent,
  answerMessage,
  fetchMovies,
  findLastMovieInHistory,
  isPronounReference,
  specialistHelp,
  specialistUnknown,
};
