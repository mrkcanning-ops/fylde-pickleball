import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const userId = searchParams.get('userId');

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

    const { data, error } = await supabase
      .from('member_storage')
      .select('value')
      .eq('owner_id', userId)
      .eq('key', key)
      .single();

    if (error) {
      // Key doesn't exist yet - return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ data: null });
      }
      return NextResponse.json(
        { error: error.message || 'Failed to load data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data?.value || null,
    });
  } catch (error) {
    console.error('Storage load error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load data' },
      { status: 500 }
    );
  }
}
