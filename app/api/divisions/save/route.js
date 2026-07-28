import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { memberId, divisionName, viewMode } = await request.json();

    if (!memberId || !divisionName) {
      return NextResponse.json(
        { error: 'memberId and divisionName are required' },
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

    // Determine which divisions table based on viewMode
    const tableName = viewMode === 'doubles' ? 'divisions_doubles' : 'divisions';

    // Check if division already exists for this member
    const { data: existing } = await supabase
      .from(tableName)
      .select('id')
      .eq('owner_id', memberId)
      .eq('name', divisionName)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Division already exists' },
        { status: 409 }
      );
    }

    // Create new division
    const { data: newDivision, error: insertError } = await supabase
      .from(tableName)
      .insert([
        {
          owner_id: memberId,
          name: divisionName,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || 'Failed to create division' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      division: newDivision,
    });
  } catch (error) {
    console.error('Save division error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save division' },
      { status: 500 }
    );
  }
}
