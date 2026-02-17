import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAvailability, bookReservation } from '@/lib/reservations/availability';
import { sendReservationConfirmation } from '@/lib/notifications';
import { buildVoiceSystemPrompt, VAPI_TOOLS } from '@/lib/ai/vapi-tools';
import { createLogger } from '@/lib/logging/server';
import type { RestaurantSettings, DayOfWeek } from '@/modules/settings/types';
import { incrementVoiceMinutes, getRestaurantOrganizationId } from '@/lib/limits/gatekeeper';

const logger = createLogger('VapiWebhook');

/**
 * Vapi Webhook Handler
 *
 * SECURITY: Verifies x-vapi-secret header before processing.
 *
 * Handles events from Vapi voice AI platform:
 * - tool-calls: Execute tools (check_availability, book_table, get_menu_items, etc.)
 * - assistant-request: Provide dynamic assistant configuration
 * - end-of-call-report: Save transcript to call_logs
 * - status-update: Track call status changes
 */

/**
 * Verify the request is from Vapi using shared secret.
 */
function verifyVapiRequest(request: NextRequest): boolean {
  const secret = request.headers.get('x-vapi-secret');
  const expectedSecret = process.env.VAPI_WEBHOOK_SECRET;

  if (!expectedSecret) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    logger.error('VAPI_WEBHOOK_SECRET not configured in production');
    return false;
  }

  return secret === expectedSecret;
}

// Supabase admin client for database operations
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ============================================================
// TOOL HANDLERS
// ============================================================

interface ToolCallParams {
  restaurantId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Handle check_availability tool call.
 */
async function handleCheckAvailability(
  restaurantId: string,
  args: { date: string; time: string; party_size: number }
): Promise<{ result: unknown }> {
  const availability = await checkAvailability(
    restaurantId,
    args.date,
    args.time,
    args.party_size
  );

  if (availability.available) {
    return {
      result: {
        available: true,
        message: `Great news! We have availability for ${args.party_size} guests on ${args.date} at ${args.time}.`,
      },
    };
  }

  return {
    result: {
      available: false,
      message: availability.reason,
      suggestedTimes: availability.suggestedTimes,
    },
  };
}

/**
 * Handle book_table tool call.
 */
async function handleBookTable(
  restaurantId: string,
  args: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    date: string;
    time: string;
    party_size: number;
    special_requests?: string;
  }
): Promise<{ result: unknown }> {
  const booking = await bookReservation({
    restaurantId,
    customerName: args.customer_name,
    customerPhone: args.customer_phone,
    customerEmail: args.customer_email,
    partySize: args.party_size,
    date: args.date,
    time: args.time,
    specialRequests: args.special_requests,
    source: 'phone',
  });

  if (booking.success && booking.reservationId) {
    // Send confirmation notification asynchronously
    sendReservationConfirmation(booking.reservationId).catch((err) => {
      logger.error('Failed to send reservation confirmation', { error: err, reservationId: booking.reservationId });
    });

    return {
      result: {
        success: true,
        reservationId: booking.reservationId,
        message: `Your reservation is confirmed for ${args.party_size} guests on ${args.date} at ${args.time}. We'll send a confirmation to ${args.customer_phone}.`,
      },
    };
  }

  return {
    result: {
      success: false,
      message: booking.error || 'Unable to complete the booking. Please try again.',
    },
  };
}

/**
 * Handle get_menu_info tool call.
 */
async function handleGetMenuInfo(
  restaurantId: string,
  args: { query: string; category?: string }
): Promise<{ result: unknown }> {
  const supabase = getSupabase();

  // Build query
  let query = supabase
    .from('menu_items')
    .select('name, description, price, dietary_tags, allergens, is_available, categories(name)')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);

  // Filter by category if provided
  if (args.category) {
    query = query.ilike('categories.name', `%${args.category}%`);
  }

  const { data: items, error } = await query.limit(10);

  if (error || !items || items.length === 0) {
    return {
      result: {
        found: false,
        message: 'I couldn\'t find any matching menu items. Would you like me to describe our most popular dishes instead?',
      },
    };
  }

  // Search for relevant items based on query
  const searchTerms = args.query.toLowerCase().split(' ');
  const relevantItems = items.filter((item) => {
    const itemText = `${item.name} ${item.description || ''} ${(item.dietary_tags || []).join(' ')}`.toLowerCase();
    return searchTerms.some((term) => itemText.includes(term));
  });

  const itemsToDescribe = relevantItems.length > 0 ? relevantItems : items.slice(0, 5);

  const descriptions = itemsToDescribe.map((item) => {
    const categories = item.categories as { name: string }[] | { name: string } | null;
    const category = Array.isArray(categories) ? categories[0]?.name : categories?.name;
    const dietary = (item.dietary_tags as string[] || []).join(', ');
    const allergenInfo = (item.allergens as string[] || []).length > 0
      ? `Contains: ${(item.allergens as string[]).join(', ')}`
      : '';

    return {
      name: item.name,
      price: item.price,
      description: item.description,
      category,
      dietary: dietary || undefined,
      allergens: allergenInfo || undefined,
    };
  });

  return {
    result: {
      found: true,
      items: descriptions,
      message: `I found ${descriptions.length} items that might interest you.`,
    },
  };
}

