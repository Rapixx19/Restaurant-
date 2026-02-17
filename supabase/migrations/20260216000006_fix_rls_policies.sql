-- ============================================================
-- FIX RLS POLICIES - Add missing INSERT/UPDATE/DELETE policies
-- ============================================================

-- Profiles: Allow users to insert and update their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Restaurants: Allow authenticated users to INSERT new restaurants
CREATE POLICY "Authenticated users can create restaurants"
  ON public.restaurants FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Restaurants: Allow owners to UPDATE their restaurants
CREATE POLICY "Owners can update their own restaurants"
  ON public.restaurants FOR UPDATE
  USING (auth.uid() = owner_id);

-- Restaurants: Allow owners to DELETE their restaurants
CREATE POLICY "Owners can delete their own restaurants"
  ON public.restaurants FOR DELETE
  USING (auth.uid() = owner_id);

-- Menu Categories: Full CRUD for owners
CREATE POLICY "Owners can manage their menu categories"
  ON public.menu_categories FOR ALL
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
