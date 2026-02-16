'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  restaurantId: string;
}

export function ChatWidget({ restaurantId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(true); // Start open for widget page
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usageLimitReached, setUsageLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize chat session
  useEffect(() => {
    async function initSession() {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_session',
            restaurantId,
          }),
        });

        const data = await response.json();

        if (data.usageLimitReached) {
          setUsageLimitReached(true);
          setMessages([
            {
              id: 'greeting',
              role: 'assistant',
              content: data.greeting,
              timestamp: new Date(),
            },
          ]);
          return;
        }

        if (data.error) {
          setError(data.error);
          return;
        }

        setSessionId(data.sessionId);
        setMessages([
          {
            id: 'greeting',
            role: 'assistant',
            content: data.greeting,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error('Session init error:', err);
        setError('Failed to connect. Please try again.');
      }
    }

    initSession();
  }, [restaurantId]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading || !sessionId || usageLimitReached) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          restaurantId,
          sessionId,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          message: userMessage.content,
        }),
      });

      const data = await response.json();

      if (data.usageLimitReached) {
        setUsageLimitReached(true);
      }

      if (data.error && !data.response) {
        setError(data.error);
        return;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Send message error:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (error && !sessionId) {
    return (
      <div className="min-h-screen bg-deep-navy flex items-center justify-center p-4">
        <div className="bg-card border border-white/10 rounded-2xl p-6 text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white font-medium mb-2">Connection Error</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-navy flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h1 className="text-white font-semibold">AI Assistant</h1>
            <p className="text-xs text-gray-400">
              {usageLimitReached ? 'Offline' : 'Online'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3',
                message.role === 'user'
                  ? 'bg-electric-blue text-white rounded-br-md'
                  : 'bg-white/5 text-white border border-white/10 rounded-bl-md'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                )}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-electric-blue animate-spin" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && sessionId && (
          <div className="flex justify-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4 bg-card">
        {usageLimitReached ? (
          <p className="text-center text-gray-400 text-sm">
            Please call us to continue the conversation
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading || !sessionId}
              className={cn(
                'flex-1 px-4 py-3 rounded-xl',
                'bg-white/5 border border-white/10',
                'text-white placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-transparent',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200'
              )}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || !sessionId}
              className={cn(
                'p-3 rounded-xl',
                'bg-electric-blue hover:bg-electric-blue-600',
                'text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