/**
 * Handle get_restaurant_info tool call.
 */
async function handleGetRestaurantInfo(
  restaurantId: string
): Promise<{ result: unknown }> {
  const supabase = getSupabase();

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('name, phone, address')
    .eq('id', restaurantId)
    .single();

  if (error || !restaurant) {
    return {
      result: {
        message: 'I apologize, but I am having trouble accessing that information right now.',
      },
    };
  }

  const address = restaurant.address as { street?: string; city?: string; state?: string } | null;
  let response = 'You have reached ' + restaurant.name + '.';
  if (restaurant.phone) {
    response += ' Our phone number is ' + restaurant.phone + '.';
  }
  if (address?.street) {
    response += ' We are located at ' + address.street;
    if (address.city) response += ' in ' + address.city;
    response += '.';
  }

  return { result: { message: response } };
}

/**
 * Handle get_menu_items tool call (voice-optimized).
 */
async function handleGetMenuItems(
  restaurantId: string,
  args: { search_term?: string; dietary_tags?: string[]; category_name?: string }
): Promise<{ result: unknown }> {
  const supabase = getSupabase();

  let query = supabase
    .from('menu_items')
    .select('name, price, dietary_tags')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);

  const { data: items } = await query.limit(20);
  let results = items || [];

  // Filter by category if specified
  if (args.category_name) {
    const { data: categories } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .ilike('name', '%' + args.category_name + '%');

    if (categories?.length) {
      const categoryIds = categories.map((c) => c.id);
      const { data: catItems } = await supabase
        .from('menu_items')
        .select('name, price, dietary_tags')
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .in('category_id', categoryIds)
        .limit(10);
      results = catItems || [];
    }
  }

  // Filter by dietary tags
  if (args.dietary_tags && args.dietary_tags.length > 0) {
    results = results.filter((item) =>
      args.dietary_tags!.some((tag) =>
        (item.dietary_tags as string[])?.some((t) =>
          t.toLowerCase().includes(tag.toLowerCase())
        )
      )
    );
  }

  // Filter by search term
  if (args.search_term) {
    const term = args.search_term.toLowerCase();
    results = results.filter((item) => item.name.toLowerCase().includes(term));
  }

  if (results.length === 0) {
    return {
      result: {
        message: 'I could not find any items matching that. Would you like me to tell you about our most popular dishes?',
      },
    };
  }

  // Voice: limit to 3 items max
  const topItems = results.slice(0, 3);
  const itemList = topItems.map((item) =>
    item.name + ' at $' + item.price.toFixed(2)
  ).join(', ');

  let response = 'We have ' + itemList + '.';
  if (results.length > 3) {
    response += ' There are ' + (results.length - 3) + ' more options. Would you like to hear more?';
  }

  return { result: { message: response, items: topItems } };
}

/**
 * Handle get_menu_item_details tool call.
 */
async function handleGetMenuItemDetails(
  restaurantId: string,
  args: { item_name: string }
): Promise<{ result: unknown }> {
  const supabase = getSupabase();

  const { data: items } = await supabase
    .from('menu_items')
    .select('name, description, price, dietary_tags, allergens, is_available')
    .eq('restaurant_id', restaurantId)
    .ilike('name', '%' + args.item_name + '%')
    .limit(1);

  const item = items?.[0];
  if (!item) {
    return {
      result: {
        message: 'I could not find a menu item called ' + args.item_name + '. Would you like me to suggest something similar?',
      },
    };
  }

  let response = item.name + ' is $' + item.price.toFixed(2) + '.';
  if (item.description) {
    response += ' ' + item.description;
  }
  if ((item.dietary_tags as string[])?.length > 0) {
    response += ' It is ' + (item.dietary_tags as string[]).join(', ') + '.';
  }
  if ((item.allergens as string[])?.length > 0) {
    response += ' Please note it contains ' + (item.allergens as string[]).join(' and ') + '.';
  }
  if (!item.is_available) {
    response += ' However, this item is currently unavailable.';
  }

  return { result: { message: response, item } };
}

