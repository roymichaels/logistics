import React, { useState } from 'react';
import { PageTemplate } from '../components/templates';
import { Button, Input, Text, Badge, Avatar, Divider, Spinner, Skeleton } from '../components/atoms';
import { Card, CardHeader, FormField, Modal, SearchBar, toast, ToastContainer } from '../components/molecules';
import { StatCard, DataTable, EmptyState } from '../components/organisms';
import { colors, spacing } from '../styles/design-system';

export function ComponentShowcase() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');

  const sampleData = [
    { id: '1', name: 'John Doe', role: 'Admin', status: 'active' },
    { id: '2', name: 'Jane Smith', role: 'User', status: 'pending' },
    { id: '3', name: 'Bob Johnson', role: 'Manager', status: 'active' },
  ];

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    {
      key: 'status',
      label: 'Status',
      render: (item: any) => <Badge status={item.status}>{item.status}</Badge>,
    },
  ];

  return (
    <>
      <PageTemplate
        title="Component Showcase"
        subtitle="Live examples of all Atomic Design components"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['4xl'] }}>
          {/* Typography */}
          <Card>
            <CardHeader title="Typography" subtitle="Text components and variants" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <Text variant="h1">Heading 1</Text>
              <Text variant="h2">Heading 2</Text>
              <Text variant="h3">Heading 3</Text>
              <Text variant="h4">Heading 4</Text>
              <Text variant="body">Body text - This is the standard body text style</Text>
              <Text variant="small">Small text - Used for secondary information</Text>
              <Text variant="caption">Caption - Used for metadata and timestamps</Text>
            </div>
          </Card>

          {/* Buttons */}
          <Card>
            <CardHeader title="Buttons" subtitle="All button variants and sizes" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  Variants
                </Text>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  Sizes
                </Text>
                <div style={{ display: 'flex', gap: spacing.md, alignItems: 'center' }}>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  States
                </Text>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                  <Button leftIcon="➕">With Icon</Button>
                  <Button rightIcon="→">Right Icon</Button>
                  <Button fullWidth>Full Width</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader title="Badges" subtitle="Status indicators and labels" />
            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="neutral">Neutral</Badge>
              <Badge status="completed">Completed</Badge>
              <Badge status="pending">Pending</Badge>
              <Badge status="in-progress">In Progress</Badge>
            </div>
          </Card>

          {/* Form Components */}
          <Card>
            <CardHeader title="Form Components" subtitle="Inputs and form fields" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <Input placeholder="Basic input" />
              <Input placeholder="With left icon" leftIcon="🔍" />
              <Input placeholder="With right icon" rightIcon="✓" />
              <Input placeholder="Error state" error />
              <Input disabled placeholder="Disabled input" />
              <SearchBar placeholder="Search..." onSearch={(value) => console.log(value)} />
              <FormField
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                hint="We'll never share your email"
                required
              />
            </div>
          </Card>

          {/* Avatars */}
          <Card>
            <CardHeader title="Avatars" subtitle="User profile images" />
            <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center' }}>
              <Avatar fallback="John Doe" size={40} />
              <Avatar fallback="Jane Smith" size={48} online />
              <Avatar fallback="Bob" size={56} />
              <Avatar fallback="Alice Johnson" size={64} online />
            </div>
          </Card>

          {/* Loading States */}
          <Card>
            <CardHeader title="Loading States" subtitle="Spinners and skeletons" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  Spinners
                </Text>
                <div style={{ display: 'flex', gap: spacing.lg, alignItems: 'center' }}>
                  <Spinner size={20} />
                  <Spinner size={32} />
                  <Spinner size={48} />
                </div>
              </div>

              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  Skeletons
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                  <Skeleton width="100%" height="16px" />
                  <Skeleton width="80%" height="16px" />
                  <Skeleton width="60%" height="16px" />
                  <Skeleton width="50px" height="50px" variant="circular" />
                </div>
              </div>
            </div>
          </Card>

          {/* Modal */}
          <Card>
            <CardHeader title="Modal" subtitle="Dialog and popup system" />
            <Button onClick={() => setShowModal(true)}>Open Modal</Button>
          </Card>

          {/* Toast Notifications */}
          <Card>
            <CardHeader title="Toast Notifications" subtitle="Feedback messages" />
            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
              <Button variant="success" onClick={() => toast.success('Success message!')}>
                Success Toast
              </Button>
              <Button variant="danger" onClick={() => toast.error('Error message!')}>
                Error Toast
              </Button>
              <Button variant="warning" onClick={() => toast.warning('Warning message!')}>
                Warning Toast
              </Button>
              <Button variant="secondary" onClick={() => toast.info('Info message!')}>
                Info Toast
              </Button>
            </div>
          </Card>

          {/* Stat Cards */}
          <Card>
            <CardHeader title="Stat Cards" subtitle="Dashboard metrics display" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: spacing.lg,
              }}
            >
              <StatCard
                title="Total Users"
                value="1,234"
                icon="👥"
                trend={{ value: 12, isPositive: true }}
              />
              <StatCard
                title="Revenue"
                value="$45,678"
                icon="💰"
                trend={{ value: 8, isPositive: true }}
              />
              <StatCard
                title="Active Orders"
                value="89"
                icon="📦"
                trend={{ value: 3, isPositive: false }}
              />
            </div>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader title="Data Table" subtitle="Feature-rich table component" />
            <DataTable
              columns={columns}
              data={sampleData}
              keyExtractor={(item) => item.id}
              onRowClick={(item) => toast.info(`Clicked: ${item.name}`)}
            />
          </Card>

          {/* Empty State */}
          <Card>
            <CardHeader title="Empty State" subtitle="No data displays" />
            <EmptyState
              icon="📭"
              title="No items found"
              description="There are no items to display at the moment"
              action={{
                label: 'Create New Item',
                onClick: () => toast.info('Create action clicked!'),
              }}
            />
          </Card>

          {/* Design Tokens */}
          <Card>
            <CardHeader title="Design Tokens" subtitle="Colors and spacing" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  Colors
                </Text>
                <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                  <ColorSwatch color={colors.brand.primary} label="Primary" />
                  <ColorSwatch color={colors.status.success} label="Success" />
                  <ColorSwatch color={colors.status.warning} label="Warning" />
                  <ColorSwatch color={colors.status.error} label="Error" />
                  <ColorSwatch color={colors.status.info} label="Info" />
                </div>
              </div>

              <div>
                <Text variant="small" color="secondary" style={{ marginBottom: spacing.md }}>
                  Spacing Scale
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  <SpacingDemo size="xs" />
                  <SpacingDemo size="sm" />
                  <SpacingDemo size="md" />
                  <SpacingDemo size="lg" />
                  <SpacingDemo size="xl" />
                  <SpacingDemo size="2xl" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </PageTemplate>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Example Modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowModal(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <Text>This is a modal example with a title, content, and footer buttons.</Text>
        <div style={{ marginTop: spacing.lg }}>
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
        </div>
      </Modal>

      <ToastContainer />
    </>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xs }}>
      <div
        style={{
          width: '60px',
          height: '60px',
          background: color,
          borderRadius: '8px',
          border: `1px solid ${colors.border.primary}`,
        }}
      />
      <Text variant="caption">{label}</Text>
    </div>
  );
}

function SpacingDemo({ size }: { size: keyof typeof spacing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
      <Text variant="small" color="secondary" style={{ width: '40px' }}>
        {size}
      </Text>
      <div
        style={{
          width: spacing[size],
          height: '20px',
          background: colors.brand.primary,
          borderRadius: '4px',
        }}
      />
      <Text variant="caption">{spacing[size]}</Text>
    </div>
  );
}
