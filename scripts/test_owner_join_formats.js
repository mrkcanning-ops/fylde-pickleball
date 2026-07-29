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

console.log('\n📋 Testing owner join for all formats:\n');

const formats = [
  { suffix: '', desc: 'League (base)' },
  { suffix: '_doubles', desc: 'Points Difference' },
  { suffix: '_5champ', desc: '5 Player' },
  { suffix: '_roundrobin', desc: 'Round Robin' },
];

for (const fmt of formats) {
  console.log(`\n${fmt.desc}:`);
  
  const divisionsTable = fmt.suffix ? `divisions${fmt.suffix}` : 'divisions';
  
  try {
    const { data, error } = await supabase
      .from(divisionsTable)
      .select(`
        id,
        name,
        owner_id,
        club_members!divisions${fmt.suffix}_owner_id_fkey (
          username
        )
      `)
      .limit(1);
    
    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
      // Try without the foreign key name specified
      console.log('  Trying generic join...');
      const { data: data2, error: error2 } = await supabase
        .from(divisionsTable)
        .select(`
          id,
          name,
          owner_id
        `)
        .limit(1);
      if (!error2) {
        console.log(`  ✅ Can fetch divisions, owner_id available`);
      }
    } else {
      console.log(`  ✅ Join works!`);
      if (data && data.length > 0 && data[0].club_members) {
        console.log(`     Owner: ${data[0].club_members.username}`);
      }
    }
  } catch (e) {
    console.log(`  ❌ Exception: ${e.message}`);
  }
}
