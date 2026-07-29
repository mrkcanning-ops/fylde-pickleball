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

// Check divisions table structure
const { data: divs } = await supabase.from('divisions').select('*').limit(3);
console.log('\n📋 DIVISIONS TABLE:');
if (divs && divs.length > 0) {
  console.log('Columns:', Object.keys(divs[0]));
  console.log('Sample:', JSON.stringify(divs[0], null, 2));
}

// Check running_seasons structure
const { data: running } = await supabase.from('running_seasons').select('*').limit(1);
console.log('\n📋 RUNNING_SEASONS:');
if (running && running.length > 0) {
  console.log('Columns:', Object.keys(running[0]));
}

// Check season_summaries structure  
const { data: summaries } = await supabase.from('season_summaries').select('*').limit(1);
console.log('\n📋 SEASON_SUMMARIES:');
if (summaries && summaries.length > 0) {
  console.log('Columns:', Object.keys(summaries[0]));
}

// Check what tables exist that might have 'format' or 'type'
console.log('\n📋 Querying for format info in season_summaries:');
const { data: testData } = await supabase.from('season_summaries').select('*').limit(5);
if (testData && testData.length > 0) {
  console.log('Full record:', JSON.stringify(testData[0], null, 2));
}
