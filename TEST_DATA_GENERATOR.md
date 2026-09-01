# Test Data Generator Guide

## Overview

The `generate_test_data.js` script is a comprehensive tool for populating your Fylde Pickleball database with realistic test data. It generates players, divisions, and matches across all supported game modes.

## Features

- ✅ **Multi-mode support**: Works with league, 5-player-champ, doubles, and round-robin modes
- ✅ **Realistic data**: Generates player stats, match outcomes, and streaks
- ✅ **Configurable**: Control divisions, players, and match rounds
- ✅ **Seeded randomization**: Reproducible data generation for consistent testing
- ✅ **Detailed output**: Summary statistics after generation
- ✅ **Data clearing**: Optional clearing of existing test data before generation

## Installation

Ensure your `.env.local` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### Basic Usage

```bash
# Generate default test data (league mode, 3 divisions, 10 players, 5 match rounds)
node scripts/generate_test_data.js

# Generate for 5-player championship
node scripts/generate_test_data.js 5-player-champ

# Generate for doubles mode
node scripts/generate_test_data.js doubles

# Generate for round-robin
node scripts/generate_test_data.js round-robin
```

### Advanced Options

```bash
# Specify number of divisions
node scripts/generate_test_data.js league --divisions 2

# Specify number of players per division
node scripts/generate_test_data.js league --players 15

# Specify number of match rounds
node scripts/generate_test_data.js league --matches 10

# Clear existing data before generating new
node scripts/generate_test_data.js league --clear

# Use verbose output
node scripts/generate_test_data.js league --verbose

# Use reproducible random seed
node scripts/generate_test_data.js league --seed 12345

# Combine multiple options
node scripts/generate_test_data.js 5-player-champ --divisions 1 --players 5 --matches 15 --clear --verbose
```

## Test Scenarios

### Scenario 1: Single Division, Quick Test
**Use case**: Rapid UI testing with minimal data

```bash
node scripts/generate_test_data.js league --divisions 1 --players 8 --matches 2 --clear
```

**Result**: 
- 1 division
- 8 players with varied win rates
- ~4-8 total matches
- Quick load times for UI testing

### Scenario 2: Multi-Division League
**Use case**: Test leaderboard rankings across divisions

```bash
node scripts/generate_test_data.js league --divisions 4 --players 12 --matches 5 --clear
```

**Result**:
- 4 divisions (Bronze, Silver, Gold, Platinum)
- 48 total players
- ~40-60 matches
- Tests cross-division functionality

### Scenario 3: 5-Player Championship
**Use case**: Test 5-player championship format

```bash
node scripts/generate_test_data.js 5-player-champ --divisions 2 --players 5 --matches 20 --clear
```

**Result**:
- 2 divisions
- 5 players per division (exact 5-player requirement)
- 20 rounds of matches
- Tests streak tracking and player statistics

### Scenario 4: Doubles Tournament
**Use case**: Test doubles match format and partnerships

```bash
node scripts/generate_test_data.js doubles --divisions 1 --players 8 --matches 8 --clear
```

**Result**:
- 1 division
- 8 players (4 potential partnerships)
- 16+ doubles matches
- Tests team-based scoring

### Scenario 5: Round-Robin Large Dataset
**Use case**: Performance and edge case testing

```bash
node scripts/generate_test_data.js round-robin --divisions 3 --players 20 --matches 15 --clear --verbose
```

**Result**:
- 3 divisions
- 20 players per division (60 total)
- 90+ matches total
- Tests statistics calculation with large data

### Scenario 6: Reproducible Data (for CI/CD)
**Use case**: Consistent test data for automated testing

```bash
node scripts/generate_test_data.js league --divisions 2 --players 10 --matches 5 --seed 42 --clear
```

**Result**:
- Same random data every time (seed 42)
- Useful for regression testing
- Consistent player names and match outcomes

## Generated Data

### Players
Each generated player includes:
- **Basic Info**: Name, gender, division
- **Statistics**: Wins, losses, draws (realistic distribution)
- **Performance**: Points for/against, win streak
- **Status**: Active flag (90% active by default)
- **Timestamps**: Creation date (distributed over last 30 days)

