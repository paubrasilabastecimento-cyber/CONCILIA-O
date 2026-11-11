import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, ActionLog, firebaseConfig } from '../firebase';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'historico_acoes'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const list: ActionLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ActionLog);
      });
      setLogs(list);
    } catch (e) {
      console.error('Erro ao buscar histórico:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: '#FFC000',
            margin: '-20px -20px 14px -20px',
            padding: '12px 18px',
            fontWeight: 'bold',
            fontSize: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Histórico de Atividades no Banco de Dados</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '12px', fontSize: '12.5px', color: '#444' }}>
          <b>Projeto Firebase:</b> <code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{firebaseConfig.projectId}</code>
          <br />
          <span style={{ color: '#008040' }}>● Gravação e auditoria em tempo real ativadas.</span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #ddd', borderRadius: '4px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Carregando histórico do Firebase...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              Nenhum registro encontrado ainda. Qualquer alteração ou importação será registrada aqui automaticamente!
            </div>
          ) : (
            <table style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: '130px' }}>Data / Hora</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', width: '160px' }}>Ação</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px', color: '#666', whiteSpace: 'nowrap' }}>
                      {log.dateStr}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#000' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '6px 8px', color: '#333' }}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={fetchLogs}
            style={{
              background: '#f0f0f0',
              border: '1px solid #ccc',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ↻ Atualizar
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#FFC000',
              border: '1px solid #c79700',
              padding: '6px 16px',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
