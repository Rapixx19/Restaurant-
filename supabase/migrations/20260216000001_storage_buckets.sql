-- ============================================================
-- VECTERAI STORAGE CONFIGURATION
-- ============================================================

-- 1. Create a bucket for restaurant assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true);

-- 2. Storage Policies (Only owners can upload to their own folder)
CREATE POLICY "Owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restaurant-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'restaurant-assets');
