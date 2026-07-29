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

console.log('\n📋 Checking what user/profile tables exist:\n');

// Query information_schema to find all tables
const { data: tables, error } = await supabase.rpc('get_public_tables');
if (error) {
  console.log('⚠️  RPC not available, trying direct queries...\n');
  
  const tablesToCheck = [
    'club_members', 'members', 'users', 'player_profiles', 'profiles',
    'accounts', 'people', 'staff', 'administrators', 'owners'
  ];
  
  for (const table of tablesToCheck) {
    const { data: testData, error: testError } = await supabase.from(table).select('*').limit(1);
    if (!testError) {
      console.log(`✅ ${table} EXISTS`);
      if (testData && testData.length > 0) {
        console.log('   Columns:', Object.keys(testData[0]));
      }
    }
  }
} else {
  console.log('Tables:', tables);
}

// Also check for club_members since the error mentioned it
console.log('\n📋 Checking club_members table specifically:\n');
const { data: members, error: membersError } = await supabase.from('club_members').select('*').limit(2);
if (membersError) {
  console.log('❌', membersError.message);
} else {
  console.log('✅ club_members found:');
  if (members && members.length > 0) {
    console.log(JSON.stringify(members[0], null, 2));
  }
}
