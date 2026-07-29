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

const tableNames = [
  'season_summaries_5champ', 'season_summaries_roundrobin', 'season_summaries_points', 
  'running_seasons_5champ', 'running_seasons_roundrobin', 'running_seasons_points',
  'divisions_5champ', 'divisions_roundrobin', 'divisions_points'
];

console.log('\n📋 Checking for format-specific tables...\n');

for (const tableName of tableNames) {
  const { error } = await supabase.from(tableName).select('count()', { count: 'exact', head: true });
  const status = error ? '❌ NOT FOUND' : '✅ EXISTS';
  console.log(status, '-', tableName);
}

// Also check what divisions exist and if there's a format field
console.log('\n📋 Checking divisions with running_seasons relationships...\n');
const { data: runningSeasons } = await supabase.from('running_seasons').select('*');
console.log('Running Seasons:', runningSeasons.length, 'records');
runningSeasons.forEach(rs => {
  console.log(`  - Division ${rs.division}: "${rs.name}"`);
});
