import React from 'react';
import { Button, Section, Text, Avatar } from '../atoms';
import { Card } from '../molecules';

export interface ProfilePageTemplateProps {
  user: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
  };
  onEditProfile?: () => void;
  onLogout?: () => void;
  loading?: boolean;
}

export function ProfilePageTemplate({
  user,
  onEditProfile,
  onLogout,
  loading = false,
}: ProfilePageTemplateProps) {
  if (loading) {
    return (
      <Section spacing="lg">
        <Text>Loading profile...</Text>
      </Section>
    );
  }

  return (
    <div>
      <Section spacing="lg">
        <Card>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Avatar size="lg" src={user.avatar} alt={user.name || 'User'} />
            <Text variant="h2" weight="bold" style={{ marginTop: '16px' }}>
              {user.name || 'Anonymous User'}
            </Text>
            <Text variant="body" color="secondary">
              {user.email || 'No email provided'}
            </Text>
          </div>
        </Card>
      </Section>

      <Section spacing="md">
        <Card>
          <div style={{ padding: '24px' }}>
            <Text variant="h3" weight="semibold" style={{ marginBottom: '16px' }}>
              Account Information
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Text variant="small" color="secondary">
                  Email
                </Text>
                <Text variant="body">{user.email || 'Not provided'}</Text>
              </div>
              <div>
                <Text variant="small" color="secondary">
                  Phone
                </Text>
                <Text variant="body">{user.phone || 'Not provided'}</Text>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      <Section spacing="md">
        <div style={{ display: 'flex', gap: '12px' }}>
          {onEditProfile && (
            <Button variant="primary" fullWidth onClick={onEditProfile}>
              Edit Profile
            </Button>
          )}
          {onLogout && (
            <Button variant="secondary" fullWidth onClick={onLogout}>
              Logout
            </Button>
          )}
        </div>
      </Section>
    </div>
  );
}
