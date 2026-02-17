/**
 * Vapi Tool Definitions
 *
 * These tools are exposed to the Vapi voice assistant and map to our
 * existing restaurant service functions.
 *
 * Format: Vapi uses a specific JSON schema format for tool definitions.
 * See: https://docs.vapi.ai/tools
 */

export interface VapiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        items?: { type: string };
      }>;
      required: string[];
    };
  };
  async?: boolean;
  server?: {
    url: string;
  };
}

/**
 * Vapi tool for checking table availability.
 * Maps to: lib/reservations/availability.ts -> checkAvailability()
 */
export const checkAvailabilityTool: VapiToolDefinition = {
  type: 'function',
  function: {
    name: 'check_availability',
    description: 'Check if a table is available for a reservation. Always use this before attempting to book a table. Returns availability status and alternative times if the requested slot is full.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date for the reservation in YYYY-MM-DD format. For example, 2024-03-15 for March 15th, 2024.',
        },
        time: {
          type: 'string',
          description: 'The time for the reservation in HH:mm 24-hour format. For example, 19:00 for 7 PM or 12:30 for 12:30 PM.',
        },
        party_size: {
          type: 'number',
          description: 'The number of guests in the party. Must be between 1 and 50.',
        },
      },
      required: ['date', 'time', 'party_size'],
    },
  },
  async: true,
};

/**
 * Vapi tool for booking a table.
 * Maps to: lib/reservations/availability.ts -> bookReservation()
 */
export const bookTableTool: VapiToolDefinition = {
  type: 'function',
  function: {
    name: 'book_table',
    description: 'Book a table reservation after confirming availability. Requires customer name and phone number. Only call this after check_availability confirms the slot is available.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: {
          type: 'string',
          description: 'The full name for the reservation.',
        },
        customer_phone: {
          type: 'string',
          description: 'The phone number to contact for the reservation.',
        },
        date: {
          type: 'string',
          description: 'The reservation date in YYYY-MM-DD format.',
        },
        time: {
          type: 'string',
          description: 'The reservation time in HH:mm 24-hour format.',
        },
        party_size: {
          type: 'number',
          description: 'The number of guests.',
        },
        special_requests: {
          type: 'string',
          description: 'Any special requests like dietary restrictions or celebration notes.',
        },
      },
      required: ['customer_name', 'customer_phone', 'date', 'time', 'party_size'],
    },
  },
  async: true,
};

/**
 * Vapi tool for getting menu item details.
 * Maps to: lib/ai/engine.ts -> get_menu_item_details case
 */
export const getMenuItemDetailsTool: VapiToolDefinition = {
  type: 'function',
  function: {
    name: 'get_menu_item_details',
    description: 'Get detailed information about a specific menu item including price, description, allergens, and dietary tags. Use when a caller asks about a specific dish.',
    parameters: {
      type: 'object',
      properties: {
        item_name: {
          type: 'string',
          description: 'The name of the menu item to look up.',
        },
      },
      required: ['item_name'],
    },
  },
  async: true,
};

/**
 * Vapi tool for searching menu items.
 * Maps to: lib/ai/engine.ts -> get_menu_items case
 */
export const getMenuItemsTool: VapiToolDefinition = {
  type: 'function',
  function: {
    name: 'get_menu_items',
    description: 'Search and browse menu items. Can filter by dietary requirements or category. Use when callers ask general questions about the menu or dietary options.',
    parameters: {
      type: 'object',
      properties: {
        search_term: {
          type: 'string',
          description: 'A search term to find items by name or description.',
        },
        dietary_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by dietary tags like vegan, gluten-free, or spicy.',
        },
        category_name: {
          type: 'string',
          description: 'Filter by menu category like appetizers, entrees, or desserts.',
        },
      },
      required: [],
    },
  },
  async: true,
};

/**
 * Vapi tool for getting restaurant information.
 * Maps to: lib/ai/engine.ts -> get_restaurant_info case
 */
export const getRestaurantInfoTool: VapiToolDefinition = {
  type: 'function',
  function: {
    name: 'get_restaurant_info',
    description: 'Get restaurant contact information including address, phone number, and email.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  async: true,
};

/**
 * Vapi tool for checking opening hours.
 * Maps to: lib/ai/engine.ts -> check_opening_hours case
 */
export const checkOpeningHoursTool: VapiToolDefinition = {
  type: 'function',
  function: {
    name: 'check_opening_hours',
    description: 'Check if the restaurant is currently open or get hours for a specific day.',
    parameters: {
      type: 'object',
      properties: {
        day: {
          type: 'string',
          description: 'The day to check. Use "today" for current day.',
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'today'],
        },
      },
      required: [],
    },
  },
  async: true,
};

/**
 * All Vapi tools bundled for voice assistant configuration.
 */
