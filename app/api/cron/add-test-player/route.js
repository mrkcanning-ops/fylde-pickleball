/**
 * Cron API: Add Test Player Daily
 * 
 * Runs automatically at midnight UTC every day
 * Adds one random test player to the testing user's account
 * 
 * Requires:
 * - CRON_SECRET environment variable (set in Vercel dashboard)
 * - Testing user with email: testing@fylde-pickleball.local
 */

export async function GET(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (!authHeader || authHeader !== expectedAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Import Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get the testing user
    const { data: testUsers, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', 'testing@fylde-pickleball.local')
      .limit(1);

    if (userError || !testUsers || testUsers.length === 0) {
      console.error('Testing user not found:', userError);
      return Response.json(
        { error: 'Testing user not found. Please create testing@fylde-pickleball.local first.' },
        { status: 404 }
      );
    }

    const testUserId = testUsers[0].id;

    // Get available divisions for testing user
    const { data: divisions, error: divError } = await supabase
      .from('divisions')
      .select('id')
      .eq('owner_id', testUserId)
      .limit(1);

    if (divError || !divisions || divisions.length === 0) {
      console.error('No divisions found for testing user:', divError);
      return Response.json(
        { error: 'Testing user has no divisions. Create a division first.' },
        { status: 404 }
      );
    }

    const divisionId = divisions[0].id;

    // Generate random player
    const firstNames = ['Alex', 'Blake', 'Casey', 'Dakota', 'Ellis', 'Finley', 'Gray', 'Harper', 'Indigo', 'Jordan'];
    const lastNames = ['Test', 'Daily', 'Auto', 'Cron', 'Player', 'Trial', 'Demo', 'Sample'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const timestamp = Date.now().toString().slice(-4);
    const playerName = `${firstName} ${lastName} ${timestamp}`;
    const playerId = crypto.randomUUID?.() || `player_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Add player to database
    const { data: addedPlayer, error: addError } = await supabase
      .from('players')
      .insert([{
        id: playerId,
        name: playerName,
        division: divisionId,
        owner_id: testUserId,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        points_for: 0,
        points_against: 0,
        win_streak: 0,
        active: true,
        gender: Math.random() > 0.5 ? 'male' : 'female',
      }])
      .select();

    if (addError) {
      console.error('Error adding player:', addError);
      return Response.json(
        { error: `Failed to add player: ${addError.message}` },
        { status: 500 }
      );
    }

    const successMessage = `✅ Test player "${playerName}" added to division ${divisionId} at ${new Date().toISOString()}`;
    console.log(successMessage);

    return Response.json({
      success: true,
      player: addedPlayer?.[0],
      message: successMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Cron error:', err);
    return Response.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// Configure: Max execution time for cron function (seconds)
export const maxDuration = 60;
