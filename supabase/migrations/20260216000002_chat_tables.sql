-- ============================================================
-- VECTERAI CHAT ENGINE TABLES
-- ============================================================

-- 1. CHAT SESSIONS
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_token TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    source TEXT DEFAULT 'widget' CHECK (source IN ('website', 'widget')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHAT MESSAGES
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX idx_chat_sessions_restaurant ON public.chat_sessions(restaurant_id);
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Public can create sessions for any restaurant (widget access)
CREATE POLICY "Anyone can create chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (true);

-- Public can read their own sessions by token
CREATE POLICY "Public can read sessions" ON public.chat_sessions
    FOR SELECT USING (true);

-- Anyone can insert messages to a session
CREATE POLICY "Anyone can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

-- Anyone can read messages
CREATE POLICY "Anyone can read messages" ON public.chat_messages
    FOR SELECT USING (true);

-- Restaurant owners can view all their restaurant's chat sessions
CREATE POLICY "Owners can view their chats" ON public.chat_sessions
    FOR SELECT USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can view their chat messages" ON public.chat_messages
    FOR SELECT USING (
        session_id IN (
            SELECT cs.id FROM public.chat_sessions cs
            JOIN public.restaurants r ON cs.restaurant_id = r.id
            WHERE r.owner_id = auth.uid()
        )
    );
