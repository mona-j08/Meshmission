import React from 'react';

export default function ConfirmationModal({ 
  isOpen, 
  title = 'Are you sure?', 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  isDanger = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-overlay">
      <div className="modal-content-container confirmation-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={isDanger ? 'btn-danger' : 'btn-primary'} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
