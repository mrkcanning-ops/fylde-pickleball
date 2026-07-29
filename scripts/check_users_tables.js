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

console.log('\n📋 Looking for User/Profile tables:\n');

const tablesToCheck = ['users', 'profiles', 'auth.users', 'public.auth_users', 'player_profiles'];

for (const tableName of tablesToCheck) {
  const { data: testData, error: testError } = await supabase.from(tableName).select('*').limit(1);
  if (testError) {
    console.log(`❌ ${tableName}`);
  } else {
    console.log(`✅ ${tableName} - Found`);
    if (testData && testData.length > 0) {
      console.log('   Sample record:');
      console.log('   ', JSON.stringify(testData[0], null, 2).split('\n').slice(0, 8).join('\n   '));
    }
  }
}

// Try to query auth.users with the owner_id
console.log('\n\n📋 Trying to get owner name from auth.users:\n');
const ownerId = 'bea4a801-b4e2-4e9e-abe9-0932a93ab09b';
const { data: authUser, error: authError } = await supabase.from('auth.users').select('*').eq('id', ownerId);
if (authError) {
  console.log('❌ Error querying auth.users:', authError.message);
} else {
  console.log('✅ Found auth user:');
  console.log(JSON.stringify(authUser, null, 2));
}
