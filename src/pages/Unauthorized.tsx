import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppServices } from '../context/AppServicesContext';
import { getEntryPointForRole } from '../routing/UnifiedRouter';
import { UserRole } from '../shells/types';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAppServices();

  const handleGoHome = () => {
    const entryPoint = getEntryPointForRole(userRole as UserRole);
    navigate(entryPoint);
  };

  const attemptedPath = (location.state as any)?.from?.pathname || 'unknown';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#15202B',
        color: '#E7E9EA',
        padding: '20px',
        textAlign: 'center'
      }}
    >
      <div style={{ maxWidth: '600px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '16px',
            color: '#E7E9EA'
          }}
        >
          Access Denied
        </h1>
        <p
          style={{
            fontSize: '16px',
            marginBottom: '12px',
            color: '#8899A6',
            lineHeight: '1.5'
          }}
        >
          You don't have permission to access this page.
        </p>
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            borderRadius: '12px',
            marginBottom: '32px',
            fontSize: '14px',
            color: '#ff9500'
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Your role:</strong> {userRole || 'Not authenticated'}
          </p>
          <p style={{ margin: '8px 0 0 0' }}>
            <strong>Attempted path:</strong> {attemptedPath}
          </p>
        </div>
        <button
          onClick={handleGoHome}
          style={{
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 700,
            backgroundColor: '#1DA1F2',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            minHeight: '44px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            transition: 'all 200ms ease-in-out'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#1A8CD8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#1DA1F2';
          }}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
