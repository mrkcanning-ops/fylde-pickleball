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

// Check if divisions table exists
const { data: divs } = await supabase.from('divisions').select('*').limit(5);
if (divs && divs.length > 0) {
  console.log('\n📋 DIVISIONS TABLE:');
  console.log('Columns:', Object.keys(divs[0]));
  console.log('Sample:', JSON.stringify(divs[0], null, 2));
} else {
  console.log('\n📋 DIVISIONS TABLE: Not found or empty');
}

// Check divisions_doubles if it exists
const { data: divDoubles } = await supabase.from('divisions_doubles').select('*').limit(5);
if (divDoubles && divDoubles.length > 0) {
  console.log('\n📋 DIVISIONS_DOUBLES TABLE:');
  console.log('Columns:', Object.keys(divDoubles[0]));
  console.log('Sample:', JSON.stringify(divDoubles[0], null, 2));
} else {
  console.log('\n📋 DIVISIONS_DOUBLES TABLE: Not found or empty');
}

// Check running_seasons_doubles with full data
const { data: doubleSeasons } = await supabase.from('running_seasons_doubles').select('*');
console.log('\n📋 RUNNING_SEASONS_DOUBLES:');
doubleSeasons.forEach(s => {
  console.log(`  ID: ${s.id}`);
  console.log(`  Division: ${s.division}`);
  console.log(`  Name: ${s.name}`);
  console.log(`  Created: ${s.created_at}`);
  console.log(`  Started: ${s.started_at}`);
  console.log('---');
});
