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

// Check running_seasons
const { data: running } = await supabase.from('running_seasons').select('*');
console.log('\n📋 RUNNING_SEASONS (Singles):');
if (running && running.length > 0) {
  running.forEach(r => console.log('  Division', r.division, '-', r.name));
} else {
  console.log('  (none)');
}

// Check running_seasons_doubles
const { data: doubleRun } = await supabase.from('running_seasons_doubles').select('*');
console.log('\n📋 RUNNING_SEASONS_DOUBLES:');
if (doubleRun && doubleRun.length > 0) {
  doubleRun.forEach(r => console.log('  Division', r.division, '-', r.name));
} else {
  console.log('  (none)');
}

// For each running division, check if it has players and matches
console.log('\n📊 DATA CHECK:');
for (const season of running || []) {
  const { data: players } = await supabase.from('players').select('id').eq('division', season.division);
  const { data: matches } = await supabase.from('previous_matches').select('id').eq('division', season.division);
  console.log('  Division', season.division, '→', players?.length || 0, 'players,', matches?.length || 0, 'matches');
}