export const VAPI_TOOLS: VapiToolDefinition[] = [
  checkAvailabilityTool,
  bookTableTool,
  getMenuItemDetailsTool,
  getMenuItemsTool,
  getRestaurantInfoTool,
  checkOpeningHoursTool,
];

/**
 * Get Vapi tools with server URL configured.
 */
export function getVapiToolsWithServer(webhookUrl: string): VapiToolDefinition[] {
  return VAPI_TOOLS.map((tool) => ({
    ...tool,
    server: {
      url: webhookUrl,
    },
  }));
}

/**
 * Tool name type for type safety.
 */
export type VapiToolName =
  | 'check_availability'
  | 'book_table'
  | 'get_menu_item_details'
  | 'get_menu_items'
  | 'get_restaurant_info'
  | 'check_opening_hours';

/**
 * Voice-optimized system prompt for Vapi.
 * Designed for natural, humanistic phone conversations.
 *
 * Key principles:
 * - Use natural conversational fillers
 * - Keep responses concise (2 sentences max)
 * - Warm yet professional restaurant host persona
 * - Dynamic based on restaurant's settings and personality
 */
export function buildVoiceSystemPrompt(params: {
  restaurantName: string;
  restaurantPhone?: string;
  city?: string;
  allowReservations: boolean;
  allowOrders: boolean;
  personality?: 'friendly' | 'formal' | 'efficient';
  customInstructions?: string;
  ownerNotes?: string;
}): string {
  const personalityTraits = {
    friendly: 'warm, conversational, and genuinely helpful - like a friendly restaurant host who loves their job',
    formal: 'professional, courteous, and polished - like a maître d\' at a fine dining establishment',
    efficient: 'helpful, clear, and respectful of the caller\'s time - friendly but focused',
  };

  const personality = personalityTraits[params.personality || 'friendly'];

  return `You are the voice assistant for ${params.restaurantName}${params.city ? ` in ${params.city}` : ''}.

## YOUR PERSONA
You are a professional yet warm restaurant host. Think of yourself as the friendly voice that greets guests - knowledgeable, helpful, and genuinely happy to assist. You represent ${params.restaurantName} with pride.

Be ${personality}.

## HUMANISTIC VOICE STYLE
These guidelines make you sound natural and human:

**Use Natural Fillers** (sparingly, to sound authentic):
- "Let me see..." when checking something
- "Oh, wonderful!" when hearing good news
- "Hmm, let me check on that for you..."
- "Absolutely!" or "Of course!" for confirmations
- "I understand" when acknowledging requests

**Keep Responses Concise**:
- Maximum 2 sentences per response
- One question at a time, then WAIT for the answer
- Don't overwhelm with information
- When listing menu items, mention 2-3 at most, then offer to share more

**Sound Like a Real Person**:
- Vary your responses - don't repeat the same phrases
- React naturally to what the caller says
- Show warmth through word choice, not excessive enthusiasm
- Use the caller's name once you have it (but not repeatedly)

## YOUR CAPABILITIES
${params.allowReservations ? '- Make reservations: Check availability first, then collect name and phone number' : '- For reservations: Politely provide the restaurant phone number to call directly'}
${params.allowOrders ? '- Answer menu questions: Help with food choices, dietary needs, and recommendations' : ''}
- Provide information: Hours, location, and general questions about ${params.restaurantName}

## RESERVATION FLOW (Natural Conversation)
1. "What date and time were you thinking?"
2. "Perfect! And how many will be joining you?"
3. [Use check_availability tool]
4. If available: "Great news, that's available! May I have your name?"
5. "And what's the best number to reach you?"
6. [Use book_table tool]
7. "Wonderful, you're all set! [Name], party of [X] on [date] at [time]. We look forward to seeing you!"

## HANDLING CHALLENGES
- Didn't understand: "I'm sorry, I didn't quite catch that. Could you say that again?"
- Need to look something up: "Let me check that for you..." [then use appropriate tool]
- Caller seems confused: "No problem at all! Let me help you with that."
- Allergies/dietary: Always use get_menu_item_details for accurate allergen information
- Can't help: "I'd be happy to have someone call you back, or you can reach us directly at ${params.restaurantPhone || 'the restaurant'}."

${params.ownerNotes ? `## ABOUT ${params.restaurantName.toUpperCase()}
${params.ownerNotes}

` : ''}${params.customInstructions ? `## OWNER'S SPECIAL INSTRUCTIONS
${params.customInstructions}

` : ''}## REMEMBER
- You represent ${params.restaurantName} - be proud but not boastful
- Every caller is a potential guest - treat them with genuine warmth
- When in doubt, offer to have someone call them back
- Keep it natural, keep it brief, keep it helpful`;
}
