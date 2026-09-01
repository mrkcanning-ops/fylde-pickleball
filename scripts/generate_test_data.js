#!/usr/bin/env node

/**
 * generate_test_data.js
 * 
 * Comprehensive test data generator for Fylde Pickleball database.
 * 
 * Usage:
 *   node scripts/generate_test_data.js [mode] [options]
 * 
 * Modes:
 *   - 5-player-champ (default): 5-player championship format
 *   - doubles: Doubles matches
 *   - round-robin: Round robin tournament
 * 
 * Options:
 *   --divisions N: Number of divisions to create (default: 3)
 *   --players N: Number of players per division (default: 10)
 *   --matches N: Number of match rounds (default: 5)
 *   --seed N: Random seed for reproducible data (optional)
 *   --clear: Clear existing data first (default: false)
 *   --verbose: Show detailed output (default: false)
 * 
 * Examples:
 *   node scripts/generate_test_data.js
 *   node scripts/generate_test_data.js 5-player-champ --divisions 2 --players 8 --matches 3
 *   node scripts/generate_test_data.js doubles --divisions 1 --players 8 --matches 10 --clear
 *   node scripts/generate_test_data.js round-robin --divisions 1 --players 5 --matches 15 --clear --verbose
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ===== CONFIGURATION =====

const args = process.argv.slice(2);
const supportedModes = ['5-player-champ', 'doubles', 'round-robin'];
const mode = supportedModes.includes(args[0]) ? args[0] : '5-player-champ';

if (!supportedModes.includes(mode) && args.length > 0 && !args[0].startsWith('--')) {
  console.error(`❌ Unsupported mode: ${args[0]}`);
  console.error(`Supported modes: ${supportedModes.join(', ')}`);
  process.exit(1);
}
const options = {
  divisions: 3,
  players: 10,
  matches: 5,
  clear: false,
  verbose: false,
  seed: null,
};

// Parse command-line options
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    if (key in options) {
      if (typeof options[key] === 'number') {
        options[key] = parseInt(args[i + 1], 10);
        i++;
      } else if (typeof options[key] === 'boolean') {
        options[key] = true;
      }
    }
  }
}

// ===== ENVIRONMENT SETUP =====

const envPath = path.resolve('.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found. Please create it with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && key.trim()) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ===== UTILITIES =====

function log(message) {
  console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${message}`);
}

function debug(message) {
  if (options.verbose) {
    console.log(`  → ${message}`);
  }
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// Seeded random for reproducibility
class SeededRandom {
  constructor(seed) {
    this.seed = seed || Math.random() * 10000;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  choice(array) {
    return array[Math.floor(this.next() * array.length)];
  }

  range(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

const rng = new SeededRandom(options.seed);

// ===== PLAYER NAME GENERATION =====

const firstNames = [
  'Alex', 'Bailey', 'Casey', 'Dana', 'Emma', 'Frank', 'Grace', 'Henry',
  'Ivy', 'Jack', 'Karen', 'Leo', 'Maya', 'Noah', 'Olivia', 'Paul',
  'Quinn', 'Rachel', 'Sam', 'Taylor', 'Uma', 'Victor', 'Wendy', 'Xander',
  'Yara', 'Zoe', 'Adrian', 'Beth', 'Chris', 'Diana', 'Ethan', 'Fiona'
];

const lastNames = [
  'Anderson', 'Bell', 'Carter', 'Davis', 'Edwards', 'Foster', 'Graham', 'Harris',
  'Irving', 'Jackson', 'Kelly', 'Lewis', 'Martin', 'Nelson', 'Oliver', 'Parker',
  'Quinn', 'Roberts', 'Smith', 'Taylor', 'Underwood', 'Vincent', 'Walker', 'Xavier',
  'Young', 'Zhang', 'Brown', 'Chen', 'Diaz', 'Evans', 'Fischer', 'Green'
];

const genders = ['male', 'female'];

function generatePlayerName() {
  const first = rng.choice(firstNames);
  const last = rng.choice(lastNames);
  return `${first} ${last}`;
}

function generateGender() {
  return rng.choice(genders);
}

// ===== TEST SCENARIO BUILDERS =====

/**
 * Generate realistic match outcomes based on player win rates
 */
