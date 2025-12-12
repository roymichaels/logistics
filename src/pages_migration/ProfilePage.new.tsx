import React, { useEffect } from 'react';
import UnifiedShellRouter from '../migration/UnifiedShellRouter';
import { Surface } from '../components/layout/Surface';
import { Section } from '../components/primitives/Section';
import { Card } from '../components/primitives/Card';
import { usePageTitle } from '../hooks/usePageTitle';
import type { User } from '../data/types';
import { useNavController } from '../migration/controllers/navController';
import { useDataSandbox } from '../migration/data/useDataSandbox';

type ProfilePageNewProps = {
  user?: User;
};

function ProfilePageNewContent({ user }: ProfilePageNewProps) {
  const { setTitle, setSubtitle } = usePageTitle();
  const nav = useNavController();
  const sandbox = useDataSandbox();
  const profileUser = sandbox.active ? sandbox.sandbox.user : user;

  useEffect(() => {
    setTitle('Profile');
    setSubtitle(profileUser?.name || profileUser?.username || 'User');
  }, [setTitle, setSubtitle, profileUser?.name, profileUser?.username]);

  return (
    <Surface>
      <Section title="פרופיל">
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              onClick={() => nav.push('profileMenu', { user: profileUser })}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              🙂
            </div>
            <div>
              <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{profileUser?.name || 'Username'}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>@{profileUser?.username || 'handle'}</div>
            </div>
          </div>
        </Card>
      </Section>

      <Section title="סטטוס">
        <Card>
          <div style={{ color: 'var(--color-text)' }}>KYC Status: Pending</div>
        </Card>
      </Section>

      <Section title="נתונים">
        <Card>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ color: 'var(--color-text)' }}>Orders: —</div>
            <div style={{ color: 'var(--color-text)' }}>Inventory: —</div>
            <div style={{ color: 'var(--color-text)' }}>Performance: —</div>
          </div>
        </Card>
      </Section>

      <Section title="הגדרות">
        <Card>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ color: 'var(--color-text)' }}>Language: —</div>
            <div style={{ color: 'var(--color-text)' }}>Notifications: —</div>
            <div style={{ color: 'var(--color-text)' }}>Privacy: —</div>
          </div>
        </Card>
      </Section>
    </Surface>
  );
}

export function ProfilePageNew(props: ProfilePageNewProps) {
  return (
    <UnifiedShellRouter>
      <ProfilePageNewContent {...props} />
    </UnifiedShellRouter>
  );
}

export default ProfilePageNew;
