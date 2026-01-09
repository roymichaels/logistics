import React, { useState } from 'react';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { EditButton, EditOverlay, QuickActionMenu } from '@/components/edit';
import {
  EditBioModal,
  EditBusinessInfoModal,
  EditBusinessHoursModal,
  EditBusinessLocationModal,
  EditProductModal,
  QuickEditPriceModal,
  ImageUploadModal,
  ConfirmModal,
} from '@/components/modals';
import { FormField, Input, Textarea } from '@/components/forms';
import { useFormValidation } from '@/hooks/useFormValidation';
import { Pencil, Trash2, Image, Clock, MapPin, DollarSign } from 'lucide-react';

export function EditingSystemDemo() {
  const { openModal, closeModal } = useModal();
  const toast = useToast();

  const demoProduct = {
    id: '1',
    name: 'Sample Product',
    description: 'A great product',
    price: 29.99,
    stock_quantity: 100,
    sku: 'PROD-001',
    category: 'electronics',
    is_active: true,
    owner_id: 'user123',
  };

  const demoBusiness = {
    name: 'My Store',
    description: 'A wonderful store',
    category: 'retail',
    tags: ['quality', 'fast'],
  };

  const handleEditBio = () => {
    const modalId = openModal({
      component: (
        <EditBioModal
          currentBio="Hello, I'm a demo user!"
          currentDisplayName="Demo User"
          currentUsername="demouser"
          onSave={async (data) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Profile updated successfully!', 'Success');
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleEditBusinessInfo = () => {
    const modalId = openModal({
      component: (
        <EditBusinessInfoModal
          currentData={demoBusiness}
          onSave={async (data) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Business information updated!');
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleEditBusinessHours = () => {
    const modalId = openModal({
      component: (
        <EditBusinessHoursModal
          currentHours={{
            monday: { open: '09:00', close: '17:00' },
            tuesday: { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday: { open: '09:00', close: '17:00' },
            friday: { open: '09:00', close: '17:00' },
            saturday: { open: '10:00', close: '16:00' },
            sunday: { open: '10:00', close: '16:00', closed: true },
          }}
          onSave={async (hours) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Business hours updated!');
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleEditLocation = () => {
    const modalId = openModal({
      component: (
        <EditBusinessLocationModal
          currentLocation={{
            address: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94102',
            country: 'USA',
          }}
          onSave={async (location) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Location updated!');
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleEditProduct = () => {
    const modalId = openModal({
      component: (
        <EditProductModal
          product={demoProduct}
          onSave={async (updates) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Product updated successfully!');
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
          productName={demoProduct.name}
          currentPrice={demoProduct.price}
          onSave={async (newPrice) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success(`Price updated to $${newPrice.toFixed(2)}!`);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleUploadImages = () => {
    const modalId = openModal({
      component: (
        <ImageUploadModal
          title="Upload Product Images"
          maxImages={5}
          onSave={async (files) => {
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success(`${files.length} image(s) uploaded successfully!`);
            closeModal(modalId);
          }}
          onClose={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleDelete = () => {
    const modalId = openModal({
      component: (
        <ConfirmModal
          title="Delete Product"
          message="Are you sure you want to delete this product? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Product deleted successfully');
            closeModal(modalId);
          }}
          onCancel={() => closeModal(modalId)}
        />
      ),
    });
  };

  const handleShowToasts = () => {
    toast.success('This is a success message!');
    setTimeout(() => toast.error('This is an error message!'), 500);
    setTimeout(() => toast.warning('This is a warning message!'), 1000);
    setTimeout(() => toast.info('This is an info message!'), 1500);
  };

  const { errors, validateForm, setFieldTouched, getFieldError } = useFormValidation({
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    message: {
      required: true,
      minLength: 10,
      maxLength: 500,
    },
  });

  const [formData, setFormData] = useState({ email: '', message: '' });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        In-Page Editing System Demo
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Edit Buttons
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <EditButton
              entityType="profile"
              entityOwnerId="user123"
              onClick={handleEditBio}
              variant="primary"
              size="md"
            />
            <EditButton
              entityType="business"
              entityOwnerId="user123"
              onClick={handleEditBusinessInfo}
              variant="ghost"
              size="md"
            />
            <EditButton
              entityType="product"
              entityOwnerId="user123"
              onClick={handleEditProduct}
              variant="icon"
              size="lg"
            />
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Edit Overlay (Hover over the image)
          </h2>
          <EditOverlay
            entityType="product"
            entityOwnerId="user123"
            onEdit={handleEditProduct}
            position="top-right"
          >
            <div
              style={{
                width: '300px',
                height: '200px',
                backgroundColor: '#E5E7EB',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image size={48} style={{ color: '#9CA3AF' }} />
            </div>
          </EditOverlay>
        </section>

        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Quick Action Menu
          </h2>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Sample Product</span>
            <QuickActionMenu
              entityType="product"
              entityOwnerId="user123"
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
                  label: 'Delete',
                  icon: <Trash2 size={16} />,
                  onClick: handleDelete,
                  variant: 'danger',
                  requirePermission: 'delete',
                },
              ]}
            />
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Business Modals
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleEditBusinessInfo}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Pencil size={16} />
              Edit Business Info
            </button>
            <button
              onClick={handleEditBusinessHours}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Clock size={16} />
              Edit Business Hours
            </button>
            <button
              onClick={handleEditLocation}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <MapPin size={16} />
              Edit Location
            </button>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Product Modals
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleEditProduct}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#10B981',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Full Product Editor
            </button>
            <button
              onClick={handleQuickEditPrice}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#10B981',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Quick Price Edit
            </button>
            <button
              onClick={handleUploadImages}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#10B981',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Upload Images
            </button>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Toast Notifications
          </h2>
          <button
            onClick={handleShowToasts}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#8B5CF6',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Show All Toast Types
          </button>
        </section>

        <section>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Form Components with Validation
          </h2>
          <div style={{ maxWidth: '400px' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateForm(formData)) {
                  toast.success('Form is valid!');
                } else {
                  toast.error('Please fix the errors');
                }
              }}
            >
              <FormField
                label="Email"
                error={getFieldError('email')}
                required
              >
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={() => setFieldTouched('email')}
                  error={!!getFieldError('email')}
                  placeholder="your@email.com"
                />
              </FormField>

              <FormField
                label="Message"
                error={getFieldError('message')}
                hint="Minimum 10 characters"
                required
                className="mt-4"
              >
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  onBlur={() => setFieldTouched('message')}
                  error={!!getFieldError('message')}
                  placeholder="Your message..."
                  rows={4}
                  maxLength={500}
                  showCount
                  currentLength={formData.message.length}
                />
              </FormField>

              <button
                type="submit"
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Submit Form
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
