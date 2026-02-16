-- ============================================================
-- VECTERAI RESERVATIONS SYSTEM
-- ============================================================

-- 1. RESERVATIONS TABLE
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Customer info (for non-registered customers)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,

    -- Reservation details
    party_size INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 50),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 90,

    -- Status tracking
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
    source TEXT DEFAULT 'ai' CHECK (source IN ('phone', 'chat', 'website', 'walk_in', 'manual', 'ai')),

    -- Additional info
    special_requests TEXT,
    internal_notes TEXT,
    table_assignment TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX idx_reservations_restaurant ON public.reservations(restaurant_id);
CREATE INDEX idx_reservations_date ON public.reservations(reservation_date);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_reservations_datetime ON public.reservations(restaurant_id, reservation_date, reservation_time);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Owners can manage all reservations for their restaurants
CREATE POLICY "Owners can view reservations" ON public.reservations
    FOR SELECT USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can insert reservations" ON public.reservations
    FOR INSERT WITH CHECK (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can update reservations" ON public.reservations
    FOR UPDATE USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can delete reservations" ON public.reservations
    FOR DELETE USING (
        restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    );

-- Allow public inserts for AI bookings (with service role validation in app)
CREATE POLICY "Public can create reservations" ON public.reservations
    FOR INSERT WITH CHECK (true);

-- 4. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_reservation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_updated
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_reservation_timestamp();

-- 5. RESTAURANT CAPACITY SETTINGS (add to restaurants if not exists)
-- This adds max_tables and seats_per_table to the settings JSONB
COMMENT ON TABLE public.reservations IS 'Restaurant reservations with AI booking support';
