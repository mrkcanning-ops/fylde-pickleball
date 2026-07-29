import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local manually
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

async function createRunningSeasons() {
  console.log('\n🔄 Creating running_seasons entries for all divisions...\n');

  try {
    // Get all unique divisions from players table
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('division');
    
    if (playersError) {
      console.error('Error fetching players:', playersError);
      return;
    }

    const uniqueDivisions = [...new Set(players.map(p => p.division))].sort((a, b) => a - b);
    console.log('✓ Found divisions:', uniqueDivisions);

    // Check which divisions already have running_seasons entries
    const { data: existing } = await supabase
      .from('running_seasons')
      .select('division');
    
    const existingDivisions = new Set(existing?.map(e => e.division) || []);
    console.log('✓ Existing running_seasons:', [...existingDivisions].sort());

    // Create entries for missing divisions
    const divisionsToCreate = uniqueDivisions.filter(d => !existingDivisions.has(d));
    console.log('📝 Creating entries for:', divisionsToCreate);

    for (const division of divisionsToCreate) {
      const id = `running_season_${division}_${Date.now()}`;
      const entry = {
        id,
        name: `Division ${division} - Active Season`,
        division,
        started_at: new Date().toISOString(),
        division_uid: null,
        owner_id: 'bea4a801-b4e2-4e9e-abe9-0932a93ab09b' // Use existing system owner
      };

      const { error: insertError } = await supabase
        .from('running_seasons')
        .insert([entry]);

      if (insertError) {
        console.log(`  ❌ Division ${division}: ${insertError.message}`);
      } else {
        console.log(`  ✅ Division ${division}: Created`);
      }
    }

    console.log('\n✅ Done!\n');

  } catch (err) {
    console.error('\n❌ Unexpected error:', err);
  }
}

createRunningSeasons();