/**
 * Handle check_opening_hours tool call.
 */
async function handleCheckOpeningHours(
  restaurantId: string,
  args: { day?: string }
): Promise<{ result: unknown }> {
  const supabase = getSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('settings')
    .eq('id', restaurantId)
    .single();

  const settings = restaurant?.settings as RestaurantSettings | null;
  const operatingHours = settings?.capacity?.operatingHours;

  if (!operatingHours) {
    return {
      result: {
        message: 'I do not have the hours information available. Please call us directly for our hours.',
      },
    };
  }

  const dayInput = (args.day || 'today').toLowerCase();
  let day: DayOfWeek;

  if (dayInput === 'today') {
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    day = days[new Date().getDay()];
  } else {
    day = dayInput as DayOfWeek;
  }

  const hours = operatingHours[day];
  if (!hours) {
    return { result: { message: 'I do not have hours information for ' + day + '.' } };
  }

  if (hours.closed) {
    return {
      result: {
        message: 'We are closed on ' + day.charAt(0).toUpperCase() + day.slice(1) + 's.',
      },
    };
  }

  const formatVoiceTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    if (m === 0) return h12 + ' ' + period;
    return h12 + ':' + m.toString().padStart(2, '0') + ' ' + period;
  };

  const openTime = formatVoiceTime(hours.open);
  const closeTime = formatVoiceTime(hours.close);

  if (dayInput === 'today') {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const isOpen = currentTime >= hours.open && currentTime <= hours.close;
    return {
      result: {
        message: 'We are currently ' + (isOpen ? 'open' : 'closed') + '. Today our hours are ' + openTime + ' to ' + closeTime + '.',
      },
    };
  }

  return {
    result: {
      message: 'On ' + day.charAt(0).toUpperCase() + day.slice(1) + 's we are open from ' + openTime + ' to ' + closeTime + '.',
    },
  };
}

/**
 * Route tool calls to appropriate handlers.
 */
async function handleToolCall(params: ToolCallParams): Promise<{ result: unknown }> {
  const { restaurantId, toolName, args } = params;

  switch (toolName) {
    case 'check_availability':
      return handleCheckAvailability(
        restaurantId,
        args as { date: string; time: string; party_size: number }
      );

    case 'book_table':
      return handleBookTable(
        restaurantId,
        args as {
          customer_name: string;
          customer_phone: string;
          customer_email?: string;
          date: string;
          time: string;
          party_size: number;
          special_requests?: string;
        }
      );

    case 'get_menu_info':
      return handleGetMenuInfo(
        restaurantId,
        args as { query: string; category?: string }
      );

    case 'get_menu_items':
      return handleGetMenuItems(
        restaurantId,
        args as { search_term?: string; dietary_tags?: string[]; category_name?: string }
      );

    case 'get_menu_item_details':
      return handleGetMenuItemDetails(
        restaurantId,
        args as { item_name: string }
      );

    case 'get_restaurant_info':
      return handleGetRestaurantInfo(restaurantId);

    case 'check_opening_hours':
      return handleCheckOpeningHours(
        restaurantId,
        args as { day?: string }
      );

    default:
      return {
        result: {
          error: true,
          message: 'Unknown tool: ' + toolName,
        },
      };
  }
}

// ============================================================
// CALL LOGGING
// ============================================================

interface CallLogData {
  callId: string;
  assistantId?: string;
  restaurantId: string;
  phoneNumber?: string;
  direction?: 'inbound' | 'outbound';
  status?: 'active' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript?: Array<{ role: string; content: string; timestamp?: string }>;
  summary?: string;
  customerName?: string;
  customerPhone?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  reservationId?: string;
  orderId?: string;
  recordingUrl?: string;
  languageDetected?: string;
}

/**
 * Detect primary language from transcript content.
 * Uses enhanced pattern matching for reliable detection across environments.
 *
 * Focuses on customer messages (not assistant responses) for accuracy.
 */
