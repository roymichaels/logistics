# Enhancements Quick Reference

## 🎉 New Features

### Toast Notifications
```tsx
import { useToast } from '@/context/ToastContext';

const toast = useToast();
toast.success('Saved!');
toast.error('Failed');
toast.warning('Low stock');
toast.info('New feature');

// With action
toast.showToast({
  message: 'Connection lost',
  action: { label: 'Retry', onClick: reconnect }
});
```

### Form Validation
```tsx
import { useFormValidation } from '@/hooks/useFormValidation';

const { validateForm, getFieldError } = useFormValidation({
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
    custom: [{
      validate: (v) => /[A-Z]/.test(v),
      message: 'Need uppercase'
    }]
  },
});
```

### Form Components
```tsx
import { FormField, Input, Textarea } from '@/components/forms';

<FormField label="Email" error={error} required>
  <Input
    type="email"
    leftIcon={<Mail />}
    error={hasError}
  />
</FormField>

<Textarea
  maxLength={500}
  showCount
  currentLength={text.length}
/>
```

## 🏢 New Business Modals

### Business Hours
```tsx
import { EditBusinessHoursModal } from '@/components/modals';

<EditBusinessHoursModal
  currentHours={hours}
  onSave={async (hours) => {}}
  onClose={closeModal}
/>
```

### Location with GPS
```tsx
import { EditBusinessLocationModal } from '@/components/modals';

<EditBusinessLocationModal
  currentLocation={{
    address: '123 Main St',
    city: 'SF',
    latitude: 37.7749,
    longitude: -122.4194,
  }}
  onSave={async (location) => {}}
  onClose={closeModal}
/>
```

### Image Upload (Drag & Drop)
```tsx
import { ImageUploadModal } from '@/components/modals';

<ImageUploadModal
  maxImages={5}
  maxSizeMB={10}
  recommendedSize="1200x800px"
  onSave={async (files) => {}}
  onClose={closeModal}
/>
```

## 📝 Complete Form Example

```tsx
function MyForm() {
  const toast = useToast();
  const { validateForm, getFieldError, setFieldTouched } =
    useFormValidation({
      name: { required: true, minLength: 3 },
      email: { required: true, pattern: /^[^\s@]+@/ },
    });

  const [data, setData] = useState({ name: '', email: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm(data)) {
      toast.error('Fix errors');
      return;
    }

    try {
      await save(data);
      toast.success('Saved!');
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField
        label="Name"
        error={getFieldError('name')}
        required
      >
        <Input
          value={data.name}
          onChange={(e) => setData({...data, name: e.target.value})}
          onBlur={() => setFieldTouched('name')}
        />
      </FormField>

      <button type="submit">Save</button>
    </form>
  );
}
```

## 🎨 Edit Flow with Toast

```tsx
function ProductCard({ product }) {
  const { openModal, closeModal } = useModal();
  const toast = useToast();

  const handleEdit = () => {
    const id = openModal({
      component: (
        <EditProductModal
          product={product}
          onSave={async (updates) => {
            try {
              await update(updates);
              toast.success('Updated!');
              closeModal(id);
            } catch (error) {
              toast.error('Failed');
            }
          }}
          onClose={() => closeModal(id)}
        />
      ),
    });
  };

  return (
    <EditOverlay entityType="product" onEdit={handleEdit}>
      <ProductDisplay />
    </EditOverlay>
  );
}
```

## 🎯 All Available Modals

| Modal | Purpose | Key Features |
|-------|---------|--------------|
| `EditAvatarModal` | Profile photo | File upload, preview |
| `EditBioModal` | Profile info | Name, username, bio |
| `EditBusinessInfoModal` | Business details | Name, desc, category, tags |
| `EditBusinessHoursModal` | Operating hours | 7-day schedule, copy-to-all |
| `EditBusinessLocationModal` | Address & GPS | Full address, geolocation |
| `EditProductModal` | Product editor | Tabs: details, pricing, inventory |
| `QuickEditPriceModal` | Fast price update | Price change calculator |
| `EditPostModal` | Social post | Caption, hashtags, location |
| `ImageUploadModal` | Multi-image upload | Drag-drop, preview, validation |
| `ConfirmModal` | Confirmations | Danger, warning, info variants |

## 🔧 Validation Rules

```tsx
{
  fieldName: {
    required: boolean,
    minLength: number,
    maxLength: number,
    pattern: RegExp,
    custom: [{
      validate: (value) => boolean,
      message: string
    }]
  }
}
```

## 🎨 Toast Types

```tsx
toast.success(msg, title?)  // Green checkmark
toast.error(msg, title?)    // Red X
toast.warning(msg, title?)  // Yellow alert
toast.info(msg, title?)     // Blue info

// Advanced
toast.showToast({
  type: 'success',
  message: 'Done!',
  title: 'Success',
  duration: 3000,
  action: {
    label: 'Undo',
    onClick: () => {}
  }
})
```

## 📦 Exports

```tsx
// Modals
import {
  EditAvatarModal,
  EditBioModal,
  EditBusinessInfoModal,
  EditBusinessHoursModal,
  EditBusinessLocationModal,
  EditProductModal,
  QuickEditPriceModal,
  EditPostModal,
  ImageUploadModal,
  ConfirmModal,
} from '@/components/modals';

// Forms
import {
  FormField,
  Input,
  Textarea,
} from '@/components/forms';

// Edit Components
import {
  EditButton,
  EditOverlay,
  QuickActionMenu,
} from '@/components/edit';

// Hooks
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useEditPermissions } from '@/hooks/useEditPermissions';
```

## 🚀 Demo Page

Visit `/demo/editing` or import:
```tsx
import { EditingSystemDemo } from '@/pages/EditingSystemDemo';
```

Shows all features with interactive examples!

## 💡 Pro Tips

1. **Always use toast feedback** for save operations
2. **Validate on blur** to avoid annoying users
3. **Show character counts** on long text fields
4. **Use FormField wrapper** for consistent styling
5. **Add loading states** to all async operations
6. **Handle errors gracefully** with try-catch + toast
7. **Test on mobile** - all modals are responsive
8. **Use geolocation** for better location accuracy
9. **Implement autosave** for long forms (optional)
10. **Add keyboard shortcuts** for power users (future)

## 🎯 Common Patterns

### Save with Optimistic UI
```tsx
const handleSave = async (data) => {
  // Update UI immediately
  updateLocalState(data);

  try {
    await saveToServer(data);
    toast.success('Saved!');
  } catch (error) {
    // Rollback on error
    revertLocalState();
    toast.error('Failed to save');
  }
};
```

### Validation on Change
```tsx
<Input
  onChange={(e) => {
    setData(e.target.value);
    validateField('fieldName', e.target.value);
  }}
/>
```

### Multi-step Modal
```tsx
const [step, setStep] = useState(1);

return (
  <BaseModal title={`Step ${step} of 3`}>
    {step === 1 && <StepOne />}
    {step === 2 && <StepTwo />}
    {step === 3 && <StepThree />}

    <button onClick={() => setStep(step + 1)}>
      Next
    </button>
  </BaseModal>
);
```
