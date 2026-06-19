Running Supabase SQL migrations for Doubles tables

This project includes SQL files to create dedicated Doubles-mode tables in Supabase.

Files:
- create_players_doubles.sql
- create_previous_matches_doubles.sql
- create_season_summaries_doubles.sql
- create_running_seasons_doubles.sql
- create_pending_fixtures_doubles.sql
- create_divisions_doubles.sql
- create_matches_doubles.sql
- create_doubles_all.sql (combined)

How to run:

1) Supabase SQL editor (recommended)
- Open your Supabase project, go to SQL > New query.
- Paste the contents of `create_doubles_all.sql` and run it.

2) Supabase CLI (if you have it configured)
- Save `create_doubles_all.sql` locally and run:

```bash
supabase db query "supabase/sql/create_doubles_all.sql"
```

(Adjust command to your environment; ensure `supabase` CLI is authenticated and pointed at your project.)

After running:
- The frontend will automatically target these tables when `localStorage.view_mode` is set to `doubles`.
- Consider seeding `divisions_doubles` to match your league divisions if desired.

If you'd like, I can commit these files and prepare a single git commit message for you.