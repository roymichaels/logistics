import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptionalBusinessContext } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
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
  const { role } = useAuth();

  const loading = businessContext?.loading ?? false;
  const ownedBusinesses = businessContext?.ownedBusinesses ?? [];
  const isBusinessOwner = role === 'business_owner';

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

  const defaultMessage = ownedBusinesses.length === 0
    ? (isBusinessOwner
        ? 'עליך ליצור עסק כדי להתחיל. תפקידך מחייב הקשר עסקי פעיל.'
        : 'תפקידך מחייב הקשר עסקי. אנא פנה לבעל העסק להוספתך לעסק.')
    : 'נא לבחור עסק כדי להמשיך. כל התכונות זמינות רק בהקשר עסקי פעיל.';

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
          נדרש הקשר עסקי
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          maxWidth: '500px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          {message || defaultMessage}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {ownedBusinesses.length > 0 && (
          <Button
            variant="primary"
            onClick={() => navigate('/business/businesses')}
          >
            בחר עסק
          </Button>
        )}

        {showCreateButton && isBusinessOwner && (
          <Button
            variant={ownedBusinesses.length === 0 ? 'primary' : 'secondary'}
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

      {!isBusinessOwner && ownedBusinesses.length === 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--warning-background)',
          border: '1px solid var(--warning-border)',
          borderRadius: '8px',
          maxWidth: '500px'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--warning-text)',
            margin: 0
          }}>
            <strong>שים לב:</strong> תפקידך ({role}) דורש שיוך לעסק קיים. בעל העסק צריך להוסיף אותך לעסק שלו.
          </p>
        </div>
      )}
    </div>
  );
}
