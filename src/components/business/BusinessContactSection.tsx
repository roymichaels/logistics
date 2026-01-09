import React from 'react';
import { Mail, Phone, Edit2 } from 'lucide-react';
import { BusinessRecord } from '../../services/business';

interface BusinessContactSectionProps {
  business: BusinessRecord;
  isOwner: boolean;
  onEdit: () => void;
}

export function BusinessContactSection({
  business,
  isOwner,
  onEdit,
}: BusinessContactSectionProps) {
  if (!business.public_email && !business.public_phone && !isOwner) {
    return null;
  }

  return (
    <div
      style={{
        paddingTop: '32px',
        marginTop: '32px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Contact Information
        </h3>
        {isOwner && (
          <button
            onClick={onEdit}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            }}
          >
            <Edit2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Edit
          </button>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {business.public_email && (
          <a
            href={`mailto:${business.public_email}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              transition: 'all 0.2s',
              textDecoration: 'none',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              flex: '1',
              minWidth: '250px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Mail size={20} color="#3b82f6" />
            </div>
            <div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Email
              </div>
              <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>
                {business.public_email}
              </div>
            </div>
          </a>
        )}
        {business.public_phone && (
          <a
            href={`tel:${business.public_phone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '12px',
              transition: 'all 0.2s',
              textDecoration: 'none',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              flex: '1',
              minWidth: '250px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Phone size={20} color="#22c55e" />
            </div>
            <div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Phone
              </div>
              <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>
                {business.public_phone}
              </div>
            </div>
          </a>
        )}
        {!business.public_email && !business.public_phone && isOwner && (
          <div
            style={{
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '2px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📞</div>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                fontWeight: 600,
                margin: '0 0 8px 0',
              }}
            >
              No contact information yet
            </p>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                margin: 0,
              }}
            >
              Add your email and phone so customers can reach you
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
