import { NextRequest, NextResponse } from 'next/server';
import { processChat, createChatSession } from '@/lib/ai/engine';

// CORS headers for widget embedding
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

/**
 * POST /api/chat
 * Handle chat messages or create new sessions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, restaurantId, sessionId, messages, message } = body;

    // Validate restaurant ID
    if (!restaurantId || typeof restaurantId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid restaurant ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return NextResponse.json(
        { error: 'Invalid restaurant ID format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Handle session creation
    if (action === 'create_session') {
      const result = await createChatSession(restaurantId);

      if (result.error === 'USAGE_LIMIT') {
        return NextResponse.json(
          { greeting: result.greeting, usageLimitReached: true },
          { status: 200, headers: corsHeaders }
        );
      }

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 400, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { sessionId: result.sessionId, greeting: result.greeting },
        { headers: corsHeaders }
      );
    }

    // Handle chat message
    if (action === 'send_message') {
      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid session ID' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!message || typeof message !== 'string') {
        return NextResponse.json(
          { error: 'Message is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate message length
      if (message.length > 2000) {
        return NextResponse.json(
          { error: 'Message too long (max 2000 characters)' },
          { status: 400, headers: corsHeaders }
        );
      }

      const chatMessages = Array.isArray(messages) ? messages : [];
      const result = await processChat(restaurantId, sessionId, chatMessages, message);

      if (result.error === 'USAGE_LIMIT') {
        return NextResponse.json(
          { response: result.response, usageLimitReached: true },
          { status: 200, headers: corsHeaders }
        );
      }

      if (result.error) {
        return NextResponse.json(
          { error: result.error },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { response: result.response },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
