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

async function populateRunningSeasons() {
  console.log('\n🔄 Populating running_seasons for all divisions...\n');

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

    // For each division, calculate standings and create running_seasons entry
    for (const division of uniqueDivisions) {
      console.log(`\n📊 Processing Division ${division}...`);

      // Get all players in this division
      const { data: divisionPlayers, error: dpError } = await supabase
        .from('players')
        .select('*')
        .eq('division', division);

      if (dpError) {
        console.error(`  ❌ Error fetching players for division ${division}:`, dpError);
        continue;
      }

      if (!divisionPlayers || divisionPlayers.length === 0) {
        console.log(`  ⚠️  No players found for division ${division}`);
        continue;
      }

      // Get all previous matches for this division
      const { data: matches, error: matchesError } = await supabase
        .from('previous_matches')
        .select('*')
        .eq('division', division)
        .order('created_at', { ascending: true });

      if (matchesError) {
        console.error(`  ❌ Error fetching matches for division ${division}:`, matchesError);
        continue;
      }

      // Calculate standings
      const standings = {};
      divisionPlayers.forEach(p => {
        standings[p.id] = {
          id: p.id,
          name: p.name,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          points_for: 0,
          points_against: 0,
          win_streak: 0,
          active: p.active
        };
      });

      // Process matches
      let processedMatches = 0;
      (matches || []).forEach(match => {
        if (!match.players || !match.scores) return;

        const playersArray = Array.isArray(match.players) 
          ? match.players 
          : JSON.parse(match.players);

        if (!Array.isArray(playersArray) || playersArray.length < 4) return;

        const score1 = Number(
          match.scores?.team1 ?? 
          (Array.isArray(match.scores) ? match.scores[0] : null)
        );
        const score2 = Number(
          match.scores?.team2 ?? 
          (Array.isArray(match.scores) ? match.scores[1] : null)
        );

        if (Number.isNaN(score1) || Number.isNaN(score2)) return;

        const team1 = playersArray.slice(0, 2);
        const team2 = playersArray.slice(2, 4);

        // Update standings
        let result1 = 'draw';
        let result2 = 'draw';
        if (score1 > score2) {
          result1 = 'win';
          result2 = 'loss';
        } else if (score1 < score2) {
          result1 = 'loss';
          result2 = 'win';
        }

        team1.forEach(playerId => {
          if (standings[playerId]) {
            if (result1 === 'win') {
              standings[playerId].wins++;
              standings[playerId].points += 3;
              standings[playerId].win_streak++;
            } else if (result1 === 'loss') {
              standings[playerId].losses++;
              standings[playerId].win_streak = 0;
            } else {
              standings[playerId].draws++;
              standings[playerId].points += 1;
              standings[playerId].win_streak = 0;
            }
            standings[playerId].points_for += score1;
            standings[playerId].points_against += score2;
          }
        });

        team2.forEach(playerId => {
          if (standings[playerId]) {
            if (result2 === 'win') {
              standings[playerId].wins++;
              standings[playerId].points += 3;
              standings[playerId].win_streak++;
            } else if (result2 === 'loss') {
              standings[playerId].losses++;
              standings[playerId].win_streak = 0;
            } else {
              standings[playerId].draws++;
              standings[playerId].points += 1;
              standings[playerId].win_streak = 0;
            }
            standings[playerId].points_for += score2;
            standings[playerId].points_against += score1;
          }
        });

        processedMatches++;
      });

      const finalStandings = Object.values(standings).sort((a, b) => b.points - a.points);

      console.log(`  ✓ Processed ${processedMatches} matches`);
      console.log(`  ✓ Generated standings for ${finalStandings.length} players`);
      console.log(`  📋 Top 3: ${finalStandings.slice(0, 3).map(p => `${p.name} (${p.points}pts)`).join(', ')}`);

      // Create or update running_seasons entry
      const runningSeasonId = `running_season_${division}_${Date.now()}`;
      const runningSeasonEntry = {
        id: runningSeasonId,
        name: `Division ${division} - Active`,
        division: division,
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        final_standings: finalStandings,
        matches: matches || [],
        division_uid: null,
        owner_id: 'system'
      };

      // Check if entry already exists
      const { data: existing } = await supabase
        .from('running_seasons')
        .select('*')
        .eq('division', division)
        .single();

      if (existing) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('running_seasons')
          .update({
            final_standings: finalStandings,
            matches: matches || [],
            timestamp: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.log(`  ⚠️  Error updating running_seasons for division ${division}:`, updateError.message);
        } else {
          console.log(`  ✅ Updated running_seasons for Division ${division}`);
        }
      } else {
        // Insert new entry
        const { error: insertError } = await supabase
          .from('running_seasons')
          .insert([runningSeasonEntry]);

        if (insertError) {
          console.log(`  ⚠️  Error inserting running_seasons for division ${division}:`, insertError.message);
        } else {
          console.log(`  ✅ Created running_seasons for Division ${division}`);
        }
      }
    }

    console.log('\n✅ Done! All divisions have been populated in running_seasons.\n');

  } catch (err) {
    console.error('\n❌ Unexpected error:', err);
  }
}

populateRunningSeasons();
