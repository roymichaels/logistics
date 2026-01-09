# In-Page Editing System Guide

This guide explains how to implement in-page editing with permission-based edit buttons and modals throughout the application.

## Overview

The in-page editing system provides:
- **Permission-based edit buttons** that only appear when users have permission
- **Modal-based editing** for focused, distraction-free editing experiences
- **Hover overlays** for contextual edit buttons
- **Quick action menus** for multiple actions (edit, delete, etc.)
- **Mobile-optimized** modal views and interactions

## Core Components

### 1. Modal System

#### ModalProvider & ModalManager
Wrap your app with `ModalProvider` and include `ModalManager`:

```tsx
import { ModalProvider } from '@/context/ModalContext';
import { ModalManager } from '@/components/modals/ModalManager';

function App() {
  return (
    <ModalProvider>
      {/* Your app content */}
      <ModalManager />
    </ModalProvider>
  );
}
```

#### Using Modals

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
            await saveBio(data);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  return <button onClick={handleEdit}>Edit Bio</button>;
}
```

### 2. Permission System

#### useEditPermissions Hook

```tsx
import { useEditPermissions } from '@/hooks/useEditPermissions';

const permissions = useEditPermissions({
  entityType: 'product',
  entityOwnerId: product.owner_id,
  businessId: product.business_id,
  requireOnline: false,
});

// permissions.canEdit - boolean
// permissions.canDelete - boolean
// permissions.canPublish - boolean
// permissions.canManageMedia - boolean
// permissions.canManageSettings - boolean
```

**Entity Types:**
- `profile` - User profiles
- `business` - Business information
- `product` - Product catalog items
- `post` - Social posts
- `collection` - Content collections
- `story` - Stories
- `order` - Orders
- `inventory` - Inventory items

### 3. Edit Button Components

#### EditButton - Standard Edit Button

```tsx
import { EditButton } from '@/components/edit';

<EditButton
  entityType="product"
  entityOwnerId={product.owner_id}
  onClick={handleEdit}
  variant="primary" // 'primary' | 'ghost' | 'icon'
  size="md" // 'sm' | 'md' | 'lg'
/>
```

#### EditOverlay - Hover Edit Button

```tsx
import { EditOverlay } from '@/components/edit';

<EditOverlay
  entityType="profile"
  entityOwnerId={user.id}
  onEdit={handleEditAvatar}
  position="top-right" // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
>
  <img src={avatar} alt="Avatar" />
</EditOverlay>
```

#### QuickActionMenu - Three-Dot Menu

```tsx
import { QuickActionMenu } from '@/components/edit';
import { Pencil, Trash2, Share2 } from 'lucide-react';

