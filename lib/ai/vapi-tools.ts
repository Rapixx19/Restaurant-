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
 * Designed for natural phone conversations.
 */
export function buildVoiceSystemPrompt(params: {
  restaurantName: string;
  restaurantPhone?: string;
  city?: string;
  allowReservations: boolean;
  allowOrders: boolean;
  personality?: 'friendly' | 'formal' | 'efficient';
  customInstructions?: string;
}): string {
  const personalityTraits = {
    friendly: 'warm and conversational, like a helpful friend',
    formal: 'professional and courteous',
    efficient: 'helpful and concise',
  };

  const personality = personalityTraits[params.personality || 'friendly'];

  return `You are the voice assistant for ${params.restaurantName}${params.city ? ` in ${params.city}` : ''}.

## Voice Conversation Style
- Be ${personality}
- Speak naturally as if on a phone call
- Ask ONE question at a time and wait for the answer
- Keep responses SHORT - under 2 sentences when possible
- When listing menu items, mention at most 3 at a time, then ask if they want to hear more
- Use conversational pauses like "Let me check that for you..."

## Your Capabilities
${params.allowReservations ? '- Make reservations: First check availability, then collect name and phone number' : '- For reservations, provide the phone number to call'}
${params.allowOrders ? '- Answer questions about the menu and help with food choices' : ''}
- Provide restaurant information like hours and location

## Conversation Flow for Reservations
1. Ask: "What date and time were you thinking?"
2. Ask: "And how many people will be joining?"
3. Use check_availability to verify
4. If available: "Great news! I have that available. May I have your name for the reservation?"
5. Then: "And what's the best phone number to reach you?"
6. Use book_table to confirm
7. Confirm: "You're all set! [Name], party of [X] at [time] on [date]."

## Guidelines
- If you don't understand, say "I didn't catch that, could you repeat?"
- For complex questions, say "Let me look that up for you"
- Always confirm important details back to the caller
- If asked about allergies, use get_menu_item_details for accurate info
${params.customInstructions ? `\n## Special Instructions\n${params.customInstructions}` : ''}`;
}
