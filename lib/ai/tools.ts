import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tool definitions for the AI Chat Engine.
 * These tools allow Claude to interact with restaurant data.
 */

export const AI_TOOLS: Tool[] = [
  {
    name: 'get_menu_items',
    description: 'Search and retrieve menu items. Can filter by dietary tags, category, or search term. Use this when customers ask about the menu, specific dishes, or dietary requirements.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Optional search term to find items by name or description',
        },
        dietary_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional dietary tags to filter by (e.g., vegan, gluten-free, spicy)',
        },
        category_name: {
          type: 'string',
          description: 'Optional category name to filter items',
        },
        available_only: {
          type: 'boolean',
          description: 'If true, only return available items',
          default: true,
        },
      },
      required: [],
    },
  },
  {
    name: 'get_menu_item_details',
    description: 'Get detailed information about a specific menu item including allergens, dietary info, and price.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_name: {
          type: 'string',
          description: 'The name of the menu item to look up',
        },
      },
      required: ['item_name'],
    },
  },
  {
    name: 'check_opening_hours',
    description: 'Check if the restaurant is currently open or get opening hours for a specific day.',
    input_schema: {
      type: 'object' as const,
      properties: {
        day: {
          type: 'string',
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'today'],
          description: 'The day to check. Use "today" for current day.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_restaurant_info',
    description: 'Get general restaurant information like address, phone number, and contact details.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'check_availability',
    description: 'Check if a table is available for a reservation at a specific date, time, and party size. Use this when a customer wants to make a reservation to verify availability before booking.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'The date for the reservation in YYYY-MM-DD format (e.g., 2024-03-15)',
        },
        time: {
          type: 'string',
          description: 'The time for the reservation in HH:mm format (24-hour, e.g., 19:00 for 7 PM)',
        },
        party_size: {
          type: 'number',
          description: 'The number of guests (1-50)',
        },
      },
      required: ['date', 'time', 'party_size'],
    },
  },
  {
    name: 'book_table',
    description: 'Book a table reservation. Only use this after confirming availability with check_availability and collecting all required customer information (name, phone).',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_name: {
          type: 'string',
          description: 'The name for the reservation',
        },
        customer_phone: {
          type: 'string',
          description: 'Contact phone number for the reservation',
        },
        customer_email: {
          type: 'string',
          description: 'Optional email address for confirmation',
        },
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
        special_requests: {
          type: 'string',
          description: 'Any special requests or notes (dietary restrictions, celebrations, etc.)',
        },
      },
      required: ['customer_name', 'customer_phone', 'date', 'time', 'party_size'],
    },
  },
];

export type ToolName =
  | 'get_menu_items'
  | 'get_menu_item_details'
  | 'check_opening_hours'
  | 'get_restaurant_info'
  | 'check_availability'
  | 'book_table';
