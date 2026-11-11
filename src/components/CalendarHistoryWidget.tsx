import React, { useState, useMemo } from 'react';
import { DashboardSnapshot } from '../data/types';
import { Calendar, ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import { RenderMoney } from '../utils/formatters';

interface CalendarHistoryWidgetProps {
  snapshots: DashboardSnapshot[];
  selectedSnapshotId: string | null;
  selectedDayNumber: number | null;
  onSelectSnapshot: (snapshot: DashboardSnapshot | null) => void;
  onSelectDayNumber: (day: number | null) => void;
  onDeleteSnapshot: (id: string) => void;
  onDownloadSnapshot020502: (snapshot: DashboardSnapshot) => void;
  onOpenSaveModal: (date?: string) => void;
  daysWithConciliacao: Set<number>;
}

export const CalendarHistoryWidget: React.FC<CalendarHistoryWidgetProps> = ({
  snapshots,
  selectedSnapshotId,
  selectedDayNumber,
  onSelectSnapshot,
  onSelectDayNumber,
  onDeleteSnapshot,
  onDownloadSnapshot020502,
  onOpenSaveModal,
  daysWithConciliacao,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Data selecionada no formato "YYYY-MM-DD"
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Mapa de snapshots por data "YYYY-MM-DD"
  const snapshotDateMap = useMemo(() => {
    const map = new Map<string, DashboardSnapshot[]>();
    snapshots.forEach((s) => {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    });
    return map;
  }, [snapshots]);

  // Dias do mês atual para a grade do calendário
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({
        day: d,
        dateStr: `${currentYear}-${mStr}-${dStr}`,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const selectedDaySnapshots = snapshotDateMap.get(selectedDateStr) || [];
  const activeSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  // Extrai o dia do mês selecionado
  const selectedDayInt = parseInt(selectedDateStr.split('-')[2], 10) || null;
  const hasMonthlyReconcil = selectedDayInt !== null && daysWithConciliacao.has(selectedDayInt);

  return (
    <div
      style={{
        marginTop: '10px',
        background: '#fff',
        border: '1.5px solid #CBD5E1',
        borderRadius: '6px',
        padding: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Título do Widget */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Calendar size={13} color="#2563EB" />
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1E293B', letterSpacing: '0.2px' }}>
            CONSULTAR POR DATA
          </span>
        </div>

        {selectedSnapshotId !== null && (
          <button
            type="button"
            onClick={() => {
              onSelectSnapshot(null);
              onSelectDayNumber(null);
            }}
            style={{
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '3px',
              padding: '1px 5px',
              fontSize: '9.5px',
              fontWeight: 'bold',
              color: '#92400E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title="Voltar ao Dashboard em tempo real"
          >
            <RotateCcw size={10} />
            <span>Ao Vivo</span>
          </button>
        )}
      </div>

      {/* Navegação de Mês */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
          background: '#F8FAFC',
          padding: '3px 6px',
          borderRadius: '4px',
          border: '1px solid #E2E8F0',
        }}
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
          title="Mês anterior"
        >
          <ChevronLeft size={13} />
        </button>
        <span style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#334155' }}>
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          onClick={handleNextNext => handleNextMonth()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748B' }}
          title="Próximo mês"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Grade dos dias da semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '3px' }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, idx) => (
          <div key={idx} style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#94A3B8' }}>
            {dia}
          </div>
        ))}
      </div>

      {/* Grade de Dias do Mês */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
        {calendarDays.map((item, idx) => {
          if (!item.isCurrentMonth) {
            return <div key={idx} style={{ height: '22px' }} />;
          }

          const hasSnapshot = snapshotDateMap.has(item.dateStr);
          const isSelected = item.dateStr === selectedDateStr;
          const isToday = item.dateStr === todayStr;
          const isViewingThis = activeSnapshot && activeSnapshot.date === item.dateStr;
          const hasDIF = daysWithConciliacao.has(item.day);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedDateStr(item.dateStr);
                const snaps = snapshotDateMap.get(item.dateStr);
                if (snaps && snaps.length > 0) {
                  onSelectSnapshot(snaps[0]);
                } else if (hasDIF) {
                  onSelectSnapshot(null);
                  onSelectDayNumber(item.day);
                }
              }}
              style={{
                height: '23px',
                border: isSelected ? '1.5px solid #2563EB' : isToday ? '1px solid #F59E0B' : '1px solid #E2E8F0',
                borderRadius: '3px',
                background: isViewingThis
                  ? '#10B981'
                  : isSelected
                  ? '#EFF6FF'
                  : hasSnapshot
                  ? '#DCFCE7'
                  : '#fff',
                color: isViewingThis ? '#fff' : isSelected ? '#1E40AF' : '#1E293B',
                fontSize: '10px',
                fontWeight: isSelected || isToday || hasSnapshot ? 'bold' : 'normal',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: 0,
              }}
              title={
                hasSnapshot
                  ? `Dia ${item.day}: Fechamento 02.05.02 gravado`
                  : hasDIF
                  ? `Dia ${item.day}: Conciliação na DIF Mensal`
                  : `Dia ${item.day}`
              }
            >
              <span>{item.day}</span>
              {hasSnapshot && !isViewingThis && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '1px',
                    width: '3.5px',
                    height: '3.5px',
                    borderRadius: '50%',
                    background: '#16A34A',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Detalhes do Dia Selecionado */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '4px',
          padding: '7px 8px',
          fontSize: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <b style={{ color: '#0F172A' }}>
            📅 {selectedDateStr.split('-').reverse().join('/')}
          </b>
          {selectedDateStr === todayStr && (
            <span style={{ fontSize: '9px', background: '#FEF3C7', color: '#92400E', padding: '1px 4px', borderRadius: '2px', fontWeight: 'bold' }}>
              Hoje
            </span>
          )}
        </div>

        {selectedDaySnapshots.length > 0 ? (
          <div>
            {selectedDaySnapshots.map((snap) => {
              const isViewing = selectedSnapshotId === snap.id;
              const sd = snap.summary?.sd ?? 0;

              return (
                <div
                  key={snap.id}
                  style={{
                    background: isViewing ? '#ECFDF5' : '#fff',
                    border: `1px solid ${isViewing ? '#10B981' : '#CBD5E1'}`,
                    borderRadius: '4px',
                    padding: '6px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '9.5px' }}>
                      {snap.label || 'Fechamento do Dia'}
                    </span>
                    <span style={{ fontSize: '8.5px', color: '#64748B' }}>
                      {new Date(snap.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {snap.summary && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', marginBottom: '4px' }}>
                      <span style={{ color: '#64748B' }}>Saldo:</span>
                      <b style={{ color: sd < 0 ? '#DC2626' : sd > 0 ? '#16A34A' : '#0F172A' }}>
                        {sd < 0 ? '-' : ''}R$ {Math.abs(sd).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </b>
                    </div>
                  )}

                  {/* Botões de Ação do Snapshot */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => onSelectSnapshot(isViewing ? null : snap)}
                      style={{
                        flex: 1,
                        background: isViewing ? '#10B981' : '#2563EB',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '3px 6px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                      }}
                    >
                      <Eye size={10} />
                      <span>{isViewing ? 'Vendo' : 'Ver'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDownloadSnapshot020502(snap)}
                      style={{
                        background: '#fff',
                        border: '1px solid #CBD5E1',
                        borderRadius: '3px',
                        padding: '3px 5px',
                        fontSize: '9px',
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Baixar a planilha 02.05.02 salva deste fechamento"
                    >
                      <Download size={10} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deseja excluir o snapshot de ${snap.date}?`)) {
                          onDeleteSnapshot(snap.id);
                        }
                      }}
                      style={{
                        background: '#fff',
                        border: '1px solid #FECDD3',
                        borderRadius: '3px',
                        padding: '3px 5px',
                        fontSize: '9px',
                        color: '#DC2626',
                        cursor: 'pointer',
                      }}
                      title="Excluir este snapshot"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasMonthlyReconcil ? (
          <div>
            <div style={{ color: '#475569', fontSize: '9.5px', marginBottom: '5px' }}>
              Há conciliação salva no Dia {selectedDayInt} da DIF Mensal.
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectSnapshot(null);
                onSelectDayNumber(selectedDayInt);
              }}
              style={{
                width: '100%',
                background: selectedDayNumber === selectedDayInt ? '#F59E0B' : '#2B579A',
                color: selectedDayNumber === selectedDayInt ? '#000' : '#fff',
                border: 'none',
                borderRadius: '3px',
                padding: '4px 6px',
                fontSize: '9.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {selectedDayNumber === selectedDayInt ? 'Visualizando Dia' : `Ver Diferença Dia ${selectedDayInt}`}
            </button>
          </div>
        ) : (
          <div style={{ color: '#94A3B8', fontSize: '9px', textAlign: 'center', padding: '4px 0' }}>
            Nenhum fechamento salvo nesta data.
          </div>
        )}

        {/* Botão para salvar o fechamento atual nesta data específica */}
        <button
          type="button"
          onClick={() => onOpenSaveModal(selectedDateStr)}
          style={{
            width: '100%',
            marginTop: '6px',
            background: '#F1F5F9',
            border: '1px dashed #94A3B8',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '9.5px',
            color: '#334155',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          title="Salvar o dashboard e 02.05.02 atual para a data selecionada"
        >
          <span>💾</span>
          <span>Salvar 02.05.02 nesta Data</span>
        </button>
      </div>

      {/* Lista rápida de fechamentos recentes */}
      {snapshots.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748B', marginBottom: '3px' }}>
            RECENTES:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '90px', overflowY: 'auto' }}>
            {snapshots.slice(0, 4).map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedDateStr(s.date);
                  onSelectSnapshot(s);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  background: selectedSnapshotId === s.id ? '#DCFCE7' : '#F8FAFC',
                  fontSize: '9px',
                  cursor: 'pointer',
                  border: selectedSnapshotId === s.id ? '1px solid #16A34A' : '1px solid transparent',
                }}
              >
                <span style={{ fontWeight: 'bold', color: '#1E293B' }}>
                  {s.date.split('-').reverse().slice(0, 2).join('/')}
                </span>
                <span style={{ color: (s.summary?.sd ?? 0) < 0 ? '#DC2626' : '#16A34A', fontWeight: 'bold' }}>
                  {(s.summary?.sd ?? 0) < 0 ? '-' : ''}R$ {Math.abs(s.summary?.sd ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
