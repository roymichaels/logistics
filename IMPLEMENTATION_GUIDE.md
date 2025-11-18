# Business Pages & KYC Implementation Guide

## Overview

This guide provides step-by-step instructions for deploying and using the newly implemented Business Pages and KYC Verification systems.

---

## Quick Deployment Checklist

### 1. Database Setup (5 minutes)

```bash
# Apply migrations to your Supabase database
cd supabase
supabase db push

# Or manually via SQL:
psql $DATABASE_URL < migrations/20251118000000_create_business_pages_system.sql
psql $DATABASE_URL < migrations/20251118010000_create_kyc_verification_system.sql
```

### 2. Storage Buckets Setup (10 minutes)

Follow instructions in `supabase/STORAGE_BUCKETS_SETUP.md` to:
- Create `kyc-documents` bucket (private)
- Create `business-page-media` bucket (public)
- Apply RLS policies for both buckets

**Via Supabase Dashboard:**
1. Go to Storage section
2. Click "New bucket"
3. Follow the configuration in STORAGE_BUCKETS_SETUP.md

### 3. Deploy Edge Functions (5 minutes)

```bash
# Deploy business page functions
supabase functions deploy business-page-get
supabase functions deploy business-page-update

# Deploy KYC functions
supabase functions deploy kyc-document-upload
supabase functions deploy kyc-admin-review
supabase functions deploy kyc-contact-verify
```

### 4. Update Application Routing (15 minutes)

Add routes to your main App.tsx or router configuration:

```typescript
// Add to your routing logic
case 'business-page':
  return <BusinessPage dataStore={dataStore} businessId={params.id} slug={params.slug} onNavigate={setCurrentPage} />;

case 'kyc-verify':
  return <KycVerificationFlow dataStore={dataStore} onComplete={() => setCurrentPage('profile')} onCancel={() => setCurrentPage('profile')} />;

case 'kyc-admin':
  return <KycAdminReviewPanel dataStore={dataStore} onNavigate={setCurrentPage} />;
```

### 5. Test the Implementation (10 minutes)

**Test Business Pages:**
1. Navigate to a business
2. Click to view business page
3. Verify all sections display correctly
4. Test contact buttons (WhatsApp, Directions)

**Test KYC Flow:**
1. Go to Profile → Verify Identity
2. Upload a test document
3. Complete all verification steps
4. Check status shows "Under Review"

**Test Admin Review:**
1. Login as superadmin
2. Navigate to Admin Panel → KYC Reviews
3. Review a pending verification
4. Approve or reject with notes

---

## Features & Usage

### Business Pages

#### For Business Owners

**Creating a Business Page:**
1. Go to your business settings
2. Click "Create Business Page"
3. Fill in required fields:
   - Page title
   - Tagline
   - Description
   - Contact information
4. Upload cover image and logo
5. Add gallery photos
6. Set operating hours
7. Add amenities
8. Publish when ready

**Managing Your Page:**
- Edit any section anytime
- Add/remove gallery photos
- Update operating hours
- Add special holiday hours
- View analytics and page views

**Page Features:**
- Custom branding colors
- Photo galleries
- Operating hours with open/closed status
- Location with directions
- Social media links
- Contact information
- Amenities and features list
- SEO optimization

#### For Customers

**Viewing Business Pages:**
1. Browse businesses
2. Click on any business
3. View full business profile
4. Check if currently open
5. Browse photo gallery
6. Get directions
7. Contact via WhatsApp/phone

### KYC Verification

#### For Users

**Starting Verification:**
1. Navigate to Profile
2. Click "Verify Identity"
3. Follow the multi-step wizard

