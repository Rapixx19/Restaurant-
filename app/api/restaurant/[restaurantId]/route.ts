import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { RestaurantSettings } from '@/modules/settings/types';

// CORS headers for widget access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

/**
 * GET /api/restaurant/[restaurantId]
 * Public endpoint to fetch restaurant info for the chat widget.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, phone, settings')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;

    return NextResponse.json(
      {
        id: restaurant.id,
        name: restaurant.name,
        phone: restaurant.phone,
        widgetColor: settings.widget?.primaryColor || '#3B82F6',
        greeting: settings.ai?.greeting || `Welcome to ${restaurant.name}! How can I help you today?`,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Restaurant API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
