# Round Robin Mode - Fair Partnership Distribution

## Overview

The **Round Robin** mode generates matches where each player partners with all other players at least once. Partnerships can repeat across matches, but the tournament continues until every player has had at least one game with every other player. Rests are allowed to be unfair.

## Format Features

✅ **All players partner all others**: Player A partners with B, C, D, E, F at least once each (critical feature)  
✅ **Partnerships can repeat**: Same partnership (A-B) may happen twice if needed  
⚠️ **Rests can be unfair**: Some players may sit out more than others (trade-off for guaranteed partnerships)  
✅ **Balanced games**: Attempts to keep game distribution reasonably even  
✅ **Flexible scaling**: Works with 4, 5, 6, 7, 8+ players  
✅ **Multi-court support**: Automatically distributes matches across courts

## How It Works

### Match Generation Algorithm

1. **Start with any number of active players** (4+)
2. **Track each player's partnerships**: For each player, remember which other players they've already partnered with
3. **Generate matches round by round** until all players have partnered all others:
   - Select 4 players for a match
   - Form 2 teams of 2
   - Record which players partnered together
   - Remaining players sit out (rests are allowed to be unequal)
   - Repeat until **every player has partnered with every other player at least once**

4. **Distribute across courts** based on `numCourts` setting

### Fairness Guarantees vs. Trade-offs

**Guaranteed:**
- ✅ **Complete partnerships**: Every player partners with every other player at least once
- ✅ **Game balance**: Games are distributed as evenly as possible

**NOT guaranteed (acceptable trade-off):**
- ⚠️ **Fair rests**: Some players may sit out more than others (but this is OK!)
- ⚠️ **No repeat partnerships**: Same partnership may happen twice

**Why this trade-off?**
By allowing partnerships to repeat and rests to be unfair, we can:
- Guarantee each player experiences all unique partnerships
- Minimize tournament length
- Still maintain reasonable game distribution per player

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

| Players | Each Player Partners | Typical Rounds | Notes |
|---------|---------------------|-----------------|-------|
| 4 | 3 others | 3-4 | A partners B,C,D; B partners A,C,D; etc. |
| 5 | 4 others | 5-6 | Every player partners all 4 others at least once |
| 6 | 5 others | 8-10 | Every player partners all 5 others at least once |
| 7 | 6 others | 11-14 | Every player partners all 6 others at least once |
| 8 | 7 others | 14-18 | Every player partners all 7 others at least once |

**Why "Typical Rounds"?** Since each match creates 2 partnerships (2 teams of 2), the algorithm stops when every player has partnered with all others. Some players may sit out more rounds than others, but the minimum is achieved.

## Example: 6-Player Round Robin

**Players**: Alice, Bob, Carol, Dave, Eve, Frank

**Guarantee**: Each player will partner with all 5 others at least once:
- Alice will partner: B, C, D, E, F (in separate matches)
- Bob will partner: A, C, D, E, F (in separate matches)
- Carol will partner: A, B, D, E, F (in separate matches)
- Dave will partner: A, B, C, E, F (in separate matches)
- Eve will partner: A, B, C, D, F (in separate matches)
- Frank will partner: A, B, C, D, E (in separate matches)

**Tournament Result**: 
- ~8-10 matches to complete all player partnerships
- Some partnerships may repeat (e.g., A-B could happen twice if needed)
- Some players may play more games than others
- All players rest a different number of times (but this is OK!)
- **Main goal achieved**: Every player experienced playing with every other player

**Match Distribution**: Can be split across 1-2 courts

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
| Some players rest more than others | Expected - rests can be unfair to guarantee all partnerships |
| Player A plays more games than Player B | Expected - trade-off for guaranteeing each player partners all others |
| Same partnership appears twice | Expected - partnerships can repeat, this is allowed |
| Tournament runs longer than expected | Normal - varies based on random quartet selection |

## Comparison: All Game Modes

| Feature | League | Doubles | 5 Champ | Round Robin |
|---------|--------|---------|---------|------------|
| Players | 4+ | 4+ | Exactly 5 | 4+ |
| Matches | 5-7 | 5-7 | 15 (fixed) | Variable (until all partner) |
| Team size | 1v1v1v1 | 2v2 | 2v2 | 2v2 |
| **Partnerships** | Variety | Variety | Guaranteed complete | **All players partner all others** ✅ |
| Repeat partnerships | Yes | Yes | Yes | Allowed/expected |
| Sitting out | Yes (fair) | Yes (fair) | Yes (fair) | Yes (may be unfair) |
| Game distribution | Fair | Fair | Fair | Fair-ish |
| Multi-court | Yes | Yes | No (1 only) | Yes |
| Best for | Casual rotation | Casual pairs | Tournament finale | Ensure all play together |

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

**How it works:**
1. For each player, track which other players they've already partnered with
2. Loop through possible 4-player combinations (quartets)
3. For each quartet, try all possible team arrangements
4. Score each arrangement: heavily prioritize MISSING player partnerships, minor tiebreaker for game balance
5. Select best arrangement and record those partnerships
6. Repeat until every player has partnered with every other player at least once
7. Allow rests and repeated partnerships - the only constraint is complete player partnerships

### Match Structure

```javascript
match = [
  [player1, player2],  // Team A (now partners for first/repeat time)
  [player3, player4]   // Team B (now partners for first/repeat time)
]
```

All matches stored in `pending_fixtures_roundrobin` with court-specific arrays.

---

**Questions?** See [docs/5-PLAYER-CHAMP-SETUP.md](docs/5-PLAYER-CHAMP-SETUP.md) for general setup patterns that apply to Round Robin as well.
