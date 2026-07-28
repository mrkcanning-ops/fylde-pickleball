import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/**
 * Guest-to-Member Conversion Endpoint
 * 
 * Converts a guest session to a club member account.
 * The guest's current data (stored in localStorage on client) should be
 * managed separately - this endpoint only creates the club member account.
 * 
 * Request body:
 * {
 *   username: string,
 *   password: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   user: { id, username },
 *   message: string
 * }
 */
export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if username already exists
    const { data: existing } = await supabase
      .from('club_members')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new club member
    const { data: newMember, error: insertError } = await supabase
      .from('club_members')
      .insert([
        {
          username,
          password_hash: passwordHash,
        },
      ])
      .select('id, username')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newMember.id,
          username: newMember.username,
        },
        message: 'Account created! Your guest data was stored locally. You can now manage your leagues as a club member.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Guest-to-member conversion error:', error);
    return NextResponse.json(
      { error: error?.message || 'Conversion failed' },
      { status: 500 }
    );
  }
}
