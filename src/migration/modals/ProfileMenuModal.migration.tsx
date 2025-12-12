import React from 'react';
import { Modal } from '../../components/primitives/Modal';
import { ModalHeader } from '../../components/primitives/modal-parts/ModalHeader';
import { ModalBody } from '../../components/primitives/modal-parts/ModalBody';

export default function ProfileMenuModalMigration(props: any) {
  const { isOpen, onClose } = props;
  return (
    <Modal isOpen={!!isOpen} onClose={onClose}>
      <ModalHeader title="Profile" onClose={onClose} />
      <ModalBody>
        <div style={{ display: 'grid', gap: 8, color: 'var(--color-text)' }}>
          <button style={buttonStyle} onClick={onClose}>View profile</button>
          <button style={buttonStyle} onClick={onClose}>Settings</button>
          <button style={buttonStyle} onClick={onClose}>Logout</button>
        </div>
      </ModalBody>
    </Modal>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  textAlign: 'left',
  cursor: 'pointer'
};