function detectLanguageFromTranscript(
  transcript?: Array<{ role: string; content: string }>
): string {
  if (!transcript || transcript.length === 0) return 'en';

  // Extract only the customer's messages for language detection
  // The assistant's language is predetermined, so we focus on what the caller speaks
  const customerText = transcript
    .filter((t) => t.role === 'user' || t.role === 'customer')
    .map((t) => t.content)
    .join(' ')
    .trim();

  // Need sufficient text for reliable detection (at least 10 chars)
  if (customerText.length < 10) {
    return 'en';
  }

  const detectedLang = detectLanguageByPatterns(customerText);

  logger.debug('Language detected from transcript', {
    detected: detectedLang,
    textLength: customerText.length,
    sampleText: customerText.substring(0, 50),
  });

  return detectedLang;
}

/**
 * Fallback pattern-based language detection.
 * Used when lingua-node is unavailable or fails.
 */
function detectLanguageByPatterns(text: string): string {
  const lowerText = text.toLowerCase();

  // Language patterns with common phrases and unique characters
  const languagePatterns: Array<{ code: string; patterns: RegExp[] }> = [
    { code: 'es', patterns: [/hola/i, /gracias/i, /buenos/i, /por favor/i, /reservaci[oó]n/i, /¿/] },
    { code: 'fr', patterns: [/bonjour/i, /merci/i, /s'il vous/i, /réservation/i, /ç/] },
    { code: 'de', patterns: [/guten/i, /danke/i, /bitte/i, /reservierung/i, /ß/, /ü/] },
    { code: 'it', patterns: [/ciao/i, /grazie/i, /per favore/i, /prenotazione/i, /buon/i] },
    { code: 'pt', patterns: [/olá/i, /obrigado/i, /por favor/i, /reserva/i, /ã/, /ç/] },
    { code: 'zh', patterns: [/[\u4e00-\u9fff]/] }, // Chinese characters
    { code: 'ja', patterns: [/[\u3040-\u309f]/, /[\u30a0-\u30ff]/] }, // Hiragana, Katakana
    { code: 'ko', patterns: [/[\uac00-\ud7af]/] }, // Korean Hangul
    { code: 'ar', patterns: [/[\u0600-\u06ff]/] }, // Arabic
    { code: 'ru', patterns: [/[\u0400-\u04ff]/] }, // Cyrillic
    { code: 'hi', patterns: [/[\u0900-\u097f]/] }, // Devanagari
  ];

  for (const { code, patterns } of languagePatterns) {
    if (patterns.some((p) => p.test(lowerText))) {
      return code;
    }
  }

  return 'en';
}

/**
 * Save or update call log in database.
 */
async function saveCallLog(data: CallLogData): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('call_logs')
    .upsert(
      {
        call_id: data.callId,
        assistant_id: data.assistantId,
        restaurant_id: data.restaurantId,
        phone_number: data.phoneNumber,
        caller_phone: data.customerPhone || data.phoneNumber,
        direction: data.direction || 'inbound',
        status: data.status || 'in-progress',
        started_at: data.startedAt || new Date().toISOString(),
        ended_at: data.endedAt,
        duration_seconds: data.durationSeconds,
        transcript: data.transcript || [],
        summary: data.summary,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        sentiment: data.sentiment,
        intent: data.intent,
        reservation_id: data.reservationId,
        order_id: data.orderId,
        recording_url: data.recordingUrl,
        language_detected: data.languageDetected,
      },
      { onConflict: 'call_id' }
    );

  if (error) {
    logger.error('Failed to save call log', { error, callId: data.callId, restaurantId: data.restaurantId });
  }
}

// ============================================================
// WEBHOOK HANDLER
// ============================================================

interface VapiWebhookPayload {
  message: {
    type: string;
    call?: {
      id: string;
      assistantId?: string;
      phoneNumber?: { id?: string; number: string };
      customer?: { number: string; name?: string };
      startedAt?: string;
      endedAt?: string;
      status?: string;
    };
    toolCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
    toolCallList?: Array<{
      name: string;
      parameters: Record<string, unknown>;
    }>;
    transcript?: Array<{ role: string; content: string; timestamp?: string }>;
    summary?: string;
    recordingUrl?: string;
    artifact?: {
      recordingUrl?: string;
    };
    analysis?: {
      sentiment?: string;
      intent?: string;
    };
    assistant?: {
      metadata?: {
        restaurantId?: string;
      };
    };
  };
}

// ============================================================
// TELEPHONY BRIDGE: Lookup restaurant by Vapi phone number ID
// ============================================================

/**
 * Find restaurant by Vapi phone number ID.
 * This is the primary method for the telephony bridge - when a call comes in,
 * Vapi sends the phoneNumberId, and we lookup which restaurant owns that number.
 */
async function findRestaurantByPhoneNumberId(phoneNumberId: string): Promise<{
  id: string;
  name: string;
  phone: string | null;
  address: { city?: string; street?: string } | null;
  settings: RestaurantSettings;
  description: string | null;
} | null> {
  const supabase = getSupabase();

  // Query restaurants where settings.voice.vapiPhoneNumberId matches
  const { data: restaurants, error } = await supabase
    .from('restaurants')
    .select('id, name, phone, address, settings, description')
    .filter('settings->voice->>vapiPhoneNumberId', 'eq', phoneNumberId)
    .limit(1);

  if (error) {
    logger.error('Failed to lookup restaurant by phoneNumberId', { error, phoneNumberId });
    return null;
  }

  if (!restaurants || restaurants.length === 0) {
    logger.warn('No restaurant found for phoneNumberId', { phoneNumberId });
    return null;
  }

  const restaurant = restaurants[0];
  return {
    id: restaurant.id,
    name: restaurant.name,
    phone: restaurant.phone,
    address: restaurant.address as { city?: string; street?: string } | null,
    settings: (restaurant.settings || {}) as unknown as RestaurantSettings,
    description: restaurant.description,
  };
}

/**
 * Build a fallback assistant configuration for unknown phone numbers.
 * This ensures the AI stays polite and helpful even if we can't identify the restaurant.
 */
function buildFallbackAssistant() {
  return {
    assistant: {
      name: 'Restaurant Assistant',
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        systemPrompt: `You are a helpful restaurant assistant. Unfortunately, we're having trouble identifying which restaurant this call is for.

## Your Response
- Apologize politely for the technical difficulty
- Ask the caller to try calling back in a moment
- If they have an urgent reservation or question, offer to take a message

## Guidelines
- Be warm, professional, and apologetic
- Keep your responses brief and natural
- Use conversational fillers like "I'm so sorry about this..." or "Let me see..."

Example: "Hi there! I apologize, but I'm having a small technical hiccup on my end. Could you give me just a moment and try calling back? I'll make sure to help you right away. Thank you so much for your patience!"`,
        temperature: 0.7,
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah - warm, conversational
        model: 'eleven_turbo_v2_5', // Lowest latency model
        stability: 0.5, // Natural variation in speech
        similarityBoost: 0.75, // Maintain voice consistency
        style: 0, // Most natural conversational style
        useSpeakerBoost: true, // Enhanced clarity
        optimizeStreamingLatency: 4, // Maximum latency optimization
        fillerInjectionEnabled: true, // Natural "um", "ah" fillers
      },
      firstMessage: "Hi there! I apologize, but I'm experiencing a small technical issue. Could you try calling back in just a moment? Thank you so much for your patience!",
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
      },
    },
  };
}

