# 5 Player Champ - Round-Robin Format

## Overview

The **5 Player Champ** mode generates a complete round-robin tournament for exactly 5 players with **15 games**. Each player partners with every other player and plays against every other player, ensuring balanced competition.

## Format Rules

### Game Structure
- **Players per game**: 5 (2v2 + 1 sitting out)
- **Total games**: 15
- **Team size**: 2-player teams
- **Sitting out**: 1 player per game (rotates systematically)

### Key Features
✅ **Complete partnerships**: Each player partners with each other player (at least once)  
✅ **Complete competition**: Each player plays against each other player (at least once)  
✅ **Fair rotation**: Sitting-out player rotates so all players sit out equally  
✅ **Balanced scheduling**: All partnerships flow naturally from the systematic rotation

## 15-Game Schedule

The games follow a predetermined rotation ensuring maximum variety:

| Game | Team A | Team B | Sitting Out |
|------|--------|--------|-------------|
| 1 | P1 & P2 | P3 & P4 | P5 |
| 2 | P1 & P3 | P2 & P5 | P4 |
| 3 | P1 & P4 | P3 & P5 | P2 |
| 4 | P1 & P5 | P2 & P4 | P3 |
| 5 | P2 & P3 | P4 & P5 | P1 |
| 6 | P1 & P2 | P3 & P5 | P4 |
| 7 | P1 & P3 | P4 & P5 | P2 |
| 8 | P1 & P4 | P2 & P3 | P5 |
| 9 | P1 & P5 | P2 & P3 | P4 |
| 10 | P2 & P4 | P3 & P5 | P1 |
| 11 | P1 & P2 | P4 & P5 | P3 |
| 12 | P1 & P3 | P2 & P4 | P5 |
| 13 | P1 & P4 | P2 & P5 | P3 |
| 14 | P1 & P5 | P3 & P4 | P2 |
| 15 | P2 & P5 | P3 & P4 | P1 |

### Partnership Statistics

Each player:
- **Partnerships**: Partners with 4 different players (the other 4 players)
- **Total partnerships per player**: 10 partnerships (each with a different player)
- **Sitting out frequency**: 3 times (fairly distributed)
- **Games played**: 12 games

## How to Use

### Setup

1. **Select 5 Player Champ mode**
   - Click the title header to cycle to 👑 "5 Player Champ"

2. **Add exactly 5 active players**
   - Go to Players tab
   - Make sure exactly 5 players are marked as "active"
   - Other players should be marked "inactive"

3. **Generate fixtures**
   - Go to Standings tab
   - Click "Generate Fixtures" button
   - System will verify exactly 5 players are active
   - All 15 games will be generated automatically

4. **Run matches**
   - Enter scores for each game as you play
   - All games display on Court 1
   - Complete games count toward player stats

### During Play

- **Score entry**: Enter Team A and Team B scores after each game
- **Stats tracking**: Points, wins, losses, and point differential automatically update
- **Live leaderboard**: Check standings to see current rankings

## Data Storage

- All 15 games are saved to the `pending_fixtures_5champ` table
- Player stats update in `players_5champ` table
- Match history is stored in `previous_matches_5champ` table
- Season summaries archive in `season_summaries_5champ` table

## Scoring System

By default, the 5-player champ mode uses the same scoring as the League mode:

- **Win**: Counted as 1 win
- **Loss**: Counted as 1 loss
- **Points For/Against**: Tracked from scores entered
- **Point Differential**: (Points For - Points Against)
- **Ranking**: By win percentage, then point differential, then alphabetical

## Rankings

Players are ranked by:
1. **Win %** (wins ÷ games played)
2. **Point Differential** ((points for) - (points against))
3. **Games Played** (more games = higher rank if tied)
4. **Name** (alphabetical as final tiebreaker)

Players must play a **minimum number of games** to qualify for ranked positions (default: 10 games, but configurable per division).

## Minimum Qualifying Games

By default, players need **4 games minimum** to appear in rankings (since only 12 games are played and it's a 5-player format).

To adjust:
- Click the ⚙️ gear icon
- Edit "Min Games to Qualify"
- Re-save settings
- This setting is per-division and per-mode

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "5 Player Champ requires exactly 5 active players" | Verify you have exactly 5 players marked as "active" |
| Fixtures not generating | Ensure all 5 players are in the same division |
| Scores not saving | Check browser console for errors; try refreshing |
| Wrong number of games | The system generates all 15 games automatically |
| Player not in standings | Player may not have played minimum games (adjust in settings) |

## Customization

To modify the 5-player schedule, edit:
- [lib/matchGenerator.js](lib/matchGenerator.js) - Search for `generate5PlayerChampMatches`
- Update the `schedule` array with different pairings
- Redeploy

Example: To create an 8-game format or a different partnership rotation, update the schedule array.

## Technical Details

### Match Generation Algorithm

The `generate5PlayerChampMatches()` function:
1. Takes 5 active players
2. Returns 15 pre-generated games
3. Each game: TeamA (2 players) vs TeamB (2 players)
4. Uses a predetermined schedule ensuring balanced partnerships

**File**: [lib/matchGenerator.js](lib/matchGenerator.js)  
**Function**: `export function generate5PlayerChampMatches(players)`

### Database Structure

```javascript
// Single court with 15 games
{
  division: 1,
  court1_matches: [
    [[P1_id, P2_id], [P3_id, P4_id]],  // Game 1
    [[P1_id, P3_id], [P2_id, P5_id]],  // Game 2
    // ... 13 more games
  ],
  court1_scores: [
    { team1: "", team2: "" },  // Scores for each game
    // ... 14 more
  ],
  court1_byes: [],  // No byes in 5-player format
  status: "generated"
}
```

## Limitations

- ⚠️ Requires **exactly 5 players** (not more, not less)
- ⚠️ All 15 games must be played on a **single court**
- ⚠️ Format cannot be split across multiple courts
- ⚠️ No support for adding/removing players mid-tournament

## Comparison with Other Modes

| Feature | League | Doubles | 5 Player Champ |
|---------|--------|---------|-----------------|
| Players per game | 4 | 4 | 4 |
| Team size | 1v1v1v1 | 2v2 | 2v2 |
| Byes/sitting out | Yes (5-7 players) | Yes (5-7 players) | Yes (1 per game) |
| Total games | 5-7 rounds | 5-7 rounds | 15 games |
| Min players | 4 | 4 | 5 (exactly) |
| Partnership variety | Optimized | Optimized | Guaranteed complete |

---

**Questions?** See [docs/5-PLAYER-CHAMP-SETUP.md](docs/5-PLAYER-CHAMP-SETUP.md) for setup instructions.
