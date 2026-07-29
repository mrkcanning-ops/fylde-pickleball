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

console.log('\n📋 Checking Division Schema:\n');

// Get full division data
const { data: divisions, error } = await supabase.from('divisions').select('*');
if (error) {
  console.log('❌ Error:', error.message);
} else {
  console.log('✅ Found', divisions?.length, 'divisions\n');
  if (divisions && divisions.length > 0) {
    console.log('Sample division record:');
    console.log(JSON.stringify(divisions[0], null, 2));
  }
}

// Check running_seasons for owner info
console.log('\n\n📋 Checking Running Seasons Schema:\n');
const { data: seasons, error: seasonsError } = await supabase.from('running_seasons').select('*');
if (seasonsError) {
  console.log('❌ Error:', seasonsError.message);
} else {
  console.log('✅ Found', seasons?.length, 'running seasons\n');
  if (seasons && seasons.length > 0) {
    console.log('Sample season record:');
    console.log(JSON.stringify(seasons[0], null, 2));
  }
}
