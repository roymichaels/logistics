/*
  # Create Storage Buckets for Media Files

  1. Storage Buckets
    - `business-logos` - Business logo images (512x512)
    - `business-banners` - Business banner images (1920x600)
    - `product-images` - Product images (800x800)
    - `user-avatars` - User profile avatars (256x256)

  2. Security
    - Public read access for all buckets
    - Authenticated write access based on ownership
    - File size limits enforced
    - Only image types allowed

  3. Policies
    - Users can upload to their own businesses
    - Users can upload their own avatars
    - Anyone can view public images
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('business-logos', 'business-logos', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('business-banners', 'business-banners', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Business Logos Policies
CREATE POLICY "Anyone can view business logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

CREATE POLICY "Business owners can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-logos' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-logos' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

-- Business Banners Policies
CREATE POLICY "Anyone can view business banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-banners');

CREATE POLICY "Business owners can upload banners"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-banners' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update banners"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-banners' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete banners"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-banners' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

-- Product Images Policies
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Business owners can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id::text = (storage.foldername(name))[1]
      AND businesses.owner_id = auth.uid()
    )
  );

-- User Avatars Policies
CREATE POLICY "Anyone can view user avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