function generateMatchOutcome(player1WinRate, player2WinRate) {
  const p1Score = rng.range(8, 21);
  const p2Score = rng.range(8, 21);
  
  // Weighted by win rates
  if (rng.next() < player1WinRate) {
    return p1Score > p2Score ? { team1: p1Score, team2: p2Score } : { team1: p2Score, team2: p1Score };
  } else {
    return p2Score > p1Score ? { team1: p2Score, team2: p1Score } : { team1: p1Score, team2: p2Score };
  }
}

/**
 * Generate player stats with realistic records
 */
function generatePlayerStats() {
  const winRate = rng.next(); // 0-1
  const gamesPlayed = rng.range(5, 20);
  const wins = Math.floor(gamesPlayed * winRate);
  const losses = gamesPlayed - wins - rng.range(0, 2);
  const draws = gamesPlayed - wins - losses;
  
  return {
    wins: Math.max(0, wins),
    losses: Math.max(0, losses),
    draws: Math.max(0, draws),
    points: wins * 20 + draws * 10,
    points_for: rng.range(100, 400),
    points_against: rng.range(100, 400),
  };
}

// ===== DATA GENERATION =====

async function generatePlayers(divisionId, count) {
  const players = [];
  
  for (let i = 0; i < count; i++) {
    const stats = generatePlayerStats();
    players.push({
      id: generateId(),
      name: generatePlayerName(),
      division: divisionId,
      gender: generateGender(),
      active: rng.next() > 0.1, // 90% active
      ...stats,
      win_streak: rng.range(0, 5),
      created_at: new Date(Date.now() - rng.range(1, 30) * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return players;
}

async function generateMatches(divisionId, players, matchCount) {
  const matches = [];
  
  for (let round = 1; round <= matchCount; round++) {
    // Generate 2-4 matches per round
    const matchesPerRound = rng.range(2, 4);
    
    for (let m = 0; m < matchesPerRound; m++) {
      // Randomly select 2 players
      const p1 = rng.choice(players);
      let p2 = rng.choice(players);
      while (p2.id === p1.id) {
        p2 = rng.choice(players);
      }
      
      // Generate realistic score based on win rates
      const p1WinRate = p1.wins / (p1.wins + p1.losses + p1.draws || 1);
      const p2WinRate = p2.wins / (p2.wins + p2.losses + p2.draws || 1);
      const scores = generateMatchOutcome(p1WinRate, p2WinRate);
      
      const match = {
        division: divisionId,
        players: [p1.id, p2.id],
        scores: scores,
        created_at: new Date(Date.now() - (matchCount - round) * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      // Only add ID and metadata for non-league modes
      if (mode !== 'league') {
        match.id = generateId();
        match.round = round;
        match.court = `court${(m % 4) + 1}`;
      }
      
      matches.push(match);
    }
  }
  
  return matches;
}

// ===== DATABASE OPERATIONS =====

function getTableSuffix() {
  if (mode === 'doubles') return '_doubles';
  if (mode === '5-player-champ') return '_5champ';
  if (mode === 'round-robin') return '_roundrobin';
  if (mode === 'partner-practice') return '_partner_practice';
  return '';
}

function getTableName(baseTable) {
  return `${baseTable}${getTableSuffix()}`;
}

async function clearExistingData() {
  if (!options.clear) return;
  
  log('🗑️  Clearing existing test data...');
  
  try {
    await supabase.from(getTableName('previous_matches')).delete().neq('id', '');
    debug('Cleared previous_matches');
  } catch (e) {}
  
  try {
    await supabase.from(getTableName('players')).delete().neq('id', '');
    debug('Cleared players');
  } catch (e) {}
  
  try {
    await supabase.from(getTableName('divisions')).delete().neq('id', '');
    debug('Cleared divisions');
  } catch (e) {}
}

async function createDivisions(count) {
  log(`📋 Creating ${count} division(s)...`);
  
  const divisions = [];
  for (let i = 0; i < count; i++) {
    divisions.push({
      name: `Test Division ${i + 1}`,
      min_qualify_games: 3,
    });
  }
  
  const { data, error } = await supabase
    .from(getTableName('divisions'))
    .insert(divisions)
    .select();
  
  if (error) {
    console.error('❌ Error creating divisions:', error.message);
    throw error;
  }
  
  log(`✅ Created ${data.length} division(s)`);
  debug(`Divisions: ${data.map(d => d.name).join(', ')}`);
  return data;
}

async function createPlayers(divisions, playerCount) {
  log(`👥 Creating ${playerCount} player(s) per division...`);
  
  const allPlayers = [];
  
  for (const division of divisions) {
    const players = await generatePlayers(division.id, playerCount);
    
    const { data, error } = await supabase
      .from(getTableName('players'))
      .insert(players)
      .select();
    
    if (error) {
      console.error(`❌ Error creating players for division ${division.id}:`, error.message);
      throw error;
    }
    
    allPlayers.push(...data);
    debug(`Division "${division.name}": ${data.length} players created`);
  }
  
  log(`✅ Created ${allPlayers.length} player(s) total`);
  return allPlayers;
}

async function createMatches(divisions, allPlayers, matchCount) {
  log(`⚽ Generating ${matchCount} round(s) of matches...`);
  
  const allMatches = [];
  
  for (const division of divisions) {
    const divisionPlayers = allPlayers.filter(p => p.division === division.id);
    
    if (divisionPlayers.length < 2) {
      debug(`Skipping matches for "${division.name}" (need at least 2 players)`);
      continue;
    }
    
    const matches = await generateMatches(division.id, divisionPlayers, matchCount);
    
    if (options.verbose && matches.length > 0) {
      console.log(`  Sample match for division ${division.id}:`, JSON.stringify(matches[0]));
    }
    
    const { data, error } = await supabase
      .from(getTableName('previous_matches'))
      .insert(matches)
      .select();
    
    if (error) {
      console.error(`❌ Error creating matches for division ${division.id}:`, error.message);
      if (options.verbose && matches.length > 0) {
        console.error(`  Sample match was:`, JSON.stringify(matches[0]));
      }
      throw error;
    }
    
    allMatches.push(...data);
    debug(`Division "${division.name}": ${data.length} matches created`);
  }
  
  log(`✅ Created ${allMatches.length} match(es) total`);
  return allMatches;
}

// ===== STATISTICS & SUMMARY =====

function printSummary(divisions, players, matches) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST DATA GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode:       ${mode}`);
  console.log(`Divisions:  ${divisions.length}`);
  console.log(`Players:    ${players.length} (avg ${(players.length / divisions.length).toFixed(1)} per division)`);
  console.log(`Matches:    ${matches.length}`);
  console.log('');
  
  divisions.forEach(div => {
    const divPlayers = players.filter(p => p.division === div.id);
    const divMatches = matches.filter(m => m.division === div.id);
    
    console.log(`Division: ${div.name}`);
    console.log(`  Players: ${divPlayers.length}`);
    if (divPlayers.length > 0) {
      const totalWins = divPlayers.reduce((sum, p) => sum + p.wins, 0);
      const totalLosses = divPlayers.reduce((sum, p) => sum + p.losses, 0);
      const totalDraws = divPlayers.reduce((sum, p) => sum + p.draws, 0);
      const avgWinRate = (totalWins / (totalWins + totalLosses + totalDraws || 1) * 100).toFixed(1);
      
      console.log(`    Avg W-L-D: ${(totalWins / divPlayers.length).toFixed(1)}-${(totalLosses / divPlayers.length).toFixed(1)}-${(totalDraws / divPlayers.length).toFixed(1)}`);
      console.log(`    Avg Win Rate: ${avgWinRate}%`);
      console.log(`    Top Player: ${divPlayers.sort((a, b) => b.wins - a.wins)[0].name} (${divPlayers[0].wins}W)`);
    }
    console.log(`  Matches: ${divMatches.length}`);
    if (divMatches.length > 0) {
      const avgScore = (divMatches.reduce((sum, m) => sum + (m.scores.team1 + m.scores.team2), 0) / divMatches.length).toFixed(1);
      console.log(`    Avg Combined Score: ${avgScore} points`);
    }
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('✅ Test data generation complete!');
  console.log('');
}

// ===== MAIN ENTRY POINT =====

async function main() {
  console.log('\n🎯 FYLDE PICKLEBALL TEST DATA GENERATOR\n');
  log(`Mode: ${mode}`);
  log(`Divisions: ${options.divisions}, Players: ${options.players}, Match Rounds: ${options.matches}`);
  if (options.seed) log(`Random Seed: ${options.seed}`);
  console.log('');
  
  try {
    await clearExistingData();
    
    const divisions = await createDivisions(options.divisions);
    const players = await createPlayers(divisions, options.players);
    const matches = await createMatches(divisions, players, options.matches);
    
    printSummary(divisions, players, matches);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test data generation failed:', error.message);
    process.exit(1);
  }
}

main();