<QuickActionMenu
  entityType="post"
  entityOwnerId={post.author_id}
  actions={[
    {
      label: 'Edit Post',
      icon: <Pencil size={16} />,
      onClick: handleEdit,
      requirePermission: 'edit',
    },
    {
      label: 'Share',
      icon: <Share2 size={16} />,
      onClick: handleShare,
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

## Available Modals

### Profile Modals

#### EditAvatarModal
```tsx
import { EditAvatarModal } from '@/components/modals';

<EditAvatarModal
  currentAvatar={profile.avatar_url}
  onSave={async (file: File) => {
    await uploadAvatar(file);
  }}
  onClose={() => closeModal(id)}
/>
```

#### EditBioModal
```tsx
import { EditBioModal } from '@/components/modals';

<EditBioModal
  currentBio={profile.bio}
  currentDisplayName={profile.name}
  currentUsername={profile.username}
  onSave={async (data) => {
    await updateProfile(data);
  }}
  onClose={() => closeModal(id)}
  maxBioLength={150}
/>
```

### Business Modals

#### EditBusinessInfoModal
```tsx
import { EditBusinessInfoModal } from '@/components/modals';

<EditBusinessInfoModal
  currentData={{
    name: business.name,
    description: business.description,
    category: business.category,
    tags: business.tags,
  }}
  onSave={async (data) => {
    await updateBusiness(data);
  }}
  onClose={() => closeModal(id)}
/>
```

### Product Modals

#### EditProductModal - Full Product Editor
```tsx
import { EditProductModal } from '@/components/modals';

<EditProductModal
  product={product}
  onSave={async (updates) => {
    await updateProduct(product.id, updates);
  }}
  onClose={() => closeModal(id)}
/>
```

#### QuickEditPriceModal - Fast Price Update
```tsx
import { QuickEditPriceModal } from '@/components/modals';

<QuickEditPriceModal
  productName={product.name}
  currentPrice={product.price}
  onSave={async (newPrice) => {
    await updatePrice(product.id, newPrice);
  }}
  onClose={() => closeModal(id)}
/>
```

### Post Modals

#### EditPostModal
```tsx
import { EditPostModal } from '@/components/modals';

<EditPostModal
  post={post}
  onSave={async (updates) => {
    await updatePost(post.id, updates);
  }}
  onClose={() => closeModal(id)}
/>
```

## Complete Examples

### Example 1: Editable Product Card

```tsx
import { EditOverlay, QuickActionMenu } from '@/components/edit';
import { useModal } from '@/context/ModalContext';
import { EditProductModal, QuickEditPriceModal } from '@/components/modals';
import { Pencil, DollarSign, Trash2, Archive } from 'lucide-react';

function ProductCard({ product }) {
  const { openModal, closeModal } = useModal();
  const { user } = useAuth();

  const handleEditProduct = () => {
    const modalId = openModal({
      component: (
        <EditProductModal
          product={product}
          onSave={async (updates) => {
            await updateProduct(product.id, updates);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleQuickEditPrice = () => {
    const modalId = openModal({
      component: (
        <QuickEditPriceModal
          productName={product.name}
          currentPrice={product.price}
          onSave={async (newPrice) => {
            await updateProductPrice(product.id, newPrice);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <EditOverlay
        entityType="product"
        entityOwnerId={product.owner_id}
        businessId={product.business_id}
        onEdit={handleEditProduct}
        position="top-right"
      >
        <img src={product.image} alt={product.name} />
      </EditOverlay>

      <div>
        <h3>{product.name}</h3>
        <p>${product.price}</p>
      </div>

      <QuickActionMenu
        entityType="product"
        entityOwnerId={product.owner_id}
        businessId={product.business_id}
        actions={[
          {
            label: 'Edit Product',
            icon: <Pencil size={16} />,
            onClick: handleEditProduct,
            requirePermission: 'edit',
          },
          {
            label: 'Quick Edit Price',
            icon: <DollarSign size={16} />,
            onClick: handleQuickEditPrice,
            requirePermission: 'edit',
          },
          {
            label: 'Archive',
            icon: <Archive size={16} />,
            onClick: handleArchive,
            requirePermission: 'settings',
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
    </div>
  );
}
```

### Example 2: Editable Business Profile

```tsx
import { EditButton } from '@/components/edit';
import { useModal } from '@/context/ModalContext';
import { EditBusinessInfoModal } from '@/components/modals';

function BusinessProfile({ business }) {
  const { openModal, closeModal } = useModal();
  const { user } = useAuth();

  const handleEditInfo = () => {
    const modalId = openModal({
      component: (
        <EditBusinessInfoModal
          currentData={{
            name: business.name,
            description: business.description,
            category: business.category,
            tags: business.tags,
          }}
          onSave={async (data) => {
            await updateBusinessInfo(business.id, data);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>{business.name}</h1>
        <EditButton
          entityType="business"
          entityOwnerId={business.owner_id}
          onClick={handleEditInfo}
          variant="ghost"
          size="md"
        />
      </div>
      <p>{business.description}</p>
    </div>
  );
}
```

## Best Practices

1. **Always check permissions** - Use `useEditPermissions` or rely on the built-in permission checking in edit components

2. **Provide feedback** - Show loading states and success messages after saves

3. **Handle errors gracefully** - Catch errors and show user-friendly messages

4. **Keep modals focused** - Each modal should have a clear, single purpose

5. **Use appropriate sizes** - Choose modal sizes based on content:
   - `sm` - Simple forms (Quick edit price)
   - `md` - Standard forms (Edit bio)
   - `lg` - Forms with multiple sections (Edit business info)
   - `xl` - Complex forms with tabs (Edit product)
   - `full` - Full-featured editors

6. **Mobile optimization** - Test on mobile devices; modals automatically adapt

7. **Keyboard shortcuts** - ESC closes modals, Enter submits forms

## Permission Roles

The system respects these role hierarchies:

### Business Context
- `business_owner` - Full access to business entities
- `manager` - Most business operations (limited settings)
- `warehouse` - Inventory and stock management
- `dispatcher` - Order assignments
- `sales` - Customer and order management
- `customer_service` - Support operations

### Personal Context
- Entity owners always have full permissions for their own content
- Posts, profiles, collections are editable only by the owner

## Creating Custom Modals

To create a new modal, extend the `BaseModal` component:

```tsx
import { BaseModal } from '@/components/modals/BaseModal';

interface MyCustomModalProps {
  data: any;
  onSave: (updates: any) => Promise<void>;
  onClose: () => void;
}

export function MyCustomModal({ data, onSave, onClose }: MyCustomModalProps) {
  const [formData, setFormData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
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
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      {/* Your form fields here */}
    </BaseModal>
  );
}
```

## Testing

Test your implementations:

1. **Permission checks** - Verify edit buttons only show for authorized users
2. **Modal interactions** - Test open, edit, save, cancel flows
3. **Error handling** - Verify error states display correctly
4. **Mobile experience** - Test on mobile viewports
5. **Keyboard navigation** - Verify ESC and Enter work as expected

## Migration from Old System

If you have existing edit functionality:

1. Replace settings-based editing with in-page buttons
2. Convert existing modals to use the new BaseModal
3. Add permission checks using useEditPermissions
4. Update save handlers to use the new modal system
5. Remove old modal state management code

## Support

For issues or questions, refer to:
- Source code in `/src/components/modals/`
- Source code in `/src/components/edit/`
- Example implementation in `/src/pages/EnhancedPublicUserProfile.tsx`
