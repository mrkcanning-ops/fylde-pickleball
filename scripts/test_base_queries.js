import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && key.trim()) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('\n📋 Testing Base Table Queries:\n');

// Test fetching from base tables like the API would
try {
  const { data: summaries, error: summariesError } = await supabase.from('season_summaries').select('*');
  console.log('season_summaries:', summariesError ? `ERROR: ${summariesError.message}` : `✅ ${summaries?.length || 0} records`);
} catch (e) {
  console.log('season_summaries: CATCH ERROR:', e.message);
}

try {
  const { data: running, error: runningError } = await supabase.from('running_seasons').select('*');
  console.log('running_seasons:', runningError ? `ERROR: ${runningError.message}` : `✅ ${running?.length || 0} records`);
  if (running && running.length > 0) {
    console.log('  Sample:', JSON.stringify(running[0], null, 2).split('\n').slice(0, 10).join('\n'));
  }
} catch (e) {
  console.log('running_seasons: CATCH ERROR:', e.message);
}

try {
  const { data: divisions, error: divisionsError } = await supabase.from('divisions').select('*');
  console.log('divisions:', divisionsError ? `ERROR: ${divisionsError.message}` : `✅ ${divisions?.length || 0} records`);
} catch (e) {
  console.log('divisions: CATCH ERROR:', e.message);
}

try {
  const { data: players, error: playersError } = await supabase.from('players').select('*');
  console.log('players:', playersError ? `ERROR: ${playersError.message}` : `✅ ${players?.length || 0} records`);
} catch (e) {
  console.log('players: CATCH ERROR:', e.message);
}

try {
  const { data: matches, error: matchesError } = await supabase.from('previous_matches').select('*');
  console.log('previous_matches:', matchesError ? `ERROR: ${matchesError.message}` : `✅ ${matches?.length || 0} records`);
} catch (e) {
  console.log('previous_matches: CATCH ERROR:', e.message);
}
