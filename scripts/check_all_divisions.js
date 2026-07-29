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

async function checkAllDivisions() {
  console.log('\n=== Season Summaries (Archived) ===');
  const summaries = await supabase.from('season_summaries').select('division, timestamp').order('division');
  console.log('Divisions:', summaries.data?.map(d => d.division) || 'Error');
  console.log('Count:', summaries.data?.length || 0);

  console.log('\n=== Running Seasons (Active - Singles) ===');
  const running = await supabase.from('running_seasons').select('division, created_at').order('division');
  console.log('Divisions:', running.data?.map(d => d.division) || 'Error');
  console.log('Count:', running.data?.length || 0);

  console.log('\n=== Running Seasons Doubles (Active - Doubles) ===');
  const runningDoubles = await supabase.from('running_seasons_doubles').select('division, created_at').order('division');
  console.log('Divisions:', runningDoubles.data?.map(d => d.division) || 'Error');
  console.log('Count:', runningDoubles.data?.length || 0);

  console.log('\n=== Season Summaries Doubles (Archived - Doubles) ===');
  const summariesDoubles = await supabase.from('season_summaries_doubles').select('division, timestamp').order('division');
  console.log('Divisions:', summariesDoubles.data?.map(d => d.division) || 'Error');
  console.log('Count:', summariesDoubles.data?.length || 0);

  console.log('\n=== Players (All Divisions) ===');
  const players = await supabase.from('players').select('division').order('division');
  const uniqueDivisions = [...new Set(players.data?.map(p => p.division) || [])].sort((a, b) => a - b);
  console.log('Unique divisions with players:', uniqueDivisions);
  console.log('Total players:', players.data?.length || 0);

  console.log('\n=== Running Seasons Table (Full Query) ===');
  const allRunning = await supabase.from('running_seasons').select('*');
  console.log('Records:', JSON.stringify(allRunning.data, null, 2));
}

checkAllDivisions().catch(console.error);
