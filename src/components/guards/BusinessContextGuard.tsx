import React, { ReactNode } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { logger } from '../../lib/logger';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';

interface BusinessContextGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showCreateButton?: boolean;
}

export function BusinessContextGuard({
  children,
  fallback,
  showCreateButton = true
}: BusinessContextGuardProps) {
  const { currentBusinessId, loading, ownedBusinesses, userRole } = useAppServices();

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
        <p style={{ color: 'var(--text-secondary)' }}>Loading business context...</p>
      </div>
    );
  }

  if (!currentBusinessId) {
    logger.warn('[BusinessContextGuard] No business context available', {
      userRole,
      ownedBusinessesCount: ownedBusinesses.length
    });

    if (fallback) {
      return <>{fallback}</>;
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
          fontSize: '3rem',
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
            No Business Selected
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            {ownedBusinesses.length === 0
              ? 'You need to create a business to access this page.'
              : 'Please select a business to continue.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {ownedBusinesses.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                logger.info('[BusinessContextGuard] Redirecting to business selection');
                window.location.href = '/businesses';
              }}
            >
              Select Business
            </Button>
          )}

          {showCreateButton && (
            <Button
              variant="primary"
              onClick={() => {
                logger.info('[BusinessContextGuard] Redirecting to business creation');
                window.location.href = '/businesses/new';
              }}
            >
              {ownedBusinesses.length === 0 ? 'Create Your First Business' : 'Create New Business'}
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
              <strong>Your Businesses:</strong>{' '}
              {ownedBusinesses.map(b => b.name).join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
