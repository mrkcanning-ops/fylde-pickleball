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

console.log('\n📋 Testing Actual Database Tables:\n');

const tablesToTest = [
  // Base tables (league format)
  { name: 'season_summaries', suffix: '', desc: 'Base (League)' },
  { name: 'running_seasons', suffix: '', desc: 'Base (League)' },
  { name: 'divisions', suffix: '', desc: 'Base (League)' },
  { name: 'players', suffix: '', desc: 'Base (League)' },
  { name: 'previous_matches', suffix: '', desc: 'Base (League)' },
  
  // Doubles (Points Difference)
  { name: 'season_summaries_doubles', suffix: 'doubles', desc: 'Points Difference' },
  { name: 'running_seasons_doubles', suffix: 'doubles', desc: 'Points Difference' },
  { name: 'divisions_doubles', suffix: 'doubles', desc: 'Points Difference' },
  { name: 'players_doubles', suffix: 'doubles', desc: 'Points Difference' },
  { name: 'previous_matches_doubles', suffix: 'doubles', desc: 'Points Difference' },
  
  // 5Champ
  { name: 'season_summaries_5champ', suffix: '5champ', desc: '5 Player' },
  { name: 'running_seasons_5champ', suffix: '5champ', desc: '5 Player' },
  { name: 'divisions_5champ', suffix: '5champ', desc: '5 Player' },
  { name: 'players_5champ', suffix: '5champ', desc: '5 Player' },
  { name: 'previous_matches_5champ', suffix: '5champ', desc: '5 Player' },
  
  // Round Robin
  { name: 'season_summaries_roundrobin', suffix: 'roundrobin', desc: 'Round Robin' },
  { name: 'running_seasons_roundrobin', suffix: 'roundrobin', desc: 'Round Robin' },
  { name: 'divisions_roundrobin', suffix: 'roundrobin', desc: 'Round Robin' },
  { name: 'players_roundrobin', suffix: 'roundrobin', desc: 'Round Robin' },
  { name: 'previous_matches_roundrobin', suffix: 'roundrobin', desc: 'Round Robin' },
];

let lastFormat = '';
for (const table of tablesToTest) {
  if (table.desc !== lastFormat) {
    lastFormat = table.desc;
    console.log(`\n${lastFormat}:`);
  }
  const { data: testData, error: testError } = await supabase.from(table.name).select('*').limit(1);
  if (testError) {
    console.log(`  ❌ ${table.name}`);
  } else {
    console.log(`  ✅ ${table.name} (${testData?.length || 0} records)`);
  }
}
