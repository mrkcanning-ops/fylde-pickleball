import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { userId, key, data, dataType } = await request.json();

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

    // Store serialized data with metadata
    const storedData = {
      owner_id: userId,
      key,
      data_type: dataType || 'general',
      value: data,
      updated_at: new Date().toISOString(),
    };

    // Create or update the record
    const { data: existing } = await supabase
      .from('member_storage')
      .select('id')
      .eq('owner_id', userId)
      .eq('key', key)
      .single();

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from('member_storage')
        .update(storedData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from('member_storage')
        .insert([storedData])
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || 'Failed to save data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      record: result.data,
    });
  } catch (error) {
    console.error('Storage save error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save data' },
      { status: 500 }
    );
  }
}
