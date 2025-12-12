import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  label?: string;
  onClick?: () => void;
}

export const GetVerifiedButton: React.FC<Props> = ({ label = 'Get Verified', onClick }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onClick) return onClick();
    navigate('/store/kyc/start');
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 999,
        border: '1px solid rgba(29,155,240,0.4)',
        background: 'linear-gradient(135deg, rgba(29,155,240,0.95), rgba(0,183,255,0.9))',
        color: '#0b1020',
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(29,155,240,0.35)'
      }}
    >
      <span>🔒</span>
      <span>{label}</span>
    </button>
  );
};

export default GetVerifiedButton;
