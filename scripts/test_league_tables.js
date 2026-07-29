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

console.log('\n📋 Testing All Format Tables:\n');

const formats = ['league', 'points', '5champ', 'roundrobin', 'doubles'];
for (const format of formats) {
  console.log(`\n🔷 Format: ${format}`);
  const tableSuffixes = ['season_summaries', 'running_seasons', 'divisions', 'players', 'previous_matches'];
  for (const suffix of tableSuffixes) {
    const tableName = `${suffix}_${format}`;
    const { data: testData, error: testError } = await supabase.from(tableName).select('*').limit(1);
    if (testError) {
      process.stdout.write(`  ❌ ${tableName}`);
    } else {
      process.stdout.write(`  ✅ ${tableName} (${testData?.length || 0} records)\n`);
    }
  }
}

