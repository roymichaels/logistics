import React from 'react';
import { Modal } from '../../components/primitives/Modal';
import { ModalHeader } from '../../components/primitives/modal-parts/ModalHeader';
import { ModalBody } from '../../components/primitives/modal-parts/ModalBody';
import { ModalFooter } from '../../components/primitives/modal-parts/ModalFooter';
import { toModalProps } from '../../adapters/modals/TelegramModalAdapter';
import Legacy from '../../components/TelegramModal';

export default function TelegramModalMigration(props: any) {
  const mapped = toModalProps(props);
  const content = mapped.children || props.children || <Legacy {...props} />;
  const actions = mapped.footer || mapped.actions;

  return (
    <Modal isOpen={mapped.isOpen} onClose={mapped.onClose}>
      <ModalHeader title={mapped.title} subtitle={mapped.subtitle} onClose={mapped.onClose} />
      <ModalBody>{content}</ModalBody>
      {actions && <ModalFooter>{actions}</ModalFooter>}
    </Modal>
  );
}
