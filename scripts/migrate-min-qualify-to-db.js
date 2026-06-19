const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Usage: place a JSON file at scripts/min_qualify_map.json with content like:
// { "1": 10, "2": 8 }
// then run: node scripts/migrate-min-qualify-to-db.js

const mapPath = path.join(__dirname, 'min_qualify_map.json');
if (!fs.existsSync(mapPath)) {
  console.error('Missing scripts/min_qualify_map.json. Create it with mapping: { "1": 10, "2": 8 }');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    const unquoted = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!process.env[key]) process.env[key] = unquoted;
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  const raw = fs.readFileSync(mapPath, 'utf8');
  const map = JSON.parse(raw);
  for (const [divId, val] of Object.entries(map)) {
    const id = Number(divId);
    const v = Number(val) || 0;
    try {
      const { data, error } = await supabase.from('divisions').update({ min_qualify_games: v }).eq('id', id).select();
      if (error) {
        console.error('Failed to update division', id, error.message || error);
      } else {
        console.log('Updated division', id, '=>', v);
      }
    } catch (e) {
      console.error('Error updating division', id, e);
    }
  }
  console.log('Done.');
})();