**Verification Steps:**
1. **Document Upload**
   - Select document type (ID, passport, driver's license)
   - Take clear photo of document
   - Ensure all corners visible
   - Verify text is readable

2. **Identity Confirmation**
   - Take selfie holding ID
   - Face and ID must be clearly visible
   - Remove glasses if possible
   - Use good lighting

3. **Contact Verification**
   - Enter phone number
   - Receive SMS with OTP code
   - Enter code to verify

4. **Address Verification**
   - Enter residential address
   - All fields required
   - Address will be validated

5. **Submit for Review**
   - Review all information
   - Submit to admin team
   - Wait for approval (24-48 hours)

**Checking Status:**
- View verification progress percentage
- See which steps completed
- Get notifications when status changes
- Check expiration dates

#### For Administrators

**Reviewing Verifications:**
1. Login as superadmin
2. Go to Admin Panel → KYC Reviews
3. Filter by status (Under Review, Approved, Rejected)
4. Click on verification to review

**Review Process:**
1. **Check User Information**
   - Verify user details
   - Check submission date
   - Review completeness percentage

2. **Examine Documents**
   - View all uploaded documents
   - Check document clarity
   - Verify expiration dates
   - Check issuing country

3. **Review Identity Checks**
   - Check liveness detection results
   - Verify face match scores
   - Review selfie quality

4. **Verify Contact & Address**
   - Confirm phone verification
   - Check address completeness
   - Validate address format

5. **Make Decision**
   - Click Approve or Reject
   - Select rejection reason if rejecting
   - Add review notes
   - Submit decision

**Best Practices:**
- Review in secure environment
- Take time to verify each document
- Document unusual cases in notes
- Be consistent with rejection reasons
- Follow up on suspicious activities

---

## API Endpoints

### Business Pages

#### GET /functions/v1/business-page-get
Get business page data

**Query Parameters:**
- `slug` - Page slug (optional)
- `business_id` - Business ID (optional)
- `include_unpublished` - Include unpublished pages (boolean)

**Response:**
```json
{
  "page": { /* business page data */ },
  "sections": [ /* page sections */ ],
  "gallery": [ /* gallery images */ ],
  "operating_hours": [ /* hours by day */ ],
  "amenities": [ /* features list */ ],
  "is_open_now": true
}
```

#### POST /functions/v1/business-page-update
Update business page (owners only)

**Body:**
```json
{
  "business_id": "uuid",
  "page_data": { /* page fields */ },
  "sections": [ /* sections array */ ],
  "gallery_items": [ /* gallery array */ ],
  "operating_hours": [ /* hours array */ ],
  "amenities": [ /* amenities array */ ]
}
```

### KYC Verification

#### POST /functions/v1/kyc-document-upload
Upload KYC document

**Body:** multipart/form-data
- `file` - Document file
- `document_type` - Type of document
- `document_subtype` - Subtype (optional)
- `document_number` - Document number (optional)
- `issue_date` - Issue date (optional)
- `expiry_date` - Expiry date (optional)

#### GET /functions/v1/kyc-admin-review
List verifications or get details

**Query Parameters:**
- `verification_id` - Get specific verification
- `status` - Filter by status
- `limit` - Results limit (default: 50)
- `offset` - Pagination offset

#### POST /functions/v1/kyc-admin-review
Review verification (superadmin only)

**Body:**
```json
{
  "verification_id": "uuid",
  "action": "approve|reject|request_resubmit",
  "review_notes": "string",
  "rejection_reason": "enum_value",
  "verification_level": 2
}
```

#### POST /functions/v1/kyc-contact-verify?action=send
Send verification code

**Body:**
```json
{
  "contact_type": "phone|email",
  "contact_value": "string"
}
```

#### POST /functions/v1/kyc-contact-verify?action=verify
Verify OTP code

**Body:**
```json
{
  "verification_id": "uuid",
  "otp_code": "string"
}
```

---

## Database Schema Reference

### Business Pages Tables

- `business_pages` - Main page configuration
- `business_page_sections` - Content sections
- `business_page_gallery` - Image galleries
- `business_operating_hours` - Regular hours
- `business_special_hours` - Holiday hours
- `business_amenities` - Features/amenities
- `business_page_analytics` - View tracking

### KYC Tables

- `kyc_verifications` - Master verification records
- `kyc_documents` - Document storage references
- `kyc_identity_checks` - Selfie/liveness data
- `kyc_contact_verifications` - Phone/email verification
- `kyc_address_verifications` - Address data
- `kyc_merchant_requests` - Merchant KYC requests
- `kyc_user_consents` - Permission management
- `kyc_admin_reviews` - Review audit trail
- `kyc_audit_log` - Comprehensive audit log

---

## Security Considerations

### Data Protection

1. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only access their own data
   - Superadmins have full access
   - Business owners access their business data

2. **Storage Security**
   - KYC documents in private bucket
   - Signed URLs for temporary access
   - Business media in public bucket with owner control

3. **API Security**
   - JWT authentication required
   - Role-based access control
   - Input validation on all endpoints
   - Rate limiting enabled

### Privacy Compliance

1. **Data Minimization**
   - Only collect necessary information
   - Users control what merchants see
   - Consent required for sharing

2. **Audit Logging**
   - All KYC actions logged
   - Document access tracked
   - Admin reviews recorded

3. **Data Retention**
   - Approved KYC: 1 year
   - Rejected documents: 90 days
   - User can request deletion

---

## Troubleshooting

### Common Issues

**"Business page not found"**
- Check page is published
- Verify correct slug/business_id
- Check user has permission

**"Document upload failed"**
- Verify file size < 50MB
- Check file type is allowed
- Ensure bucket exists with correct policies

**"Unauthorized to review KYC"**
- Verify user is superadmin
- Check auth token is valid
- Confirm role in database

**"RLS policy violation"**
- Check user has correct role
- Verify business membership
- Review RLS policies in migrations

### Debug Checklist

1. Check Supabase logs for errors
2. Verify migrations applied correctly
3. Confirm storage buckets created
4. Test RLS policies with sample queries
5. Check edge function deployment
6. Verify environment variables set
7. Test with different user roles

---

## Performance Tips

1. **Business Pages**
   - Cache page data for 5 minutes
   - Lazy load gallery images
   - Use thumbnail URLs where possible
   - Optimize images before upload

2. **KYC System**
   - Compress documents before upload
   - Use pagination for admin reviews
   - Cache verification status
   - Index frequently queried fields

---

## Support & Maintenance

### Monitoring

Track these metrics:
- Business page creation rate
- Page view counts
- KYC completion rate
- Average approval time
- Rejection reasons distribution
- Storage usage
- API response times

### Regular Tasks

**Weekly:**
- Review KYC backlog
- Check rejected verifications
- Monitor storage costs
- Review audit logs

**Monthly:**
- Analyze verification metrics
- Update rejection reason categories
- Review security policies
- Check for duplicate accounts

**Quarterly:**
- Security audit
- Performance optimization
- User feedback review
- Feature requests evaluation

---

## Next Steps

1. Complete frontend integration
2. Set up monitoring dashboards
3. Configure email/SMS providers
4. Train support staff
5. Create user documentation
6. Plan marketing rollout
7. Gather user feedback
8. Iterate based on usage

---

## Getting Help

- **Technical Issues**: Check Supabase logs and error messages
- **Security Concerns**: Review RLS policies and audit logs
- **Feature Requests**: Document and prioritize
- **Bug Reports**: Include steps to reproduce and error logs

---

*Last Updated: 2025-11-18*
*Version: 1.0.0*
