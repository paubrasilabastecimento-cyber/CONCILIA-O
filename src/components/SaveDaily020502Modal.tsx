import React, { useState, useEffect } from 'react';
import { DashboardSnapshot, RawData, CalculatedProduct } from '../data/types';
import { X, Save, Calendar, Check, AlertCircle } from 'lucide-react';
import { RenderMoney } from '../utils/formatters';

interface SaveDaily020502ModalProps {
  isOpen: boolean;
  initialDate?: string;
  data: RawData;
  calculated: CalculatedProduct[];
  onClose: () => void;
  onSaveSnapshot: (snapshot: DashboardSnapshot) => void;
}

export const SaveDaily020502Modal: React.FC<SaveDaily020502ModalProps> = ({
  isOpen,
  initialDate,
  data,
  calculated,
  onClose,
  onSaveSnapshot,
}) => {
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [dateStr, setDateStr] = useState(initialDate || getTodayStr());
  const [label, setLabel] = useState('Fechamento Final do Dia');
  const [replaceExisting, setReplaceExisting] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setDateStr(initialDate || getTodayStr());
      setLabel(`Fechamento ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  // Calcula totais atuais do Dashboard
  const faltas = calculated.filter((p) => p.W < 0);
  const sobras = calculated.filter((p) => p.W > 0);

  const tf = faltas.reduce((acc, p) => acc + p.W, 0);
  const ts = sobras.reduce((acc, p) => acc + p.W, 0);
  const sd = tf + ts;

  const handleConfirm = () => {
    if (!dateStr) {
      alert('Selecione uma data para o fechamento.');
      return;
    }

    const timestamp = Date.now();
    const id = replaceExisting
      ? `snap_${dateStr}`
      : `snap_${dateStr}_${timestamp}`;

    const snapshot: DashboardSnapshot = {
      id,
      date: dateStr,
      timestamp,
      label: label.trim() || `Fechamento do Dia ${dateStr.split('-').reverse().join('/')}`,
      ec: {
        h: [...data.ec.h],
        r: data.ec.r.map((row) => [...row]),
      },
      res: data.res.map((r) => [...r] as typeof r),
      summary: {
        tf,
        ts,
        sd,
        countFaltas: faltas.length,
        countSobras: sobras.length,
      },
      savedAt: new Date().toISOString(),
    };

    onSaveSnapshot(snapshot);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          background: '#fff',
          borderRadius: '8px',
          maxWidth: '460px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            background: '#1E293B',
            color: '#fff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>💾</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 'bold' }}>
                Salvar 02.05.02 / Fechamento do Dia
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8' }}>
                Armazena a planilha 02.05.02 e os totais do Dashboard desta data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Data do Fechamento */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Data do Fechamento:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '5px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              />
              <button
                type="button"
                onClick={() => setDateStr(getTodayStr())}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '5px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Identificação / Rótulo */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>
              Identificação / Descrição:
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Fechamento Final, 1º Fechamento, etc."
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1.5px solid #CBD5E1',
                borderRadius: '5px',
                fontSize: '12.5px',
              }}
            />
          </div>

          {/* Resumo dos Valores que Serão Salvos */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
              Resumo deste Fechamento:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>FALTAS</span>
                <b style={{ fontSize: '12px', color: '#DC2626' }}>
                  <RenderMoney value={tf} />
                </b>
                <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>{faltas.length} itens</div>
              </div>

              <div style={{ background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>SOBRAS</span>
                <b style={{ fontSize: '12px', color: '#16A34A' }}>
                  <RenderMoney value={ts} />
                </b>
                <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>{sobras.length} itens</div>
              </div>

              <div style={{ background: '#fff', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#64748B' }}>SALDO FINAL</span>
                <b style={{ fontSize: '12px', color: sd < 0 ? '#DC2626' : sd > 0 ? '#16A34A' : '#0F172A' }}>
                  <RenderMoney value={sd} />
                </b>
                <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>{data.ec.r.length} produtos</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="replaceSnap"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="replaceSnap" style={{ fontSize: '11.5px', color: '#475569', cursor: 'pointer' }}>
              Substituir fechamento anterior se já existir um nesta mesma data
            </label>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              style={{
                padding: '8px 18px',
                background: '#16A34A',
                border: 'none',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }}
            >
              <Save size={14} />
              <span>Confirmar e Salvar Fechamento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
