# In-Page Editing - Quick Reference

## 🚀 Quick Start

### 1. Add Edit Button to Any Component

```tsx
import { EditButton } from '@/components/edit';

<EditButton
  entityType="product"
  entityOwnerId={product.owner_id}
  onClick={() => openEditModal()}
  variant="primary"
/>
```

### 2. Add Hover Edit to Images/Cards

```tsx
import { EditOverlay } from '@/components/edit';

<EditOverlay
  entityType="profile"
  entityOwnerId={user.id}
  onEdit={() => openEditModal()}
>
  <img src={avatar} />
</EditOverlay>
```

### 3. Add Three-Dot Menu

```tsx
import { QuickActionMenu } from '@/components/edit';
import { Pencil, Trash2 } from 'lucide-react';

<QuickActionMenu
  entityType="post"
  entityOwnerId={post.author_id}
  actions={[
    {
      label: 'Edit',
      icon: <Pencil size={16} />,
      onClick: handleEdit,
      requirePermission: 'edit',
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: handleDelete,
      variant: 'danger',
      requirePermission: 'delete',
    },
  ]}
/>
```

### 4. Open Modal Programmatically

```tsx
import { useModal } from '@/context/ModalContext';
import { EditBioModal } from '@/components/modals';

function MyComponent() {
  const { openModal, closeModal } = useModal();

  const handleEdit = () => {
    const modalId = openModal({
      component: (
        <EditBioModal
          currentBio={bio}
          onSave={async (data) => {
            await save(data);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  return <button onClick={handleEdit}>Edit</button>;
}
```

## 📦 Available Modals

| Modal | Import | Use Case |
|-------|--------|----------|
| `EditAvatarModal` | `@/components/modals` | Upload profile/business avatar |
| `EditBioModal` | `@/components/modals` | Edit name, username, bio |
| `EditBusinessInfoModal` | `@/components/modals` | Edit business details |
| `EditProductModal` | `@/components/modals` | Full product editor with tabs |
| `QuickEditPriceModal` | `@/components/modals` | Fast price update |
| `EditPostModal` | `@/components/modals` | Edit post caption/hashtags |
| `ConfirmModal` | `@/components/modals` | Confirmation dialogs |

## 🎨 Component Props

### EditButton
```tsx
interface EditButtonProps {
  entityType: EntityType;          // 'profile' | 'business' | 'product' | 'post' | etc.
  entityOwnerId?: string;          // Owner's user ID
  businessId?: string;             // Business context (optional)
  onClick: () => void;             // Click handler
  variant?: 'primary' | 'ghost' | 'icon';  // Style variant
  size?: 'sm' | 'md' | 'lg';      // Button size
  requireOnline?: boolean;         // Disable when offline
}
```

### EditOverlay
```tsx
interface EditOverlayProps {
  entityType: EntityType;
  entityOwnerId?: string;
  businessId?: string;
  onEdit: () => void;
  children: ReactNode;             // Content to overlay
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}
```

### QuickActionMenu
```tsx
interface QuickAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  requirePermission?: 'edit' | 'delete' | 'publish' | 'settings';
}

interface QuickActionMenuProps {
  entityType: EntityType;
  entityOwnerId?: string;
  businessId?: string;
  actions: QuickAction[];
  position?: 'left' | 'right';
}
```

## 🔐 Permission System

### Entity Types
- `profile` - User profiles (owner only)
- `business` - Business info (owner, manager)
- `product` - Products (owner, manager, warehouse)
- `post` - Posts (owner only)
- `collection` - Collections (owner only)
- `story` - Stories (owner only)
- `order` - Orders (owner, manager, dispatcher, customer_service)
- `inventory` - Inventory (owner, manager, warehouse)

### Role Permissions

| Role | Business | Product | Order | Inventory |
|------|----------|---------|-------|-----------|
| business_owner | ✓ All | ✓ All | ✓ All | ✓ All |
| manager | ✓ Most | ✓ All | ✓ All | ✓ All |
| warehouse | ✗ | ✓ Edit | ✓ View | ✓ All |
| dispatcher | ✗ | ✗ | ✓ Edit | ✗ |
| sales | ✗ | ✓ View | ✓ Create | ✗ |

### Check Permissions Manually
```tsx
import { useEditPermissions } from '@/hooks/useEditPermissions';

const permissions = useEditPermissions({
  entityType: 'product',
  entityOwnerId: product.owner_id,
  businessId: product.business_id,
});

if (permissions.canEdit) {
  // Show edit UI
}

if (permissions.canDelete) {
  // Show delete button
}
```

## 🎯 Common Patterns

### Pattern 1: Editable Card with Overlay
```tsx
<EditOverlay
  entityType="product"
  entityOwnerId={product.owner_id}
  onEdit={handleEdit}
>
  <ProductCard product={product} />
</EditOverlay>
```

### Pattern 2: Section with Edit Button
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <h2>About</h2>
  <EditButton
    entityType="profile"
    entityOwnerId={user.id}
    onClick={handleEdit}
    variant="ghost"
    size="sm"
  />
</div>
```

### Pattern 3: List Item with Quick Menu
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <span>{item.name}</span>
  <QuickActionMenu
    entityType="product"
    entityOwnerId={item.owner_id}
    actions={[
      { label: 'Edit', onClick: handleEdit, requirePermission: 'edit' },
      { label: 'Delete', onClick: handleDelete, variant: 'danger', requirePermission: 'delete' },
    ]}
  />
</div>
```

## 🛠️ Creating Custom Modals

```tsx
import { BaseModal } from '@/components/modals/BaseModal';

export function MyCustomModal({ data, onSave, onClose }) {
  const [formData, setFormData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      title="Edit Item"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={isLoading}>
            Save
          </button>
        </>
      }
    >
      {/* Your form fields */}
    </BaseModal>
  );
}
```

## 💡 Tips

1. **Always check permissions** - Components do it automatically
2. **Use appropriate sizes** - sm for simple, lg for complex
3. **Provide feedback** - Show loading states and success messages
4. **Handle errors** - Catch and display user-friendly errors
5. **Keep modals focused** - One clear purpose per modal
6. **Test mobile** - Ensure touch targets are large enough
7. **Use ESC key** - It automatically closes modals
8. **Consider offline** - Use `requireOnline` when needed

## 🚨 Common Mistakes

❌ **Don't:**
```tsx
// Showing edit button without permission check
<button onClick={handleEdit}>Edit</button>

// Forgetting to close modal after save
await onSave(data);
// Missing: closeModal(modalId);

// Not handling loading state
<button onClick={handleSave}>Save</button>
```

✅ **Do:**
```tsx
// Use EditButton with automatic permission check
<EditButton entityType="product" entityOwnerId={owner} onClick={handleEdit} />

// Always close modal after successful save
const handleSave = async (data) => {
  await onSave(data);
  closeModal(modalId);
};

// Show loading state
<button onClick={handleSave} disabled={isLoading}>
  {isLoading ? 'Saving...' : 'Save'}
</button>
```

## 📚 More Info

- Full Guide: `/docs/IN_PAGE_EDITING_GUIDE.md`
- Implementation Details: `/IN_PAGE_EDITING_IMPLEMENTATION.md`
- Example: `/src/pages/EnhancedPublicUserProfile.tsx`
