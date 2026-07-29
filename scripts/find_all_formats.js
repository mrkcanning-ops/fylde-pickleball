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

// Check with more variations
const formats = ['points', '5champ', 'roundrobin', 'league'];
const bases = ['season_summaries', 'running_seasons', 'divisions', 'players', 'matches', 'previous_matches'];

console.log('\n📋 ALL FORMAT-SPECIFIC TABLES:\n');

for (const format of formats) {
  for (const base of bases) {
    const tableName = `${base}_${format}`;
    const { error } = await supabase.from(tableName).select('count()', { count: 'exact', head: true });
    if (!error) {
      console.log('✅', tableName);
    }
  }
}

// Also try without underscore for league
const { error: leagueError } = await supabase.from('season_summaries_league').select('count()', { count: 'exact', head: true });
if (!leagueError) {
  console.log('✅ season_summaries_league');
}

// Check divisions_points to see what format names it contains
console.log('\n📋 Checking divisions_points for format info:\n');
const { data: divPoints } = await supabase.from('divisions_points').select('*').limit(5);
divPoints.forEach(d => console.log(`  Division ${d.id}: ${d.name}`));
