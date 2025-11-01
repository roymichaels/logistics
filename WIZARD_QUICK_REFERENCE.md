# Wizard System Quick Reference Guide

## Business Creation Wizard

### Entry Points
1. **OnboardingHub** → Select "יצירת עסק חדש" → BusinessOwnerOnboarding
2. **OwnerDashboard** → "צור עסק חדש" button → CreateBusinessModal
3. **App.tsx** → `showCreateBusiness` state → BusinessOwnerOnboarding

### Flow Steps
```
Step 1: Business Type Selection
  ↓ (validates selectedType exists)
Step 2: Business Details
  ↓ (validates name, name_hebrew, order_prefix)
Step 3: Branding (Colors)
  ↓ (final submission)
Complete: Creates business in database
```

### Validation Rules
| Field | Rule | Error Message |
|-------|------|---------------|
| Business Name (EN) | Required, min 2 chars | חובה להזין שם עסק באנגלית |
| Business Name (HE) | Required, min 2 chars | חובה להזין שם עסק בעברית |
| Order Prefix | 2-4 chars, A-Z0-9 only | הקידומת חייבת להיות בין 2-4 תווים |

### Database Operations
```typescript
// Creates record in businesses table
const business = await dataStore.createBusiness({
  name: businessName,
  name_hebrew: businessNameHebrew,
  business_type: selectedType,
  order_number_prefix: orderPrefix.toUpperCase(),
  default_currency: 'ILS',
  primary_color: primaryColor,
  secondary_color: secondaryColor
});
```

### Form Persistence
- Auto-saves to: `localStorage.getItem('business_onboarding_draft')`
- Restored on component mount
- Cleared after successful completion

---

## Driver Application Wizard

### Entry Points
1. **OnboardingHub** → Select "להיות נהג" → BecomeDriverModal
2. **Sidebar Menu** → "הגש בקשה להיות נהג" → BecomeDriverModal
3. **App.tsx** → `showBecomeDriver` state → BecomeDriverModal

### Flow Steps
```
Single Form: Driver Application
  ↓ (validates all required fields)
Submit: Creates application + profile
  ↓
Success: Shows confirmation message
```

### Required Fields
- Full Name (from user profile)
- Vehicle Type (dropdown)
- License Number
- Phone Number
- Availability Notes

### Database Operations
```typescript
// 1. Create driver application
await supabase
  .from('driver_applications')
  .insert({
    user_id: user.id,
    application_data: { vehicle_type, license_number, phone, availability },
    status: 'pending'
  });

// 2. Create driver profile
await supabase
  .from('driver_profiles')
  .insert({
    user_id: user.id,
    application_status: 'pending',
    verification_status: 'unverified',
    vehicle_type: vehicleType
  });
```

---

## Common Issues & Solutions

### Issue: Supabase not initialized
**Solution:** Component now waits for Supabase with `useSupabaseReady()` hook
```typescript
const { isSupabaseReady } = useSupabaseReady();
if (!isSupabaseReady) return <LoadingState />;
```

### Issue: Form loses data on refresh
**Solution:** Auto-save implemented with localStorage
```typescript
useEffect(() => {
  localStorage.setItem('business_onboarding_draft', JSON.stringify(formData));
}, [formData]);
```

### Issue: No validation feedback
**Solution:** Inline errors with visual indicators
```typescript
border: `1px solid ${errors.fieldName ? '#ff6b8a' : ROYAL_COLORS.border}`
{errors.fieldName && <p style={{ color: '#ff6b8a' }}>{errors.fieldName}</p>}
```

### Issue: Legacy driver_metadata conflicts
**Solution:** Now uses proper normalized schema
```typescript
// OLD (Don't use)
UPDATE users SET driver_metadata = {...}

// NEW (Correct)
INSERT INTO driver_applications + driver_profiles
```

---

## Development Checklist

### Before Deployment
- [ ] Test business creation with valid data
- [ ] Test business creation with invalid data
- [ ] Test form persistence across refresh
- [ ] Test driver application submission
- [ ] Verify database records created correctly
- [ ] Test error messages display properly
- [ ] Test success callbacks work
- [ ] Check localStorage cleanup on success

### Code Review Points
- [ ] All validations have user-friendly messages
- [ ] Database writes use new schema (not driver_metadata)
- [ ] Error handling includes logging
- [ ] Success/error haptic feedback implemented
- [ ] Loading states prevent double submission
- [ ] Form fields clear errors on change

---

## API Reference

### BusinessOwnerOnboarding Props
```typescript
interface BusinessOwnerOnboardingProps {
  dataStore: DataStore;
  onComplete: () => void;
  onBack: () => void;
}
```

### BecomeDriverModal Props
```typescript
interface BecomeDriverModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}
```

### OnboardingHub Props
```typescript
interface OnboardingHubProps {
  onSelectPathway: (pathway: 'business_owner' | 'team_member' | null) => void;
  onSkip?: () => void;
}
```

---

## Debugging Tips

### Enable Console Logs
All wizard components use emoji-prefixed logging:
- 🔄 = Processing/Loading
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning
- 📥 = Data Loading
- 🎨 = Rendering

### Check Form State
```javascript
// In browser console
localStorage.getItem('business_onboarding_draft')
localStorage.getItem('onboarding_completed_<user_id>')
```

### Verify Database Records
```sql
-- Check driver applications
SELECT * FROM driver_applications WHERE user_id = '<user_id>';

-- Check driver profiles
SELECT * FROM driver_profiles WHERE user_id = '<user_id>';

-- Check businesses
SELECT * FROM businesses ORDER BY created_at DESC LIMIT 10;
```

---

## Architecture Diagram

```
┌─────────────────┐
│  OnboardingHub  │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐  ┌──────────┐
│Business│  │  Driver  │
│ Owner  │  │Application│
└───┬────┘  └────┬─────┘
    │            │
    ▼            ▼
┌────────┐  ┌──────────┐
│Business│  │driver_   │
│Creation│  │applications│
└────────┘  │driver_    │
            │profiles  │
            └──────────┘
```

---

## Version History

### v2.0 - Complete Rewrite (Current)
- ✅ Comprehensive validation
- ✅ Form state persistence
- ✅ New database schema
- ✅ Proper error handling
- ✅ Inline validation feedback
- ✅ Success with build verification

### v1.0 - Legacy (Deprecated)
- ❌ Used driver_metadata
- ❌ Limited validation
- ❌ No form persistence
- ❌ Inconsistent routing

