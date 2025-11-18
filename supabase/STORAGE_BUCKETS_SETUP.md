# Supabase Storage Buckets Setup Guide

This guide provides instructions for setting up the required storage buckets for the Business Pages and KYC Verification systems.

## Required Storage Buckets

### 1. kyc-documents (Private, Encrypted)

**Purpose**: Store KYC verification documents, identity photos, and liveness videos

**Configuration**:
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/webm'
  ]
);
```

**RLS Policies**:
```sql
-- Users can upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
    )
  )
);

-- Superadmins can view all KYC documents
CREATE POLICY "Superadmins can view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND auth.uid() IN (
    SELECT id FROM users WHERE role = 'superadmin' OR global_role = 'superadmin'
  )
);

-- Users can delete their own documents
CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**File Structure**:
```
kyc-documents/
├── {user_id}/
│   ├── documents/
│   │   ├── {document_id}_government_id.jpg
│   │   ├── {document_id}_passport.pdf
│   │   └── {document_id}_utility_bill.pdf
│   ├── identity/
│   │   ├── {check_id}_selfie.jpg
│   │   ├── {check_id}_selfie_with_id.jpg
│   │   └── {check_id}_liveness_video.mp4
│   └── address/
│       └── {verification_id}_proof_of_address.pdf
```

---

### 2. business-page-media (Public)

**Purpose**: Store business page images, gallery photos, and promotional content

**Configuration**:
```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-page-media',
  'business-page-media',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4'
  ]
);
```

**RLS Policies**:
```sql
-- Public read access
CREATE POLICY "Public can view business page media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-page-media');

-- Business owners/managers can upload
CREATE POLICY "Business owners can upload business media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-page-media'
  AND (storage.foldername(name))[1] IN (
    SELECT business_id::text FROM business_memberships
    WHERE user_id = auth.uid()
    AND role IN ('business_owner', 'manager')
  )
);

-- Business owners can update their media
CREATE POLICY "Business owners can update their media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-page-media'
  AND (storage.foldername(name))[1] IN (
    SELECT business_id::text FROM business_memberships
    WHERE user_id = auth.uid()
    AND role IN ('business_owner', 'manager')
  )
);

-- Business owners can delete their media
CREATE POLICY "Business owners can delete their media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-page-media'
  AND (storage.foldername(name))[1] IN (
    SELECT business_id::text FROM business_memberships
    WHERE user_id = auth.uid()
    AND role IN ('business_owner', 'manager')
  )
);
```

**File Structure**:
```
business-page-media/
├── {business_id}/
│   ├── cover/
│   │   └── cover_image.jpg
│   ├── logo/
│   │   └── logo.png
│   ├── gallery/
│   │   ├── photo_1.jpg
│   │   ├── photo_2.jpg
│   │   └── photo_3.jpg
│   ├── sections/
│   │   └── {section_id}_image.jpg
│   └── videos/
│       └── intro_video.mp4
```

---

## Setup Instructions

### Using Supabase Dashboard

1. **Navigate to Storage**:
   - Go to your Supabase project dashboard
   - Click on "Storage" in the left sidebar

2. **Create kyc-documents bucket**:
   - Click "New bucket"
   - Name: `kyc-documents`
   - Public: **No** (Private)
   - File size limit: 50 MB
   - Allowed MIME types: Add the types listed above
   - Click "Create bucket"

3. **Create business-page-media bucket**:
   - Click "New bucket"
   - Name: `business-page-media`
   - Public: **Yes**
   - File size limit: 10 MB
   - Allowed MIME types: Add the types listed above
   - Click "Create bucket"

4. **Apply RLS Policies**:
   - For each bucket, go to "Policies" tab
   - Click "New policy"
   - Choose "For full customization" and paste the SQL policies above
   - Click "Review" and "Save policy"

### Using Supabase CLI

```bash
# Apply the SQL configurations
supabase db execute "$(cat <<EOF
-- Insert bucket configurations here from above
EOF
)"

# Apply RLS policies
supabase db execute "$(cat <<EOF
-- Insert RLS policies here from above
EOF
)"
```

---

## Image Optimization Recommendations

### For business-page-media

1. **Use responsive images**: Upload multiple sizes
   - Original: Max 1920x1080
   - Large: 1200x675
   - Medium: 800x450
   - Thumbnail: 400x225

2. **Image formats**:
   - Use WebP for better compression
   - Provide JPEG fallback for older browsers
   - PNG for logos with transparency

3. **Compression**:
   - Compress images before upload (quality: 80-85%)
   - Use tools like ImageOptim, TinyPNG, or Squoosh

### For kyc-documents

1. **Document scans**:
   - Resolution: 300 DPI minimum
   - Format: JPEG or PDF
   - Max file size: 5MB per document

2. **Selfies**:
   - Resolution: 1280x720 minimum
   - Format: JPEG
   - Face should be clearly visible

3. **Liveness videos**:
   - Resolution: 720p minimum
   - Format: MP4 or WebM
   - Duration: 5-15 seconds
   - Max file size: 20MB

---

## Security Best Practices

1. **Enable encryption at rest** (automatic in Supabase)
2. **Use signed URLs** for temporary document access
3. **Implement virus scanning** using edge functions before storage
4. **Set up automated cleanup** for rejected/expired documents
5. **Monitor storage usage** and set up alerts for unusual activity
6. **Regular security audits** of RLS policies
7. **Backup strategy** for critical KYC documents

---

## Monitoring and Maintenance

### Storage Metrics to Track

- Total storage usage per bucket
- Upload success/failure rates
- Average file sizes
- Access patterns and frequency
- RLS policy denials

### Cleanup Tasks

```sql
-- Delete expired KYC documents (older than 90 days after rejection)
DELETE FROM storage.objects
WHERE bucket_id = 'kyc-documents'
AND created_at < now() - interval '90 days'
AND name LIKE '%/documents/%'
AND EXISTS (
  SELECT 1 FROM kyc_documents d
  WHERE d.storage_path = name
  AND d.document_status = 'rejected'
  AND d.created_at < now() - interval '90 days'
);

-- Delete orphaned media files (no reference in database)
DELETE FROM storage.objects
WHERE bucket_id = 'business-page-media'
AND created_at < now() - interval '30 days'
AND NOT EXISTS (
  SELECT 1 FROM business_page_gallery g
  WHERE g.image_url LIKE '%' || name
);
```

---

## Troubleshooting

### Issue: Upload fails with "Row level security policy violation"

**Solution**: Verify that:
1. User is authenticated
2. User has proper role/membership
3. File path follows the correct structure
4. MIME type is allowed

### Issue: Cannot access uploaded files

**Solution**: Check:
1. Bucket is public (for business-page-media) or user has permission (for kyc-documents)
2. RLS policies are correctly applied
3. File path is correct
4. User session is valid

### Issue: File size limit exceeded

**Solution**:
1. Compress images/videos before upload
2. Adjust bucket file_size_limit if needed
3. Implement client-side validation

---

## Client-Side Upload Example

```typescript
import { supabase } from './supabaseClient';

// Upload KYC document
async function uploadKycDocument(
  userId: string,
  file: File,
  documentType: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}_${documentType}.${fileExt}`;
  const filePath = `${userId}/documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('kyc-documents')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Upload business page image
async function uploadBusinessImage(
  businessId: string,
  file: File,
  category: 'cover' | 'logo' | 'gallery'
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${businessId}/${category}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('business-page-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('business-page-media')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
```
