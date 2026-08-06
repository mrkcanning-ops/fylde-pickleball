# Database Migration: Adding Gender Column to Players Tables

## Problem
Error: `Could not find the 'gender' column of 'players_partner_practice' in the schema cache`

The application code tries to save the `gender` field when creating a new player, but the database tables don't have this column yet.

## Solution
Run the migration SQL to add the `gender` column to all players tables.

## Steps

### Using Supabase Dashboard
1. Go to Supabase Dashboard
2. Navigate to your project
3. Go to SQL Editor
4. Click "New Query"
5. Copy and paste the contents of `supabase/sql/add_gender_to_players.sql`
6. Click "Run"

### Using Supabase CLI (if installed)
```bash
npx supabase db push
```

## What This Does
Adds a nullable `gender` text column to:
- `players` (league mode)
- `players_doubles`
- `players_5champ`
- `players_roundrobin`
- `players_partner_practice`

The column accepts: `'male'`, `'female'`, or `NULL` (not specified)

## Verification
After running the migration, you can verify it worked by checking that the column exists:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='players_partner_practice' AND column_name='gender';
```

Should return one row with `gender` if successful.
