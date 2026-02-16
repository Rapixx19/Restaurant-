import Anthropic from '@anthropic-ai/sdk';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { getPricingTier } from '@/modules/landing/constants/pricing';
import { AI_TOOLS, type ToolName } from './tools';
import {
  checkAvailability,
  bookReservation,
  formatConfirmation,
} from '@/lib/reservations/availability';
import type { Restaurant, MenuItem, MenuCategory } from '@/lib/database.types';
import type { RestaurantSettings, TierId, OperatingHours, DayOfWeek } from '@/modules/settings/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ChatContext {
  restaurant: Restaurant;
  settings: RestaurantSettings;
  menuItems: MenuItem[];
  categories: MenuCategory[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

/**
 * Build the system prompt based on restaurant settings and personality.
 */
function buildSystemPrompt(context: ChatContext): string {
  const { restaurant, settings, menuItems, categories } = context;
  const address = restaurant.address as { street?: string; city?: string; state?: string; zip?: string; country?: string } | null;

  // Personality mapping
  const personalityTraits: Record<string, string> = {
    friendly: 'warm, welcoming, and conversational. Use casual language and be enthusiastic about the restaurant.',
    formal: 'professional, courteous, and precise. Use formal language and maintain a refined tone.',
    efficient: 'helpful, direct, and concise. Focus on answering questions quickly without unnecessary small talk.',
  };

  const personality = personalityTraits[settings.ai?.personality || 'friendly'];

  // Build menu summary
  const menuSummary = categories.map((cat) => {
    const catItems = menuItems.filter((item) => item.category_id === cat.id && item.is_available);
    if (catItems.length === 0) return null;
    return `${cat.name}: ${catItems.map((i) => i.name).join(', ')}`;
  }).filter(Boolean).join('\n');

  // Build dietary options summary
  const dietaryOptions = new Set<string>();
  menuItems.forEach((item) => {
    item.dietary_tags.forEach((tag) => dietaryOptions.add(tag));
  });

  const systemPrompt = `You are the AI assistant for ${restaurant.name}, a restaurant${address?.city ? ` located in ${address.city}` : ''}.

## Your Personality
Be ${personality}

## Restaurant Information
- Name: ${restaurant.name}
- Phone: ${restaurant.phone || 'Not available'}
- Email: ${restaurant.email || 'Not available'}
- Address: ${address ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim() : 'Not available'}
- Timezone: ${restaurant.timezone}

## Capabilities
${settings.ai?.allowReservations ? '- You CAN make reservations directly. Use the check_availability tool first, then collect customer name and phone, then use book_table to confirm.' : '- Reservations are handled by phone only'}
${settings.ai?.allowOrders ? '- You CAN help with orders (but cannot actually place them yet - inform customers to call)' : '- Orders are handled by phone only'}

## Menu Overview
The restaurant has ${menuItems.length} menu items across ${categories.length} categories.
${menuSummary}

## Dietary Options Available
${dietaryOptions.size > 0 ? Array.from(dietaryOptions).join(', ') : 'No specific dietary tags set'}

## Custom Instructions from Restaurant Owner
${settings.ai?.customInstructions || 'None provided'}

## Guidelines
1. Always be helpful and accurate about menu items and restaurant information
2. Use the provided tools to look up specific information when needed
3. If you don't know something, say so honestly
4. Keep responses concise but informative
5. For reservations: ALWAYS use check_availability first, then collect name and phone, then use book_table
6. Never make up information about prices, ingredients, or availability
7. Be aware of dietary restrictions and allergens - this is important for customer safety
8. When suggesting reservation times, use 24-hour format internally but display times in 12-hour format to customers`;

  return systemPrompt;
}

/**
 * Execute a tool call and return the result.
 */
async function executeToolCall(
  toolName: ToolName,
  toolInput: Record<string, unknown>,
  context: ChatContext
): Promise<string> {
  const { restaurant, settings, menuItems, categories } = context;

  switch (toolName) {
    case 'get_menu_items': {
      const searchTerm = (toolInput.search_term as string)?.toLowerCase();
      const dietaryTags = toolInput.dietary_tags as string[] || [];
      const categoryName = (toolInput.category_name as string)?.toLowerCase();
      const availableOnly = toolInput.available_only !== false;

      let results = menuItems;

      // Filter by availability
      if (availableOnly) {
        results = results.filter((item) => item.is_available);
      }

      // Filter by category
      if (categoryName) {
        const category = categories.find((c) => c.name.toLowerCase().includes(categoryName));
        if (category) {
          results = results.filter((item) => item.category_id === category.id);
        }
      }

      // Filter by dietary tags
      if (dietaryTags.length > 0) {
        results = results.filter((item) =>
          dietaryTags.some((tag) =>
            item.dietary_tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
          )
        );
      }

      // Filter by search term
      if (searchTerm) {
        results = results.filter((item) =>
          item.name.toLowerCase().includes(searchTerm) ||
          item.description?.toLowerCase().includes(searchTerm)
        );
      }

      if (results.length === 0) {
        return 'No menu items found matching your criteria.';
      }

      const formatted = results.slice(0, 10).map((item) => {
        const category = categories.find((c) => c.id === item.category_id);
        return `- ${item.name} ($${item.price.toFixed(2)})${category ? ` [${category.name}]` : ''}${item.dietary_tags.length > 0 ? ` - ${item.dietary_tags.join(', ')}` : ''}${item.description ? `: ${item.description}` : ''}`;
      }).join('\n');

      return `Found ${results.length} item(s):\n${formatted}${results.length > 10 ? `\n... and ${results.length - 10} more items` : ''}`;
    }

    case 'get_menu_item_details': {
      const itemName = (toolInput.item_name as string)?.toLowerCase();
      const item = menuItems.find((i) => i.name.toLowerCase().includes(itemName));

      if (!item) {
        return `No menu item found with name "${toolInput.item_name}"`;
      }

      const category = categories.find((c) => c.id === item.category_id);
      return `**${item.name}** - $${item.price.toFixed(2)}
Category: ${category?.name || 'Uncategorized'}
${item.description ? `Description: ${item.description}` : ''}
Availability: ${item.is_available ? 'Available' : 'Currently unavailable'}
${item.dietary_tags.length > 0 ? `Dietary: ${item.dietary_tags.join(', ')}` : ''}
${item.allergens.length > 0 ? `Contains allergens: ${item.allergens.join(', ')}` : 'No allergen information'}
${item.is_featured ? '⭐ Featured item' : ''}`;
    }

    case 'check_opening_hours': {
      const operatingHours = settings.capacity?.operatingHours;
      if (!operatingHours) {
        return 'Operating hours information is not available.';
      }

      const dayInput = (toolInput.day as string)?.toLowerCase() || 'today';
      let day: DayOfWeek;

      if (dayInput === 'today') {
        const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        day = days[new Date().getDay()];
      } else {
        day = dayInput as DayOfWeek;
      }

      const hours = operatingHours[day];
      if (!hours) {
        return `No hours information available for ${day}.`;
      }

      if (hours.closed) {
        return `The restaurant is closed on ${day.charAt(0).toUpperCase() + day.slice(1)}.`;
      }

      // Check if currently open (only if checking today)
      if (dayInput === 'today') {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const isOpen = currentTime >= hours.open && currentTime <= hours.close;
        return `Today (${day.charAt(0).toUpperCase() + day.slice(1)}): ${hours.open} - ${hours.close}. The restaurant is currently ${isOpen ? 'OPEN' : 'CLOSED'}.`;
      }

      return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.open} - ${hours.close}`;
    }

    case 'get_restaurant_info': {
      const address = restaurant.address as { street?: string; city?: string; state?: string; zip?: string; country?: string } | null;
      return `**${restaurant.name}**
Phone: ${restaurant.phone || 'Not available'}
Email: ${restaurant.email || 'Not available'}
Address: ${address ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim() : 'Not available'}
Website: ${restaurant.website || 'Not available'}`;
    }

    case 'check_availability': {
      if (!settings.ai?.allowReservations) {
        return 'Online reservations are not available. Please call the restaurant directly to make a reservation.';
      }

      const date = toolInput.date as string;
      const time = toolInput.time as string;
      const partySize = toolInput.party_size as number;

      const result = await checkAvailability(restaurant.id, date, time, partySize);

      if (result.available) {
        // Format time for display
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        const displayTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;

        // Format date for display
        const dateObj = new Date(date + 'T12:00:00');
        const displayDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });

        return `Great news! A table for ${partySize} is available on ${displayDate} at ${displayTime}. To complete the reservation, I'll need the name and phone number for the booking.`;
      } else {
        let response = result.reason || 'Sorry, that time slot is not available.';
        if (result.suggestedTimes && result.suggestedTimes.length > 0) {
          const formattedTimes = result.suggestedTimes.map((t) => {
            const [h, m] = t.split(':').map(Number);
            const p = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m.toString().padStart(2, '0')} ${p}`;
          });
          response += ` However, these times are available: ${formattedTimes.join(', ')}.`;
        }
        return response;
      }
    }

    case 'book_table': {
      if (!settings.ai?.allowReservations) {
        return 'Online reservations are not available. Please call the restaurant directly to make a reservation.';
      }

      const customerName = toolInput.customer_name as string;
      const customerPhone = toolInput.customer_phone as string;
      const customerEmail = toolInput.customer_email as string | undefined;
      const date = toolInput.date as string;
      const time = toolInput.time as string;
      const partySize = toolInput.party_size as number;
      const specialRequests = toolInput.special_requests as string | undefined;

      const result = await bookReservation({
        restaurantId: restaurant.id,
        customerName,
        customerPhone,
        customerEmail,
        partySize,
        date,
        time,
        specialRequests,
        source: 'ai',
      });

      if (result.success) {
        return formatConfirmation(customerName, date, time, partySize);
      } else {
        return result.error || 'Sorry, there was an issue booking your reservation. Please try again or call us directly.';
      }
    }

    default:
      return 'Unknown tool';
  }
}

/**
 * Check if the restaurant has exceeded their chat message limit.
 */
export async function checkUsageLimit(
  restaurantId: string,
  settings: RestaurantSettings | null
): Promise<{ allowed: boolean; message?: string }> {
  const tierId: TierId = settings?.tier || 'free';
  const tier = getPricingTier(tierId);

  if (!tier) {
    return { allowed: true };
  }

  const limit = tier.limits.chatMessages;
  if (limit === 'unlimited') {
    return { allowed: true };
  }

  // Create anon client for usage check (works in API routes)
  const supabase = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Count messages this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', restaurantId)
    .gte('created_at', startOfMonth);

  const currentCount = count || 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      message: "Our online assistant is resting. Please call us directly! We'd love to hear from you.",
    };
  }

  return { allowed: true };
}

/**
 * Main chat function that processes messages and returns AI responses.
 */
export async function processChat(
  restaurantId: string,
  sessionId: string,
  messages: ChatMessage[],
  newMessage: string
): Promise<{ response: string; error?: string }> {
  try {
    // Create anon client for public API access
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch restaurant data
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return { response: '', error: 'Restaurant not found' };
    }

    const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;

    // Check usage limit
    const usageCheck = await checkUsageLimit(restaurantId, settings);
    if (!usageCheck.allowed) {
      return { response: usageCheck.message || 'Usage limit reached', error: 'USAGE_LIMIT' };
    }

    // Fetch menu data
    const [categoriesResult, itemsResult] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order'),
    ]);

    const context: ChatContext = {
      restaurant: restaurant as Restaurant,
      settings,
      menuItems: (itemsResult.data || []) as MenuItem[],
      categories: (categoriesResult.data || []) as MenuCategory[],
    };

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Build message history for Claude
    const claudeMessages: Anthropic.MessageParam[] = [
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: newMessage },
    ];

    // Call Claude with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools: AI_TOOLS,
      messages: claudeMessages,
    });

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      const toolResults: ToolResult[] = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await executeToolCall(
            toolUse.name as ToolName,
            toolUse.input as Record<string, unknown>,
            context
          );
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        })
      );

      // Continue conversation with tool results
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        tools: AI_TOOLS,
        messages: [
          ...claudeMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      });
    }

    // Extract text response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );

    const assistantResponse = textBlock?.text || "I'm sorry, I couldn't process that request.";

    // Store messages in database
    await Promise.all([
      supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: newMessage,
        metadata: {},
      }),
      supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantResponse,
        metadata: {},
      }),
    ]);

    return { response: assistantResponse };
  } catch (error) {
    console.error('Chat processing error:', error);
    return {
      response: '',
      error: 'Failed to process your message. Please try again.',
    };
  }
}

/**
 * Create a new chat session for a restaurant.
 */
export async function createChatSession(
  restaurantId: string
): Promise<{ sessionId: string; greeting: string; error?: string }> {
  try {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch restaurant and settings
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return { sessionId: '', greeting: '', error: 'Restaurant not found' };
    }

    const settings = (restaurant.settings || {}) as unknown as RestaurantSettings;

    // Check usage limit before creating session
    const usageCheck = await checkUsageLimit(restaurantId, settings);
    if (!usageCheck.allowed) {
      return {
        sessionId: '',
        greeting: usageCheck.message || 'Usage limit reached',
        error: 'USAGE_LIMIT',
      };
    }

    // Generate session token
    const sessionToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create chat session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        restaurant_id: restaurantId,
        session_token: sessionToken,
        status: 'active',
        source: 'widget',
        metadata: {},
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError);
      return { sessionId: '', greeting: '', error: 'Failed to create session' };
    }

    // Get greeting
    const greeting = settings.ai?.greeting || `Welcome to ${restaurant.name}! How can I help you today?`;

    return { sessionId: session.id, greeting };
  } catch (error) {
    console.error('Create session error:', error);
    return { sessionId: '', greeting: '', error: 'Failed to create session' };
  }
}
