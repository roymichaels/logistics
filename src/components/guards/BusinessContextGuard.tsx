import React, { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptionalBusinessContext } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';

interface BusinessContextGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showCreateButton?: boolean;
  requiresOwnership?: boolean;
  redirectTo?: string;
  blockRender?: boolean;
}

export function BusinessContextGuard({
  children,
  fallback,
  showCreateButton = true,
  requiresOwnership = false,
  redirectTo,
  blockRender = false,
}: BusinessContextGuardProps) {
  const businessContext = useOptionalBusinessContext();
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const loading = businessContext?.loading ?? false;
  const activeBusiness = businessContext?.activeBusiness;
  const ownedBusinesses = businessContext?.ownedBusinesses ?? [];
  const isOwner = activeBusiness?.owner_id === user?.id;

  useEffect(() => {
    if (!loading && !activeBusiness && redirectTo) {
      logger.warn('[BusinessContextGuard] Redirecting due to missing business context', {
        redirectTo,
      });
      navigate(redirectTo, { replace: true });
    }
  }, [loading, activeBusiness, redirectTo, navigate]);

  useEffect(() => {
    if (!loading && activeBusiness && requiresOwnership && !isOwner && redirectTo) {
      logger.warn('[BusinessContextGuard] Redirecting due to ownership requirement', {
        businessId: activeBusiness.id,
        requiresOwnership,
        isOwner,
        redirectTo,
      });
      navigate(redirectTo, { replace: true });
    }
  }, [loading, activeBusiness, requiresOwnership, isOwner, redirectTo, navigate]);

  if (blockRender && (!activeBusiness || (requiresOwnership && !isOwner))) {
    return null;
  }

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

  if (!activeBusiness) {
    logger.warn('[BusinessContextGuard] No business context available', {
      role,
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

  if (requiresOwnership && !isOwner) {
    logger.warn('[BusinessContextGuard] User lacks ownership of business', {
      businessId: activeBusiness.id,
      businessName: activeBusiness.name,
      userId: user?.id,
      ownerId: activeBusiness.owner_id,
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
          🔒
        </div>

        <div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--text-primary)'
          }}>
            Owner Access Required
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            This action requires business owner permissions. You are viewing <strong>{activeBusiness.name}</strong> as a staff member.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            logger.info('[BusinessContextGuard] Navigating back from ownership restriction');
            navigate(-1);
          }}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
