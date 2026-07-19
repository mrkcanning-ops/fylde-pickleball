# Round Robin Mode - Fair Partnership Distribution

## Overview

The **Round Robin** mode generates fair matches where all players partner with all other players in a random but balanced order. Works with any number of players (4+) and automatically distributes games and rests fairly.

## Format Features

✅ **All partnerships**: Each player partners with every other player (at least once)  
✅ **Fair distribution**: Balanced games played and rest periods  
✅ **Flexible scaling**: Works with 4, 5, 6, 7, 8+ players  
✅ **Multi-court support**: Automatically distributes matches across courts  
✅ **Random optimization**: New partnerships prioritized, fair rests maintained

## How It Works

### Match Generation Algorithm

1. **Start with any number of active players** (4+)
2. **Calculate fair targets** based on player count:
   - 4 players: 3 rounds, 3 games per player, 0 rests
   - 5 players: 5 rounds, 4 games per player, 1 rest each
   - 6 players: 6 rounds, 4 games per player, 2 rests each
   - 7 players: 7 rounds, 4 games per player, 3 rests each
   - 8+ players: Scaled appropriately

3. **Generate matches round by round**:
   - Select 4 players for each game (2v2)
   - Prioritize new partnerships (never played together)
   - Balance games played per player
   - Balance rest periods fairly
   - Remaining players sit out (optional rest round)

4. **Distribute across courts** based on `numCourts` setting

### Fairness Guarantees

- **No player gets left out**: All players get equal or near-equal games
- **No player over-rests**: Rests distributed fairly across all players
- **Partnership variety**: Maximizes new partnerships, minimizes repeats
- **Dynamic balancing**: Adjusts if some rounds can't be completed

## Usage

### Setup

1. **Create database tables**:
   - Go to Supabase SQL Editor
   - Run these 6 SQL files:
     - `supabase/sql/create_divisions_roundrobin.sql`
     - `supabase/sql/create_players_roundrobin.sql`
     - `supabase/sql/create_previous_matches_roundrobin.sql`
     - `supabase/sql/create_pending_fixtures_roundrobin.sql`
     - `supabase/sql/create_running_seasons_roundrobin.sql`
     - `supabase/sql/create_season_summaries_roundrobin.sql`

2. **Select Round Robin mode**:
   - Click the title header multiple times to cycle through modes
   - Stop at 🔁 "Round Robin"

3. **Add players**:
   - Add 4 or more active players
   - Players tab shows green indicator when ready

4. **Generate fixtures**:
   - Go to Matches tab
   - Select number of courts (1-4)
   - Click "Generate Fixtures"
   - Matches automatically distributed across selected courts

### Running the Tournament

- **Matches display** on selected courts
- **Enter scores** as you play
- **Player stats** update automatically
- **Check standings** to see live rankings
- **View leaderboard** showing all players' stats

## Player Count Reference

| Players | Rounds | Games/Player | Rests/Player | Courts |
|---------|--------|--------------|--------------|--------|
| 4 | 3 | 3 | 0 | 1 |
| 5 | 5 | 4 | 1 | 1-2 |
| 6 | 6 | 4 | 2 | 1-2 |
| 7 | 7 | 4 | 3 | 2 |
| 8 | 6 | 3 | 3 | 2 |

## Example: 6-Player Round Robin

**Players**: Alice, Bob, Carol, Dave, Eve, Frank

**Result**: 6 rounds of matches where:
- Each player plays 4 games
- Each player rests 2 times
- Each player partners with all 5 other players (at least once)
- All players play against all other players multiple times

**Match Distribution**: Can be split across 1-2 courts:
- 1 Court: All 6 matches per round
- 2 Courts: 3 matches per court per round

## Data Storage

- Separate database tables with `_roundrobin` suffix
- Each mode maintains independent player data
- Match history tracked in `previous_matches_roundrobin`
- Season archives in `season_summaries_roundrobin`
- Pending fixtures stored with multi-court support

## Customization

### Change Number of Rounds

Edit [lib/matchGenerator.js](lib/matchGenerator.js), function `generateRoundRobinMatches`:
- Modify `getRoundConfig()` to change target rounds for any player count

### Prioritize Different Factors

The scoring algorithm can be adjusted to:
- Prioritize more unique partnerships
- Prioritize more balanced rests
- Prioritize more balanced game counts

Edit the `score` calculation in the match generation loop.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Requires at least 4 active players" | Add more active players before generating |
| Fixtures don't generate | Ensure players are marked as "active" |
| Uneven match distribution | Normal - algorithm balances within fairness constraints |
| Same partnership appears twice | Expected - maximizes variety but fairness comes first |
| One player sits out more | Happens with odd player counts (e.g., 5 players) |

## Comparison: All Game Modes

| Feature | League | Doubles | 5 Champ | Round Robin |
|---------|--------|---------|---------|------------|
| Players | 4+ | 4+ | Exactly 5 | 4+ |
| Games | 5-7 rounds | 5-7 rounds | 15 (fixed) | Dynamic |
| Team size | 1v1v1v1 | 2v2 | 2v2 | 2v2 |
| Partnerships | Optimized | Optimized | Guaranteed complete | Maximized variety |
| Sitting out | Yes | Yes | 3 times | 0-N times |
| Fair distribution | Yes | Yes | Yes | Yes |
| Multi-court | Yes | Yes | No (1 only) | Yes |
| Flexibility | Medium | Medium | Low | High |

## Technical Details

### Algorithm Parameters

```javascript
generateRoundRobinMatches(players, numCourts = 2)
```

**Inputs:**
- `players`: Array of player objects with `id`, `name`, `active`
- `numCourts`: Number of courts to split matches across (1-4)

**Outputs:**
- `courtMatches`: Array of court arrays, each containing match pairs
- `error`: Error message if fewer than 4 players

### Match Structure

```javascript
match = [
  [player1, player2],  // Team A
  [player3, player4]   // Team B
]
```

All matches stored in `pending_fixtures_roundrobin` with court-specific arrays.

---

**Questions?** See [docs/5-PLAYER-CHAMP-SETUP.md](docs/5-PLAYER-CHAMP-SETUP.md) for general setup patterns that apply to Round Robin as well.
