import React from 'react';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';

export default function AdminModal({ open, onClose, title, onSubmit, loading, submitText = 'Save', children, size = 'lg' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} loading={loading}>{submitText}</Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
