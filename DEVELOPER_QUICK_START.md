# Developer Quick Start - New UX Features

Quick reference for using the newly implemented UX features in your components.

---

## 1. Enhanced Toast Notifications

Replace old `Toast` with new `toast` system for better UX.

### Basic Usage

```typescript
import { toast } from '../components/EnhancedToast';

// Success
toast.success('Business created successfully!');

// Error
toast.error('Failed to save changes');

// Warning
toast.warning('Your session will expire soon');

// Info
toast.info('New features available');
```

### Advanced Usage with Actions

```typescript
toast.error('Failed to create order', {
  duration: 5000,
  action: {
    label: 'Retry',
    onClick: () => retryOrderCreation()
  }
});
```

### Custom Duration

```typescript
toast.success('Saved!', { duration: 2000 }); // 2 seconds
```

---

## 2. Loading Skeletons

Show structured loading states instead of spinners.

### Import

```typescript
import { LoadingSkeleton, PageLoadingSkeleton, ListLoadingSkeleton } from '../components/LoadingSkeleton';
```

### Usage Examples

```typescript
// Text skeleton
<LoadingSkeleton type="text" count={3} />

// Title skeleton
<LoadingSkeleton type="title" />

// Card skeleton
<LoadingSkeleton type="card" count={2} />

// List skeleton with avatars
<LoadingSkeleton type="list" count={5} />

// Full page skeleton
{loading && <PageLoadingSkeleton />}

// List page skeleton
{loading && <ListLoadingSkeleton count={10} />}
```

---

## 3. Page Transitions

Add smooth transitions to your pages.

### CSS Classes

Import transitions CSS in your component or globally:
```typescript
import '../styles/transitions.css';
```

### Usage

```typescript
// Fade in
<div className="page-enter">
  {/* Your content */}
</div>

// Slide in from right
<div className="slide-in-right">
  {/* Your content */}
</div>

// Scale in
<div className="scale-in">
  {/* Modal or popup content */}
</div>

// Smooth transition on state changes
<div className="smooth-transition">
  {/* Hover, click, or state-driven changes */}
</div>
```

### Available Classes

- `page-enter` - Fade in animation
- `page-exit` - Fade out animation
- `slide-in-right` - Slide from right
- `slide-in-left` - Slide from left
- `scale-in` - Scale from 95% to 100%
- `pulse` - Pulse once
- `smooth-transition` - Transition all properties
- `smooth-opacity` - Only opacity transition
- `hover-lift` - Lift on hover
- `hover-scale` - Scale on hover
- `success-animation` - Pulse for success
- `error-shake` - Shake for error

---

## 4. Session Management

### Save User Context

```typescript
import { authService } from '../lib/authService';

authService.saveUserContext(businessId, infrastructureId, role);
```

### Get User Context

```typescript
const context = authService.getUserContext();
if (context) {
  console.log(context.businessId, context.role);
}
```

### Manual Session Refresh

```typescript
await authService.refreshSession();
```

---

## 5. Business Creation Best Practices

When creating a business, follow this pattern:

```typescript
const handleCreateBusiness = async () => {
  try {
    // Show loading toast
    toast.info('Creating your business...');

    // Create business (now includes context switch and role assignment)
    const business = await dataStore.createBusiness({
      name: businessName,
      name_hebrew: businessNameHebrew,
      business_type: 'logistics',
      order_number_prefix: orderPrefix,
      default_currency: 'ILS',
      primary_color: '#1B4B66',
      secondary_color: '#F5A623'
    });

    // Success feedback
    toast.success('Business created! Switching to owner role...');

    // Trigger role refresh in UI
    window.dispatchEvent(new Event('role-refresh'));

    // Continue with next steps
    onComplete();
  } catch (error) {
    toast.error('Failed to create business', {
      action: {
        label: 'Retry',
        onClick: handleCreateBusiness
      }
    });
  }
};
```

---

## 6. Animation Performance

### Respect Reduced Motion

All animations automatically respect user preference:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are automatically disabled */
}
```

### Manual Check in JS

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // Apply animation
}
```

---

## 7. Common Patterns

### Loading State with Skeleton

```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  fetchData().then(result => {
    setData(result);
    setLoading(false);
  });
}, []);

if (loading) {
  return <PageLoadingSkeleton />;
}

return (
  <div className="page-enter">
    {/* Render data */}
  </div>
);
```

### Error Handling with Toast

```typescript
const handleAction = async () => {
  try {
    await performAction();
    toast.success('Action completed!');
  } catch (error) {
    console.error(error);

    let message = 'An error occurred';
    if (error.message.includes('permission')) {
      message = 'You do not have permission for this action';
    } else if (error.message.includes('network')) {
      message = 'Network error. Please check your connection.';
    }

    toast.error(message, {
      action: {
        label: 'Retry',
        onClick: handleAction
      }
    });
  }
};
```

### Success Animation

```typescript
const [showSuccess, setShowSuccess] = useState(false);

const handleSubmit = async () => {
  await submitForm();
  setShowSuccess(true);
  toast.success('Submitted successfully!');

  // Reset after animation
  setTimeout(() => setShowSuccess(false), 600);
};

return (
  <button
    className={showSuccess ? 'success-animation' : ''}
    onClick={handleSubmit}
  >
    Submit
  </button>
);
```

---

## 8. Debugging

### Enable Debug Logs

```javascript
// In browser console
localStorage.setItem('debug_auth', 'true');
localStorage.setItem('debug_business', 'true');

// Reload page
location.reload();
```

### Check Session Status

```javascript
// In browser console
const authState = authService.getState();
console.log(authState);

// Check user context
const context = authService.getUserContext();
console.log(context);
```

### Verify Session Backup

```javascript
// In browser console
const backup = localStorage.getItem('twa-undergroundlab-session-backup');
console.log(JSON.parse(backup));
```

---

## 9. Testing Checklist

When implementing new features:

- [ ] Add loading skeleton while fetching data
- [ ] Use toast notifications for success/error feedback
- [ ] Add page-enter animation to new pages
- [ ] Test with slow network (throttle in DevTools)
- [ ] Test with reduced motion preference
- [ ] Verify session persists on refresh
- [ ] Check console for errors
- [ ] Test on mobile viewport

---

## 10. Common Mistakes to Avoid

❌ **Don't** use old Toast component
```typescript
Toast.success('...');  // OLD - Don't use
```

✅ **Do** use new toast system
```typescript
import { toast } from '../components/EnhancedToast';
toast.success('...');  // NEW - Use this
```

---

❌ **Don't** show generic spinners
```typescript
{loading && <div>Loading...</div>}  // BAD
```

✅ **Do** use loading skeletons
```typescript
{loading && <PageLoadingSkeleton />}  // GOOD
```

---

❌ **Don't** forget page transitions
```typescript
return <div>{content}</div>;  // Missing animation
```

✅ **Do** add transition class
```typescript
return <div className="page-enter">{content}</div>;  // Smooth entry
```

---

## 11. Need Help?

- Check console for detailed error logs
- Review `CRITICAL_UX_FIXES_SUMMARY.md` for architecture details
- Test in isolation using Storybook (if available)
- Ask team members for code review

---

**Remember:** The goal is to match the smooth, intuitive experience of Telegram, Instagram, and Twitter. Every interaction should feel instant and polished!
