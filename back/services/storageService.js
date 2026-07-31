require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const POSTERS_BUCKET = 'posters';

let supabase = null;

function getClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

// Test / dependency-injection hook
function setClient(client) {
  supabase = client;
}

async function ensurePostersBucket(client) {
  const { data: buckets, error: listErr } = await client.storage.listBuckets();
  if (listErr) throw listErr;
  const exists = buckets && buckets.some((b) => b.name === POSTERS_BUCKET);
  if (!exists) {
    const { error } = await client.storage.createBucket(POSTERS_BUCKET, { public: true });
    if (error) throw error;
  }
}

async function uploadPoster(buffer, { filename, contentType, upsert = false } = {}) {
  const client = getClient();
  if (!client) {
    throw new Error('Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)');
  }
  await ensurePostersBucket(client);

  const path = `posters/${Date.now()}-${filename || 'poster'}`;
  const { error } = await client.storage
    .from(POSTERS_BUCKET)
    .upload(path, buffer, { contentType, upsert });

  if (error) throw error;

  const { data } = client.storage.from(POSTERS_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

module.exports = { uploadPoster, getClient, setClient, POSTERS_BUCKET };
