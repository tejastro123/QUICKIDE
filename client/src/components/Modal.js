import React from 'react';
import './Modal.css';

function Modal({ isOpen, onClose, title, children, actions }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container glassmorphic" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {actions && (
          <div className="modal-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
