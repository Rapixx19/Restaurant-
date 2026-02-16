/**
 * Types for the chat module.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  restaurantId: string;
  status: 'active' | 'closed';
  createdAt: Date;
}

export interface ChatWidgetProps {
  restaurantId: string;
}

export interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  usageLimitReached: boolean;
}
