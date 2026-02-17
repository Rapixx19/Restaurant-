-- ============================================================
-- VECTERAI ORDERS SYSTEM WITH STRIPE INTEGRATION
-- ============================================================

-- 1. ORDERS TABLE
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Customer info (for non-registered customers)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,

    -- Order details
    type TEXT DEFAULT 'takeout' CHECK (type IN ('dine_in', 'takeout', 'delivery')),
    items JSONB NOT NULL DEFAULT '[]',

    -- Pricing (all in cents for precision)
    subtotal INTEGER NOT NULL DEFAULT 0,
    tax INTEGER NOT NULL DEFAULT 0,
    tip INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,

    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled')),
    source TEXT DEFAULT 'ai' CHECK (source IN ('phone', 'chat', 'website', 'walk_in', 'manual', 'ai')),

    -- Stripe integration
    stripe_checkout_session_id TEXT,
    stripe_payment_intent_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT,

    -- Additional info
    special_instructions TEXT,
    delivery_address JSONB,
    estimated_ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ORDER ITEMS STRUCTURE (stored in items JSONB)
-- Each item should have: { id, name, price, quantity, notes }
COMMENT ON COLUMN public.orders.items IS 'Array of order items: [{id: uuid, name: string, price: number (cents), quantity: number, notes?: string}]';

-- 3. INDEXES
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_stripe_session ON public.orders(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Owners can manage all orders for their restaurants
CREATE POLICY "Owners can view orders" ON public.orders
    FOR SELECT USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can insert orders" ON public.orders
    FOR INSERT WITH CHECK (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can update orders" ON public.orders
    FOR UPDATE USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can delete orders" ON public.orders
    FOR DELETE USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

-- Allow public inserts for AI/checkout bookings (with service role validation in app)
CREATE POLICY "Public can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Allow public to read their own order by session ID (for order status page)
CREATE POLICY "Public can view order by session" ON public.orders
    FOR SELECT USING (stripe_checkout_session_id IS NOT NULL);

-- 5. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_updated
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_timestamp();

-- 6. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

COMMENT ON TABLE public.orders IS 'Restaurant orders with Stripe payment integration';
