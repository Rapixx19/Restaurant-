/**
 * Vapi Voice AI Configuration
 *
 * This module defines the Assistant configuration for Vapi voice integration.
 * Uses ElevenLabs Multilingual v2 for high-quality, low-latency voice synthesis.
 * Uses Claude 3 Haiku for fast response times in real-time voice conversations.
 */

// ============================================================
// VOICE STYLES
// ============================================================

export type VoiceStyle = 'warm' | 'professional' | 'energetic';

/**
 * ElevenLabs voice IDs for different styles.
 * These are pre-configured voices from ElevenLabs' voice library.
 */
export const VOICE_IDS: Record<VoiceStyle, { id: string; name: string; description: string }> = {
  warm: {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - warm, friendly male voice
    name: 'Adam',
    description: 'Warm and friendly, perfect for casual dining',
  },
  professional: {
    id: 'EXAVITQu4vr4xnSDxMaL', // Bella - clear, professional female voice
    name: 'Bella',
    description: 'Clear and professional, ideal for upscale restaurants',
  },
  energetic: {
    id: 'ErXwobaYiN019PkySvjV', // Antoni - energetic male voice
    name: 'Antoni',
    description: 'Energetic and upbeat, great for fast-casual venues',
  },
};

// ============================================================
// ASSISTANT TOOLS
// ============================================================

/**
 * Tools available to the voice assistant.
 * These map to our backend services.
 */
export const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check if a reservation time slot is available',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date for the reservation in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'The time for the reservation in HH:mm format (24-hour)',
          },
          party_size: {
            type: 'number',
            description: 'The number of guests',
          },
        },
        required: ['date', 'time', 'party_size'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_table',
      description: 'Book a reservation after confirming availability and customer details',
      parameters: {
        type: 'object',
        properties: {
          customer_name: {
            type: 'string',
            description: 'Full name of the customer making the reservation',
          },
          customer_phone: {
            type: 'string',
            description: 'Phone number for confirmation',
          },
          customer_email: {
            type: 'string',
            description: 'Email address (optional)',
          },
          date: {
            type: 'string',
            description: 'Reservation date in YYYY-MM-DD format',
          },
          time: {
            type: 'string',
            description: 'Reservation time in HH:mm format',
          },
          party_size: {
            type: 'number',
            description: 'Number of guests',
          },
          special_requests: {
            type: 'string',
            description: 'Any special requests or notes',
          },
        },
        required: ['customer_name', 'customer_phone', 'date', 'time', 'party_size'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu_info',
      description: 'Get information about menu items, including prices, ingredients, and dietary info',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What the customer is asking about (e.g., "vegetarian options", "pasta dishes", "gluten-free")',
          },
          category: {
            type: 'string',
            description: 'Optional category filter (e.g., "appetizers", "mains", "desserts")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_restaurant_info',
      description: 'Get restaurant information like hours, address, and policies',
      parameters: {
        type: 'object',
        properties: {
          info_type: {
            type: 'string',
            enum: ['hours', 'address', 'parking', 'dress_code', 'payment_methods', 'general'],
            description: 'Type of information requested',
          },
        },
        required: ['info_type'],
      },
    },
  },
];

// ============================================================
// ASSISTANT CONFIGURATION
// ============================================================

export interface VapiAssistantConfig {
  name: string;
  model: {
    provider: 'anthropic';
    model: 'claude-3-haiku-20240307';
    temperature: number;
    systemPrompt: string;
  };
  voice: {
    provider: 'elevenlabs';
    voiceId: string;
    stability: number;
    similarityBoost: number;
    optimizeStreamingLatency: number;
  };
  firstMessage: string;
  endCallMessage: string;
  transcriber: {
    provider: 'deepgram';
    model: 'nova-2';
    language: 'en';
  };
  serverUrl: string;
  serverUrlSecret?: string;
}

/**
 * Generate the assistant configuration for a restaurant.
 */
