import React from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isAlertOnly?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isAlertOnly = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ background: '#FFC000', margin: '-20px -20px 14px -20px', padding: '10px 16px', fontWeight: 'bold', fontSize: '15px' }}>
          {title}
        </div>
        <div style={{ margin: '14px 0 20px', fontSize: '13.5px', lineHeight: 1.4, color: '#222' }}>
          {message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {!isAlertOnly && (
            <button
              onClick={onCancel}
              style={{
                background: '#eee',
                border: '1px solid #ccc',
                padding: '7px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                fontSize: '12px'
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              background: '#FFC000',
              border: '1px solid #c79700',
              padding: '7px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'inherit',
              fontSize: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
