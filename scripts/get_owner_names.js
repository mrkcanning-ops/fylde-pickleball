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

console.log('\n📋 Looking up owner names:\n');

// Get all divisions with owner_id
const { data: divisions } = await supabase.from('divisions').select('id, name, owner_id');
console.log('Divisions:');
const ownerIds = new Set();
divisions.forEach(d => {
  console.log(`  - Division ${d.id}: "${d.name}" (owner: ${d.owner_id})`);
  ownerIds.add(d.owner_id);
});

console.log('\n📋 Looking up owner usernames:\n');

// Get all unique owner names
for (const ownerId of ownerIds) {
  const { data: member } = await supabase
    .from('club_members')
    .select('id, username')
    .eq('id', ownerId)
    .single();
  
  if (member) {
    console.log(`  ${ownerId} → "${member.username}"`);
  } else {
    console.log(`  ${ownerId} → ⚠️ NOT FOUND`);
  }
}

console.log('\n📋 Test query with join:\n');
const { data: joined, error } = await supabase
  .from('divisions')
  .select(`
    id,
    name,
    owner_id,
    club_members!divisions_owner_id_fkey (
      username
    )
  `);

if (error) {
  console.log('❌ Join error:', error.message);
} else {
  console.log('✅ Join succeeded:');
  console.log(JSON.stringify(joined, null, 2));
}
