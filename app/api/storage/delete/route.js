import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { userId, key } = await request.json();

    if (!userId || !key) {
      return NextResponse.json(
        { error: 'userId and key are required' },
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

    const { error } = await supabase
      .from('member_storage')
      .delete()
      .eq('owner_id', userId)
      .eq('key', key);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Storage delete error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete data' },
      { status: 500 }
    );
  }
}
