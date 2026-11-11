import React, { useState } from 'react';
import { Modal } from './Modal';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onConfirm, title = 'Ação Protegida' }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = () => {
    if (password === '@Bud0102') {
      setError(false);
      setPassword('');
      onConfirm();
      onClose();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      message={
        <div style={{ marginTop: '10px' }}>
          <p style={{ marginBottom: '10px', fontSize: '14px' }}>Esta ação requer autenticação para proteger dados sensíveis.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a senha"
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: error ? '1px solid #d32f2f' : '1px solid #ccc',
              boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>Senha incorreta!</p>}
        </div>
      }
      onConfirm={handleConfirm}
      onCancel={() => {
        setError(false);
        setPassword('');
        onClose();
      }}
    />
  );
};
