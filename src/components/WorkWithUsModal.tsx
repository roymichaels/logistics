import React from 'react';
import { X, Briefcase, Truck, ArrowRight } from 'lucide-react';

interface WorkWithUsModalProps {
  onClose: () => void;
  onSelectBusinessOwner: () => void;
  onSelectDriver: () => void;
}

const PATHWAYS = [
  {
    id: 'business',
    icon: Briefcase,
    title: 'Start Your Business',
    subtitle: 'Become a Business Owner',
    description: 'Create and manage your own business with our professional logistics platform',
    benefits: [
      'Full business and team management',
      'Financial tracking and detailed reports',
      'Control all operational aspects',
      'Build your team and assign roles'
    ],
    color: '#1D9BF0',
    gradient: 'linear-gradient(135deg, rgba(29, 155, 240, 0.2), rgba(29, 155, 240, 0.05))'
  },
  {
    id: 'driver',
    icon: Truck,
    title: 'Become a Driver',
    subtitle: 'Start Earning Today',
    description: 'Work as a delivery driver and start earning immediately',
    benefits: [
      'Receive deliveries and orders',
      'Manage your delivery routes',
      'Track your earnings',
      'Flexible and independent work'
    ],
    color: '#4dd0e1',
    gradient: 'linear-gradient(135deg, rgba(77, 208, 225, 0.2), rgba(77, 208, 225, 0.05))'
  }
];

export function WorkWithUsModal({ onClose, onSelectBusinessOwner, onSelectDriver }: WorkWithUsModalProps) {
  const handleSelect = (pathwayId: string) => {
    if (pathwayId === 'business') {
      onSelectBusinessOwner();
    } else if (pathwayId === 'driver') {
      onSelectDriver();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        overflow: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: '#15202B',
          borderRadius: '20px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#E7E9EA',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div
          style={{
            padding: '40px 32px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}
        >
          <h2
            style={{
              margin: '0 0 12px',
              fontSize: '28px',
              fontWeight: '700',
              color: '#E7E9EA',
              letterSpacing: '-0.5px'
            }}
          >
            Work With Us
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '16px',
              color: '#8899A6',
              lineHeight: '1.5'
            }}
          >
            Choose your path and start your journey with us today
          </p>
        </div>

        {/* Pathway Cards */}
        <div
          style={{
            padding: '32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}
        >
          {PATHWAYS.map((pathway) => {
            const Icon = pathway.icon;
            return (
              <div
                key={pathway.id}
                style={{
                  background: pathway.gradient,
                  border: `1px solid ${pathway.color}40`,
                  borderRadius: '16px',
                  padding: '28px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => handleSelect(pathway.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px ${pathway.color}30`;
                  e.currentTarget.style.borderColor = pathway.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = `${pathway.color}40`;
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: `${pathway.color}20`,
                    border: `2px solid ${pathway.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    color: pathway.color
                  }}
                >
                  <Icon size={28} strokeWidth={2} />
                </div>

                {/* Content */}
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#E7E9EA'
                  }}
                >
                  {pathway.title}
                </h3>
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '14px',
                    color: pathway.color,
                    fontWeight: '600'
                  }}
                >
                  {pathway.subtitle}
                </p>
                <p
                  style={{
                    margin: '0 0 20px',
                    fontSize: '14px',
                    color: '#8899A6',
                    lineHeight: '1.6'
                  }}
                >
                  {pathway.description}
                </p>

                {/* Benefits List */}
                <ul
                  style={{
                    margin: '0 0 24px',
                    padding: '0 0 0 20px',
                    fontSize: '13px',
                    color: '#E7E9EA',
                    lineHeight: '1.8',
                    listStyle: 'none'
                  }}
                >
                  {pathway.benefits.map((benefit, index) => (
                    <li
                      key={index}
                      style={{
                        position: 'relative',
                        paddingLeft: '12px',
                        marginBottom: '8px'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: '-8px',
                          top: '2px',
                          color: pathway.color,
                          fontWeight: '700'
                        }}
                      >
                        ✓
                      </span>
                      {benefit}
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    background: pathway.color,
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(pathway.id);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '24px 32px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center'
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#8899A6',
              lineHeight: '1.6'
            }}
          >
            Not ready yet? You can always access these options from your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
}
