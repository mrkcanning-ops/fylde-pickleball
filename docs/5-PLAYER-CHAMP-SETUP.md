# 5 Player Champ Mode Setup Guide

## Overview

A new game mode called **"5 Player Champ"** has been added to the Fylde Pickleball app alongside the existing "League" and "Doubles" modes. This guide explains how to set it up and use it.

## What Changed

### 1. **New Database Tables**
Six new tables were created with the `_5champ` suffix, mirroring the structure of League and Doubles modes:

- `divisions_5champ` - Championship divisions
- `players_5champ` - Player statistics for 5-player format
- `previous_matches_5champ` - Historical match records
- `pending_fixtures_5champ` - Scheduled upcoming matches
- `running_seasons_5champ` - Active season tracking
- `season_summaries_5champ` - Archived season snapshots

### 2. **Updated App Code**
- Mode switching now cycles through **three modes**: League → Doubles → 5 Player Champ → League
- The header shows a 👑 emoji for the 5 Player Champ mode
- Unique subtitle and accent color (purple) for the new mode
- All database operations automatically route to the correct `_5champ` tables

## Setup Instructions

### Step 1: Create the Database Tables

Run these SQL migration files in your Supabase project (in order):

```bash
# Copy and paste into Supabase SQL Editor, then click "Run"
```

**Files to execute:**
1. [create_divisions_5champ.sql](supabase/sql/create_divisions_5champ.sql)
2. [create_players_5champ.sql](supabase/sql/create_players_5champ.sql)
3. [create_previous_matches_5champ.sql](supabase/sql/create_previous_matches_5champ.sql)
4. [create_pending_fixtures_5champ.sql](supabase/sql/create_pending_fixtures_5champ.sql)
5. [create_running_seasons_5champ.sql](supabase/sql/create_running_seasons_5champ.sql)
6. [create_season_summaries_5champ.sql](supabase/sql/create_season_summaries_5champ.sql)

**Steps:**
1. Go to [Supabase Console](https://app.supabase.com) → Your Project
2. Click the **SQL Editor** tab on the left
3. Click **New Query**
4. Copy the contents of each SQL file above and run them sequentially
5. After each file, confirm the table was created (check the **Table Editor** tab)

### Step 2: Update Your App Code

The app code has already been updated to support the new mode:
- Mode switching logic updated to cycle through three modes
- Header displays different emoji (👑), title, and colors
- Database helper automatically routes to correct tables

### Step 3: Deploy

```bash
git add .
git commit -m "Add 5 Player Champ mode"
git push
```

Deploy to Vercel (or your hosting platform).

### Step 4: Add Initial Data (Optional)

After the tables are created, you can:

1. **Add Divisions:**
   - Click the title header to cycle to "5 Player Champ" mode
   - Add a new division (e.g., "Division 1")

2. **Add Players:**
   - Add active players in the app (same as League/Doubles modes)
   - Data will automatically sync to the `players_5champ` table

3. **Copy from League** (Optional):
   - The app has a button to copy divisions from League to Doubles
   - You can manually copy divisions to 5-player-champ if needed

## Usage

### Switching Modes
- **Click the title** in the header to cycle through:
  1. 🔥 Fylde Pickleball League
  2. 🎯 Doubles - Points Difference
  3. 👑 5 Player Champ

### Each Mode Maintains Separate Data
- Players, matches, and seasons are kept separate per mode
- Data stored in localStorage is also mode-specific
- You can run different tournaments in each mode simultaneously

## Technical Details

### Database Suffix Pattern
- **League (singles):** No suffix (e.g., `divisions`, `players`, `matches`)
- **Doubles:** `_doubles` suffix (e.g., `divisions_doubles`, `players_doubles`)
- **5 Player Champ:** `_5champ` suffix (e.g., `divisions_5champ`, `players_5champ`)

### Data Storage
- All data syncs to Supabase automatically
- Each mode has independent local caches in localStorage
- Season summaries and match history are archived separately

### Ranking Logic (Current)
⚠️ **Note:** The ranking and match generation logic currently uses the same algorithm as League/Doubles modes. For 5-player-specific rules (e.g., 5-player rotation, championship bracket format), contact the development team for customization.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "5 Player Champ" option not appearing | Clear browser cache, refresh page |
| Tables not found error | Verify all 6 SQL files were executed successfully |
| Data not syncing | Check Supabase URL and API keys in `.env.local` |
| Divisions not loading | Ensure at least one division exists in `divisions_5champ` table |

## Customization

To customize the 5 Player Champ mode:

- **Change the emoji:** Edit [app/page.js](app/page.js) line ~2447 (search for `👑`)
- **Change the title:** Edit [app/page.js](app/page.js) line ~2449 (search for `"5 Player Champ"`)
- **Change the accent color:** Edit [app/page.js](app/page.js) line ~2453 (search for `bg-purple-400`)
- **Modify ranking logic:** See the `sortPlayersByStats` function for league-specific rules

## Next Steps

1. ✅ Create the 6 database tables
2. ✅ Deploy the updated app
3. ➡️ Test the mode by switching to it from the header
4. ➡️ Add players and run test matches
5. ➡️ Customize ranking/match generation if needed (contact dev team)

---

**Questions?** Check the main [README.md](README.md) or contact the development team.
