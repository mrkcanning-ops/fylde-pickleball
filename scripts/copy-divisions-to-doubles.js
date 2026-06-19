const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local if present (simple parser)
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
    // remove surrounding quotes
    const unquoted = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!process.env[key]) process.env[key] = unquoted;
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment or .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    console.log('Fetching league divisions...');
    const { data: leagueDivs, error: leagueErr } = await supabase.from('divisions').select('id,name');
    if (leagueErr) throw leagueErr;
    if (!Array.isArray(leagueDivs) || leagueDivs.length === 0) {
      console.log('No divisions found in `divisions`. Nothing to copy.');
      return;
    }

    const payload = leagueDivs.map((d) => ({ name: d.name }));
    const doublesTable = 'divisions_doubles';
    console.log(`Inserting ${payload.length} rows into ${doublesTable}...`);
    const { data: inserted, error: insErr } = await supabase.from(doublesTable).insert(payload).select();
    if (insErr) throw insErr;
    console.log('Inserted rows:', inserted.length);
    console.log(inserted);
    console.log('Done.');
  } catch (e) {
    console.error('Copy failed:', e);
    process.exit(1);
  }
})();
