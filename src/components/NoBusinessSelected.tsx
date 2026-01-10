import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptionalBusinessContext } from '../context/BusinessContext';
import { Button } from './atoms/Button';
import { Spinner } from './atoms/Spinner';

interface NoBusinessSelectedProps {
  message?: string;
  showCreateButton?: boolean;
}

export function NoBusinessSelected({
  message,
  showCreateButton = true
}: NoBusinessSelectedProps) {
  const navigate = useNavigate();
  const businessContext = useOptionalBusinessContext();

  const loading = businessContext?.loading ?? false;
  const ownedBusinesses = businessContext?.ownedBusinesses ?? [];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '2rem',
        gap: '1rem'
      }}>
        <Spinner size="large" />
        <p style={{ color: 'var(--text-secondary)' }}>טוען עסקים...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '2rem',
      gap: '1.5rem',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '4rem',
        opacity: 0.3
      }}>
        🏢
      </div>

      <div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
          color: 'var(--text-primary)'
        }}>
          לא נבחר עסק
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {message || (ownedBusinesses.length === 0
            ? 'עליך ליצור עסק כדי לגשת לדף זה.'
            : 'נא לבחור עסק כדי להמשיך.')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {ownedBusinesses.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => navigate('/business/businesses')}
          >
            בחר עסק
          </Button>
        )}

        {showCreateButton && (
          <Button
            variant="primary"
            onClick={() => navigate('/business/businesses?action=create')}
          >
            {ownedBusinesses.length === 0 ? 'צור את העסק הראשון שלך' : 'צור עסק חדש'}
          </Button>
        )}
      </div>

      {ownedBusinesses.length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--background-secondary)',
          borderRadius: '8px',
          maxWidth: '500px'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            <strong>העסקים שלך:</strong>{' '}
            {ownedBusinesses.map(b => b.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
