import React from 'react';
import { X } from 'lucide-react';

function Modal({ isOpen, onClose, title, children, actions }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '4px 0' }}>
          {children}
        </div>

        {actions && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