/**
 * Build a dynamic first message based on restaurant name, language, and custom greeting.
 * Creates natural, warm greetings appropriate for each language.
 */
function buildDynamicFirstMessage(
  restaurantName: string,
  language: string,
  customGreeting?: string
): string {
  // If owner provided a custom greeting, use it (with restaurant name substitution)
  if (customGreeting && customGreeting.trim()) {
    return customGreeting.replace(/\[restaurant\]/gi, restaurantName);
  }

  // Language-specific greetings with warm, professional tone
  const greetings: Record<string, string> = {
    en: `Hi! Thanks for calling ${restaurantName}. How can I help you today?`,
    es: `¡Hola! Gracias por llamar a ${restaurantName}. ¿En qué puedo ayudarle hoy?`,
    fr: `Bonjour! Merci d'avoir appelé ${restaurantName}. Comment puis-je vous aider?`,
    de: `Guten Tag! Vielen Dank für Ihren Anruf bei ${restaurantName}. Wie kann ich Ihnen helfen?`,
    it: `Buongiorno! Grazie per aver chiamato ${restaurantName}. Come posso aiutarla oggi?`,
    pt: `Olá! Obrigado por ligar para ${restaurantName}. Como posso ajudá-lo hoje?`,
    zh: `您好！感谢您致电${restaurantName}。今天我能为您做些什么？`,
    ja: `お電話ありがとうございます。${restaurantName}でございます。本日はどのようなご用件でしょうか？`,
    ko: `안녕하세요! ${restaurantName}에 전화해 주셔서 감사합니다. 무엇을 도와드릴까요?`,
    ar: `مرحباً! شكراً لاتصالك بـ ${restaurantName}. كيف يمكنني مساعدتك اليوم؟`,
    hi: `नमस्ते! ${restaurantName} को कॉल करने के लिए धन्यवाद। मैं आज आपकी कैसे मदद कर सकता हूं?`,
    ru: `Здравствуйте! Спасибо, что позвонили в ${restaurantName}. Чем могу помочь?`,
  };

  return greetings[language] || greetings.en;
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify request is from Vapi
    if (!verifyVapiRequest(request)) {
      logger.warn('Unauthorized Vapi webhook request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as VapiWebhookPayload;
    const { message } = payload;

    logger.debug('Vapi webhook received', { type: message.type });

    // Extract restaurant ID from assistant metadata or query params
    const restaurantId = message.assistant?.metadata?.restaurantId ||
      request.nextUrl.searchParams.get('restaurantId');

    switch (message.type) {
      // --------------------------------------------------------
      // TOOL CALL EVENT
      // --------------------------------------------------------
      case 'tool-call': {
        if (!restaurantId) {
          return NextResponse.json(
            { error: 'Restaurant ID not found in assistant metadata' },
            { status: 400 }
          );
        }

        const toolCall = message.toolCall;
        if (!toolCall) {
          return NextResponse.json({ error: 'No tool call data' }, { status: 400 });
        }

        const result = await handleToolCall({
          restaurantId,
          toolName: toolCall.name,
          args: toolCall.parameters,
        });

        return NextResponse.json({
          results: [{ result: result.result }],
        });
      }

      // --------------------------------------------------------
      // TOOL CALLS (BATCH)
      // --------------------------------------------------------
      case 'tool-calls': {
        if (!restaurantId) {
          return NextResponse.json(
            { error: 'Restaurant ID not found in assistant metadata' },
            { status: 400 }
          );
        }

        const toolCalls = message.toolCallList || [];
        const results = await Promise.all(
          toolCalls.map((tc) =>
            handleToolCall({
              restaurantId,
              toolName: tc.name,
              args: tc.parameters,
            })
          )
        );

        return NextResponse.json({
          results: results.map((r) => ({ result: r.result })),
        });
      }

      // --------------------------------------------------------
      // CALL STARTED - Create active call log for live monitoring
      // --------------------------------------------------------
      case 'call-start':
      case 'call.started': {
        const call = message.call;
        if (call && restaurantId) {
          logger.info('Call started', { callId: call.id, restaurantId });
          await saveCallLog({
            callId: call.id,
            assistantId: call.assistantId,
            restaurantId,
            phoneNumber: call.customer?.number,
            customerPhone: call.customer?.number,
            direction: 'inbound',
            status: 'active',
            startedAt: call.startedAt || new Date().toISOString(),
          });
        }
        return NextResponse.json({ received: true });
      }

      // --------------------------------------------------------
      // STATUS UPDATE - Track call status changes
      // --------------------------------------------------------
      case 'status-update': {
        const call = message.call;
        if (call && restaurantId) {
          // Map Vapi status to our status
          let status: CallLogData['status'] = 'in-progress';
          if (call.status === 'ringing') status = 'ringing';
          else if (call.status === 'in-progress' || call.status === 'active') status = 'active';
          else if (call.status === 'ended' || call.status === 'completed') status = 'completed';
          else if (call.status === 'failed') status = 'failed';
          else if (call.status === 'no-answer') status = 'no-answer';

          await saveCallLog({
            callId: call.id,
            assistantId: call.assistantId,
            restaurantId,
            phoneNumber: call.customer?.number,
            customerPhone: call.customer?.number,
            direction: 'inbound',
            status,
            startedAt: call.startedAt,
            endedAt: call.endedAt,
          });
        }
        return NextResponse.json({ received: true });
      }

      // --------------------------------------------------------
      // END OF CALL REPORT - Complete call with all data
      // --------------------------------------------------------
      case 'end-of-call-report': {
        const call = message.call;
        if (call && restaurantId) {
          // Extract recording URL from various possible locations
          const recordingUrl = message.recordingUrl ||
            message.artifact?.recordingUrl ||
            undefined;

          // Detect language from transcript (customer messages)
          const languageDetected = detectLanguageFromTranscript(message.transcript);

          // Calculate call duration in seconds and minutes
          let durationSeconds: number | undefined;
          let durationMinutes = 0;

          if (call.startedAt && call.endedAt) {
            durationSeconds = Math.floor(
              (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
            );
            // Round up to nearest minute for billing
            durationMinutes = Math.ceil(durationSeconds / 60);
          }

          logger.info('Call ended', {
            callId: call.id,
            restaurantId,
            durationSeconds,
            durationMinutes,
            languageDetected,
          });

          // IMPORTANT: Save call log first, then track billing separately
          // This ensures transcript/recording is saved even if billing fails
          let callLogSaved = false;
          try {
            await saveCallLog({
              callId: call.id,
              assistantId: call.assistantId,
              restaurantId,
              phoneNumber: call.customer?.number,
              customerName: call.customer?.name,
              customerPhone: call.customer?.number,
              direction: 'inbound',
              status: 'completed',
              startedAt: call.startedAt,
              endedAt: call.endedAt,
              durationSeconds,
              transcript: message.transcript,
              summary: message.summary,
              sentiment: message.analysis?.sentiment as 'positive' | 'neutral' | 'negative' | undefined,
              intent: message.analysis?.intent,
              recordingUrl,
              languageDetected,
            });
            callLogSaved = true;
          } catch (error) {
            logger.error('Failed to save call log', { error, callId: call.id, restaurantId });
          }

          // Track voice minutes usage for billing (independent of call log save)
          // Only track if we have a valid duration
          if (durationMinutes > 0) {
            let orgId: string | null = null;
            try {
              orgId = await getRestaurantOrganizationId(restaurantId);
              if (orgId) {
                const result = await incrementVoiceMinutes(orgId, durationMinutes);
                logger.info('Voice minutes tracked', {
                  organizationId: orgId,
                  minutes: durationMinutes,
                  status: result.status,
                  alert: result.alert?.type,
                  callLogSaved,
                });

                // If account is blocked due to overage, log to billing_alerts
                if (result.status === 'blocked') {
                  logger.warn('Organization voice minutes exceeded', { organizationId: orgId });
                  try {
                    const supabase = getSupabase();
                    const { error: alertError } = await supabase.from('billing_alerts').insert({
                      organization_id: orgId,
                      alert_type: 'voice_limit_exceeded',
                      severity: 'error',
                      title: 'Voice Minute Limit Exceeded',
                      message: `Your organization has exceeded the voice minute limit. New calls may be affected until you upgrade or purchase more minutes.`,
                      metadata: {
                        minutes_used: durationMinutes,
                        call_id: call.id,
                        restaurant_id: restaurantId,
                      },
                    });
                    if (alertError) {
                      logger.error('Failed to create billing alert', { error: alertError });
                    }
                  } catch (err) {
                    logger.error('Failed to create billing alert', { error: err });
                  }
                }
              }
            } catch (error) {
              // Billing failure should NOT prevent returning success
              // The call data is more important than billing tracking
              logger.error('Failed to track voice minutes', { error, restaurantId, durationMinutes });

              // Log failure to billing_alerts for dashboard visibility
              if (orgId) {
                try {
                  const supabase = getSupabase();
                  const { error: alertError } = await supabase.from('billing_alerts').insert({
                    organization_id: orgId,
                    alert_type: 'voice_tracking_failed',
                    severity: 'warning',
                    title: 'Voice Minute Tracking Failed',
                    message: `Failed to track ${durationMinutes} voice minutes for a call. This may affect your billing accuracy.`,
                    metadata: {
                      error: error instanceof Error ? error.message : String(error),
                      minutes: durationMinutes,
                      call_id: call.id,
                      restaurant_id: restaurantId,
                    },
                  });
                  if (alertError) {
                    logger.error('Failed to create billing alert for tracking failure', { error: alertError });
                  }
                } catch (err) {
                  logger.error('Failed to create billing alert for tracking failure', { error: err });
                }
              }
            }
          }
        }
        return NextResponse.json({ received: true });
      }

      // --------------------------------------------------------
      // ASSISTANT REQUEST (Dynamic assistant configuration)
      // Telephony Bridge: Lookup restaurant by phoneNumberId first
      // --------------------------------------------------------
      case 'assistant-request': {
        // TELEPHONY BRIDGE: Extract phoneNumberId from Vapi payload
        const phoneNumberId = message.call?.phoneNumber?.id;

        let restaurant: {
          id: string;
          name: string;
          phone: string | null;
          address: { city?: string; street?: string } | null;
          settings: RestaurantSettings;
          description: string | null;
        } | null = null;

        // PRIMARY: Lookup by phoneNumberId (the telephony bridge)
        if (phoneNumberId) {
          logger.debug('Assistant request: looking up by phoneNumberId', { phoneNumberId });
          restaurant = await findRestaurantByPhoneNumberId(phoneNumberId);
        }

        // FALLBACK: Use restaurantId from metadata or query params
        if (!restaurant && restaurantId) {
          logger.debug('Assistant request: falling back to restaurantId', { restaurantId });
          const supabase = getSupabase();
          const { data } = await supabase
            .from('restaurants')
            .select('id, name, phone, address, settings, description')
            .eq('id', restaurantId)
            .single();

          if (data) {
            restaurant = {
              id: data.id,
              name: data.name,
              phone: data.phone,
              address: data.address as { city?: string; street?: string } | null,
              settings: (data.settings || {}) as unknown as RestaurantSettings,
              description: data.description,
            };
          }
        }

        // SECURITY: If no restaurant found, return fallback assistant
        if (!restaurant) {
          logger.warn('Assistant request: no restaurant found, returning fallback', {
            phoneNumberId,
            restaurantId,
          });
          return NextResponse.json(buildFallbackAssistant());
        }

        // Successfully identified restaurant via telephony bridge
        logger.info('Assistant request: restaurant identified', {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          phoneNumberId,
        });

        const settings = restaurant.settings;
        const voiceSettings = settings.voice;
        const aiSettings = settings.ai;

        // Build the humanistic system prompt
        const systemPrompt = buildVoiceSystemPrompt({
          restaurantName: restaurant.name,
          restaurantPhone: restaurant.phone || undefined,
          city: restaurant.address?.city,
          allowReservations: aiSettings?.allowReservations ?? false,
          allowOrders: aiSettings?.allowOrders ?? false,
          personality: aiSettings?.personality,
          customInstructions: aiSettings?.customInstructions,
          ownerNotes: restaurant.description || undefined,
        });

        // Build dynamic first message based on settings
        const primaryLanguage = voiceSettings?.primaryLanguage || 'en';
        const customGreeting = aiSettings?.greeting;
        const firstMessage = buildDynamicFirstMessage(
          restaurant.name,
          primaryLanguage,
          customGreeting
        );

        return NextResponse.json({
          assistant: {
            name: restaurant.name + ' Assistant',
            model: {
              provider: 'anthropic',
              model: 'claude-sonnet-4-20250514',
              systemPrompt,
              temperature: 0.7,
            },
            voice: {
              // ElevenLabs Voice Configuration - Optimized for natural conversation
              provider: 'elevenlabs',
              voiceId: voiceSettings?.elevenLabsVoiceId || 'EXAVITQu4vr4xnSDxMaL',
              // Use multilingual model for language switching, turbo for English-only
              model: primaryLanguage === 'en' ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2',
              // Humanistic parameters
              stability: 0.5, // Allow natural speech variation
              similarityBoost: 0.75, // Maintain voice identity while allowing expression
              style: 0, // Natural conversational style (0 = most natural)
              useSpeakerBoost: true, // Enhanced clarity for phone calls
              // Latency optimization
              optimizeStreamingLatency: 4, // Maximum optimization (0-4 scale)
              // Natural speech features
              fillerInjectionEnabled: true, // Enable natural "um", "ah", breath sounds
            },
            firstMessage,
            transcriber: {
              provider: 'deepgram',
              model: 'nova-2',
              language: primaryLanguage,
            },
            tools: VAPI_TOOLS,
            metadata: {
              restaurantId: restaurant.id,
            },
          },
        });
      }

      // --------------------------------------------------------
      // DEFAULT
      // --------------------------------------------------------
      default:
        logger.debug('Unhandled Vapi event type', { type: message.type });
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    logger.error('Vapi webhook error', { error });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handle GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'Vapi webhook endpoint active' });
}