export function generateAssistantConfig(params: {
  restaurantName: string;
  restaurantPhone?: string;
  voiceStyle: VoiceStyle;
  greeting?: string;
  personality?: 'friendly' | 'formal' | 'efficient';
  serverUrl: string;
  serverSecret?: string;
}): VapiAssistantConfig {
  const voice = VOICE_IDS[params.voiceStyle];
  const personality = params.personality || 'friendly';

  // Build the system prompt based on restaurant settings
  const systemPrompt = buildSystemPrompt({
    restaurantName: params.restaurantName,
    personality,
  });

  const firstMessage =
    params.greeting ||
    `Hello! Thank you for calling ${params.restaurantName}. How may I help you today?`;

  return {
    name: `${params.restaurantName} Voice Assistant`,
    model: {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307', // Haiku for low latency
      temperature: 0.7,
      systemPrompt,
    },
    voice: {
      provider: 'elevenlabs',
      voiceId: voice.id,
      stability: 0.5,
      similarityBoost: 0.75,
      optimizeStreamingLatency: 4, // Maximum optimization for real-time
    },
    firstMessage,
    endCallMessage: 'Thank you for calling. Have a wonderful day!',
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
    },
    serverUrl: params.serverUrl,
    serverUrlSecret: params.serverSecret,
  };
}

/**
 * Build the system prompt for the voice assistant.
 */
function buildSystemPrompt(params: {
  restaurantName: string;
  personality: 'friendly' | 'formal' | 'efficient';
}): string {
  const personalityInstructions = {
    friendly: `You are warm, conversational, and personable. Use casual language and make callers feel welcome.
      Add small talk when appropriate and express genuine interest in helping them have a great dining experience.`,
    formal: `You are professional, courteous, and refined. Use formal language appropriate for an upscale establishment.
      Maintain a respectful tone while being helpful and attentive to details.`,
    efficient: `You are helpful, direct, and time-conscious. Get to the point quickly while remaining polite.
      Focus on solving the caller's needs efficiently without unnecessary chatter.`,
  };

  return `You are the voice assistant for ${params.restaurantName}. ${personalityInstructions[params.personality]}

CORE RESPONSIBILITIES:
1. Handle reservation requests - Check availability and book tables
2. Answer menu questions - Describe dishes, prices, ingredients, dietary options
3. Provide restaurant information - Hours, location, parking, policies
4. Handle general inquiries professionally

CONVERSATION GUIDELINES:
- Keep responses concise (2-3 sentences max) for natural phone conversation flow
- Confirm details by repeating them back to the caller
- If you need to look something up, say "Let me check that for you"
- For reservations, always collect: name, phone, date, time, party size
- If unsure, offer to transfer to a staff member

IMPORTANT RULES:
- Never make up information - use the tools to get accurate data
- Always confirm reservation details before booking
- Be honest if something isn't available
- End calls warmly and thank callers for their patronage

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
}

// ============================================================
// VAPI API HELPERS
// ============================================================

/**
 * Get Vapi API client configuration.
 */
export function getVapiConfig() {
  const apiKey = process.env.VAPI_API_KEY;

  if (!apiKey) {
    throw new Error('VAPI_API_KEY is not configured');
  }

  return {
    apiKey,
    baseUrl: 'https://api.vapi.ai',
  };
}

/**
 * Create or update a Vapi assistant.
 */
export async function createOrUpdateAssistant(
  config: VapiAssistantConfig,
  existingAssistantId?: string
): Promise<{ assistantId: string }> {
  const { apiKey, baseUrl } = getVapiConfig();

  const endpoint = existingAssistantId
    ? `${baseUrl}/assistant/${existingAssistantId}`
    : `${baseUrl}/assistant`;

  const method = existingAssistantId ? 'PATCH' : 'POST';

  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...config,
      tools: ASSISTANT_TOOLS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vapi API error: ${error}`);
  }

  const data = await response.json();
  return { assistantId: data.id };
}
