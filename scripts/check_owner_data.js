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

console.log('\n📋 Checking Users Tables:\n');

// Check profiles
console.log('1️⃣ Profiles table:');
const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').limit(3);
if (profilesError) {
  console.log('   ❌', profilesError.message);
} else {
  console.log('   ✅ Found', profiles?.length, 'records');
  if (profiles && profiles.length > 0) {
    console.log('   Sample:', JSON.stringify(profiles[0], null, 2));
  }
}

// Check users
console.log('\n2️⃣ Users table:');
const { data: users, error: usersError } = await supabase.from('users').select('*').limit(3);
if (usersError) {
  console.log('   ❌', usersError.message);
} else {
  console.log('   ✅ Found', users?.length, 'records');
  if (users && users.length > 0) {
    console.log('   Sample:', JSON.stringify(users[0], null, 2));
  }
}

// Try joining divisions with profiles
console.log('\n3️⃣ Try joining divisions with profiles:');
const { data: joined, error: joinError } = await supabase
  .from('divisions')
  .select(`
    id,
    name,
    owner_id,
    profiles:owner_id (
      id,
      username,
      display_name,
      first_name,
      last_name
    )
  `)
  .limit(1);
  
if (joinError) {
  console.log('   ❌', joinError.message);
} else {
  console.log('   ✅ Join worked:');
  console.log(JSON.stringify(joined, null, 2));
}