### Matches
Each generated match includes:
- **Participants**: 2 randomly selected players
- **Scores**: Realistic scores (8-21 points per side)
- **Outcome**: Weighted by player win rates
- **Metadata**: Round number, court assignment
- **Timestamps**: Distributed over match rounds

### Divisions
Each generated division includes:
- **Name**: "Test Division N"
- **Settings**: Min qualify games = 3
- **Auto-generated**: Division ID from database

## Output Example

```
[12:34:56] 🎯 FYLDE PICKLEBALL TEST DATA GENERATOR

[12:34:56] Mode: league
[12:34:56] Divisions: 2, Players: 10, Match Rounds: 5
[12:34:56] 

[12:34:56] 🗑️  Clearing existing test data...
[12:34:56] 📋 Creating 2 division(s)...
[12:34:56] ✅ Created 2 division(s)
[12:34:56] 👥 Creating 10 player(s) per division...
[12:34:56] ✅ Created 20 player(s) total
[12:34:56] ⚽ Generating 5 round(s) of matches...
[12:34:57] ✅ Created 48 match(es) total

============================================================
📊 TEST DATA GENERATION SUMMARY
============================================================
Mode:       league
Divisions:  2
Players:    20 (avg 10.0 per division)
Matches:    48

Division: Test Division 1
  Players: 10
    Avg W-L-D: 7.2-2.8-0.2
    Avg Win Rate: 72.0%
    Top Player: Alex Anderson (12W)
  Matches: 24

Division: Test Division 2
  Players: 10
    Avg W-L-D: 7.1-2.9-0.1
    Avg Win Rate: 71.0%
    Top Player: Bailey Chen (11W)
  Matches: 24

============================================================
✅ Test data generation complete!
```

## Troubleshooting

### Error: `.env.local not found`
**Solution**: Create `.env.local` with your Supabase credentials

### Error: `SUPABASE_SERVICE_ROLE_KEY not found`
**Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (available in Supabase dashboard)

### Data not appearing in UI
**Ensure**:
- You're logged in as a club member (not guest)
- You're viewing the correct mode (league, 5-player-champ, etc.)
- Refresh the page after generation completes
- Check browser console for errors

### Generation is slow
**Optimization**:
- Use smaller player counts: `--players 5` instead of `--players 20`
- Reduce match rounds: `--matches 3` instead of `--matches 10`
- Use verbose mode to see progress: `--verbose`

## Use Cases

| Use Case | Scenario | Command |
|----------|----------|---------|
| Quick UI test | 1 div, 8 players, 2 rounds | `node scripts/generate_test_data.js league --divisions 1 --players 8 --matches 2 --clear` |
| Statistics testing | 2 divs, 10 players, 10 rounds | `node scripts/generate_test_data.js league --divisions 2 --players 10 --matches 10 --clear` |
| Performance testing | 3 divs, 20 players, 15 rounds | `node scripts/generate_test_data.js league --divisions 3 --players 20 --matches 15 --clear` |
| 5-Player format | Exactly 5 players | `node scripts/generate_test_data.js 5-player-champ --divisions 1 --players 5 --matches 20 --clear` |
| CI/CD testing | Reproducible data | `node scripts/generate_test_data.js league --seed 42 --clear` |

## Next Steps

After generating test data:

1. **View in UI**: Open the app in your browser and navigate to different tabs
2. **Test Features**: 
   - ✅ Try Statistics tab to verify calculations
   - ✅ Test sorting and filtering
   - ✅ Check leaderboard accuracy
   - ✅ Verify streak tracking
3. **Run Phase 6**: Unit tests for match generation (next phase)
4. **Clear Data**: Run with `--clear` again to reset before running unit tests

## Advanced: Custom Player Names

To modify the player name pools, edit the `firstNames` and `lastNames` arrays in `generate_test_data.js`:

```javascript
const firstNames = [
  'Alex', 'Bailey', 'Casey', // ... add more names
];

const lastNames = [
  'Anderson', 'Bell', 'Carter', // ... add more names
];
```

## Notes

- Generated data is realistic but random
- Player win rates are determined by seeded random generation
- Match outcomes are weighted by player skill levels
- Data persists in database until manually cleared or `--clear` is used
- Each run generates different data unless `--seed` is specified
