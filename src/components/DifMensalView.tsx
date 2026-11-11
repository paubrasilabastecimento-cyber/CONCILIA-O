import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MenRow } from '../data/types';
import { N } from '../utils/formatters';
import { 
  Search, 
  ArrowRight, 
  Calendar, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Edit3,
  HelpCircle,
  Save
} from 'lucide-react';


export interface DifMensalViewProps {
  men: MenRow[];
  calculatedMap: Record<number, any>;
  onClearDay?: (day: number) => void;
  onResetAll?: (options?: { resetFechamentoMode?: 'keep' | 'last_day' | 'zero' }) => void;
  onUpdateMen?: (newMen: MenRow[], desc: string) => void;
  onSalvarDifToday?: () => void;
}

export const DifMensalView: React.FC<DifMensalViewProps> = ({ 
  men, 
  calculatedMap,
  onClearDay, 
  onResetAll, 
  onUpdateMen,
  onSalvarDifToday,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'nonzero' | 'below' | 'above'>('all');
  const [summaryMode, setSummaryMode] = useState<'dif' | 'soma'>('dif');
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);
  const [showOnly141519, setShowOnly141519] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Helper para analisar as diferenças reais dos dias de um produto (e não a soma de contagens repetidas)
  const getRowStats = (r: MenRow) => {
    const days = r[4] || [];
    const activeEntries: { day: number; val: number }[] = [];
    days.forEach((v, idx) => {
      if (v !== null && v !== undefined) {
        activeEntries.push({ day: idx + 1, val: v });
      }
    });

    const latest = activeEntries.length > 0 ? activeEntries[activeEntries.length - 1] : null;
    const previous = activeEntries.length > 1 ? activeEntries[activeEntries.length - 2] : null;
    const first = activeEntries.length > 0 ? activeEntries[0] : null;

    const latestDiff = latest ? latest.val : (r[3] !== null ? r[3] : 0);
    const delta = (latest && previous) ? latest.val - previous.val : 0;
    const totalPeriodDelta = (latest && first) ? latest.val - first.val : 0;
    const deltaFechamento = latest ? latest.val - (r[3] || 0) : 0;
    const soma = days.reduce<number>((acc, v) => acc + (v || 0), 0);

    return {
      activeEntries,
      latest,
      previous,
      first,
      latestDiff,
      delta,
      totalPeriodDelta,
      deltaFechamento,
      soma,
    };
  };

  // Estados de Gerenciamento / Limpeza
  const [isClearDayModalOpen, setIsClearDayModalOpen] = useState(false);
  const [selectedDayToClear, setSelectedDayToClear] = useState<number>(1);

  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [resetFechamentoMode, setResetFechamentoMode] = useState<'keep' | 'last_day' | 'zero'>('keep');

  const [cellEdit, setCellEdit] = useState<{
    cod: number;
    desc: string;
    day: number;
    currentVal: number | null;
    valInput: string;
  } | null>(null);

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'warn';
  } | null>(null);

  // Auto-dismiss da notificação
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Estatísticas por dia (1 a 31)
  const daysStats = useMemo(() => {
    const stats: Record<number, { count: number; sum: number; nonZeroCount: number }> = {};
    for (let d = 1; d <= 31; d++) {
      stats[d] = { count: 0, sum: 0, nonZeroCount: 0 };
    }
    men.forEach((r) => {
      if (r[4]) {
        r[4].forEach((v, idx) => {
          const d = idx + 1;
          if (v !== null && v !== undefined) {
            stats[d].count++;
            stats[d].sum += v;
            if (v !== 0) stats[d].nonZeroCount++;
          }
        });
      }
    });
    return stats;
  }, [men]);

  // Lista dos dias que possuem lançamentos
  const daysWithData = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => daysStats[d].count > 0);
  }, [daysStats]);

  // Total de lançamentos em todos os dias
  const totalEntriesInMonth = useMemo(() => {
    return Object.values(daysStats).reduce((acc, s) => acc + s.count, 0);
  }, [daysStats]);

  // Calcula estatísticas gerais e o último dia preenchido
  const { lastDay, lo, up, eq } = useMemo(() => {
    let last = 0;
    men.forEach((r) => {
      if (r[4]) {
        r[4].forEach((v, i) => {
          if (v !== null && i + 1 > last) last = i + 1;
        });
      }
    });

    let below = 0;
    let above = 0;
    let equal = 0;

    if (last > 0) {
      men.forEach((r) => {
        const v = r[4] ? r[4][last - 1] : null;
        if (v === null || v === undefined) return;
        if (v < 0) below++;
        else if (v > 0) above++;
        else equal++;
      });
    }

    return {
      lastDay: last,
      lo: below,
      up: above,
      eq: equal,
    };
  }, [men]);

  // Filtragem dos dados
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return men.filter((r) => {
      if (q && !(r[0] + ' ' + r[1]).toLowerCase().includes(q)) return false;
      if (filter === 'nonzero' && (!r[4] || !r[4].some((v) => v !== null && v !== 0))) return false;
      
      if (lastDay > 0) {
        const v = r[4] ? r[4][lastDay - 1] : null;
        const target = r[3] || 0;
        if (filter === 'below' && (v === null || v === undefined || v >= target)) return false;
        if (filter === 'above' && (v === null || v === undefined || v <= target)) return false;
      }
      return true;
    });
  }, [men, query, filter, lastDay]);

  // Lista de dias a exibir na tabela principal (todos os 31 ou apenas dias com dados)
  const displayDays = useMemo(() => {
    if (showOnly141519) return [14, 15, 19];
    if (onlyActiveDays && daysWithData.length > 0) {
      return daysWithData;
    }
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }, [onlyActiveDays, daysWithData, showOnly141519]);

  // Dias com lançamentos especificamente entre os produtos filtrados na pesquisa
  const activeDaysForFiltered = useMemo(() => {
    const set = new Set<number>();
    filtered.forEach((r) => {
      if (r[4]) {
        r[4].forEach((v, idx) => {
          if (v !== null && v !== undefined) set.add(idx + 1);
        });
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [filtered]);

  // Dia de hoje no calendário
  const todayDay = new Date().getDate();

  // Rolar suavemente para o último dia ativo
  const scrollToLastDay = () => {
    if (!tableContainerRef.current || lastDay === 0) return;
    const offset = Math.max(0, (lastDay - 1) * 44);
    tableContainerRef.current.scrollTo({
      left: offset,
      behavior: 'smooth',
    });
  };

  // Rolar suavemente para a coluna de hoje
  const scrollToToday = () => {
    if (!tableContainerRef.current) return;
    const offset = Math.max(0, (todayDay - 1) * 44);
    tableContainerRef.current.scrollTo({
      left: offset,
      behavior: 'smooth',
    });
  };

  // Limpar dia específico
  const handleConfirmClearDay = (day: number) => {
    if (onClearDay) {
      onClearDay(day);
    } else if (onUpdateMen) {
      const newMen = men.map((r) => {
        const row = [...r] as MenRow;
        const days = [...row[4]];
        days[day - 1] = null;
        const soma = days.reduce<number>((acc, v) => acc + (v || 0), 0);
        return [row[0], row[1], row[2], row[3], days, soma] as MenRow;
      });
      onUpdateMen(newMen, `Limpeza dos lançamentos do Dia ${day}`);
    }
    setIsClearDayModalOpen(false);
    setNotification({
      type: 'success',
      text: `Lançamentos do Dia ${day} foram limpos com sucesso! (Recalculado)`,
    });
  };


  // Zerar toda a DIF Mensal (Próximo Mês)
  const handleConfirmResetAll = () => {
    if (onResetAll) {
      onResetAll({ resetFechamentoMode });
    } else if (onUpdateMen) {
      const newMen = men.map((r) => {
        const row = [...r] as MenRow;
        const emptyDays = Array(31).fill(null);
        let newFechamento = row[3];
        if (resetFechamentoMode === 'zero') {
          newFechamento = 0;
        } else if (resetFechamentoMode === 'last_day' && lastDay > 0) {
          const lastVal = row[4][lastDay - 1];
          if (lastVal !== null) newFechamento = lastVal;
        }
        return [row[0], row[1], row[2], newFechamento, emptyDays, 0] as MenRow;
      });
      onUpdateMen(newMen, 'Zeramento completo da DIF Mensal para o próximo mês');
    }
    setIsResetAllModalOpen(false);
    setNotification({
      type: 'success',
      text: 'DIF Mensal zerada com sucesso! A tabela está pronta para o próximo mês.',
    });
  };

  // Salvar alteração de célula individual
  const handleSaveCell = (cod: number, day: number, newVal: number | null) => {
    if (onUpdateMen) {
      const newMen = men.map((r) => {
        if (r[0] === cod) {
          const row = [...r] as MenRow;
          const days = [...row[4]];
          days[day - 1] = newVal;
          const soma = days.reduce<number>((acc, v) => acc + (v || 0), 0);
          return [row[0], row[1], row[2], row[3], days, soma] as MenRow;
        }
        return r;
      });
      const desc = newVal === null 
        ? `Lançamento do item ${cod} no Dia ${day} limpo`
        : `Lançamento do item ${cod} no Dia ${day} alterado para ${newVal}`;
      onUpdateMen(newMen, desc);
      setNotification({
        type: 'success',
        text: newVal === null ? `Lançamento do Dia ${day} removido.` : `Valor do Dia ${day} atualizado para ${newVal}.`,
      });
    }
  };

  return (
    <section className="w-full">
      {/* Banner de Notificação */}
      {notification && (
        <div
          style={{
            margin: '8px 24px 0',
            padding: '10px 16px',
            background: notification.type === 'success' ? '#D4EDDA' : '#FFF3CD',
            color: notification.type === 'success' ? '#155724' : '#856404',
            border: `1px solid ${notification.type === 'success' ? '#C3E6CB' : '#FFEEBA'}`,
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'inherit',
              padding: '2px 6px',
            }}
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPIs Responsivos */}
      <div className="kpis">
        <div className="k">
          <small>PRODUTOS</small>
          <span>{men.length}</span>
        </div>
        <div className="k">
          <small>ÚLTIMO DIA LANÇADO</small>
          <span>{lastDay ? `dia ${lastDay}` : '—'}</span>
        </div>
        <div className="k">
          <small>DIAS COM LANÇAMENTOS</small>
          <span>{daysWithData.length} dias</span>
        </div>
        <div className="k r">
          <small>PRODUTOS COM FALTA</small>
          <span>{lo}</span>
        </div>
        <div className="k y">
          <small>PRODUTOS COM SOBRA</small>
          <span>{up}</span>
        </div>
        <div className="k g">
          <small>SEM DIVERGÊNCIA (0 CX)</small>
          <span>{eq}</span>
        </div>
      </div>

      {/* Barra de Ferramentas Responsiva */}
      <div className="tools" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '8px 24px' }}>
        {/* Campo de Busca */}
        <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 240px', maxWidth: '340px' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar código ou produto…"
            style={{ width: '100%', paddingRight: '28px', boxSizing: 'border-box' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
                fontSize: '14px',
                padding: '2px',
              }}
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          style={{ minWidth: '150px' }}
        >
          <option value="all">Todos os produtos</option>
          <option value="nonzero">Só com algum dia ≠ 0</option>
          <option value="below">Abaixo do fechamento (dia {lastDay || 1})</option>
          <option value="above">Acima do fechamento (dia {lastDay || 1})</option>
        </select>

        {/* Contador de Linhas */}
        <span style={{ fontSize: '12px', color: '#555', whiteSpace: 'nowrap' }}>
          <b>{filtered.length}</b> de {men.length} linhas
        </span>

        {/* Botão de Atalho para o Dia de Hoje */}
        <button
          type="button"
          onClick={scrollToToday}
          className="btn"
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#fff',
            color: '#1e3f70',
            border: '1px solid #1e3f70',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
          title={`Rolar tabela diretamente para a coluna de Hoje (Dia ${todayDay})`}
        >
          <Calendar size={13} />
          <span>Ir para Hoje ({todayDay})</span>
        </button>

        {/* Botão de Atalho para o Último Dia com dados */}
        {lastDay > 0 && lastDay !== todayDay && (
          <button
            type="button"
            onClick={scrollToLastDay}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#f0f4f8',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}
            title={`Rolar tabela diretamente para o dia ${lastDay}`}
          >
            <Calendar size={13} />
            <span>Último Lançado ({lastDay})</span>
            <ArrowRight size={13} />
          </button>
        )}

        {/* BOTÃO SALVAR DIF DE HOJE */}
        {onSalvarDifToday && (
          <button
            type="button"
            onClick={onSalvarDifToday}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2B579A',
              color: '#fff',
              border: '1px solid #1e3f70',
              borderRadius: '4px',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(43, 87, 154, 0.25)',
            }}
            title={`Salvar as diferenças da conciliação do painel na coluna do Dia ${todayDay} (Hoje)`}
          >
            <Save size={13} />
            <span>Salvar DIF Hoje (Dia {todayDay})</span>
          </button>
        )}

        {/* DIVISOR VERTICAL */}
        <div style={{ width: '1px', height: '24px', background: '#ccc', margin: '0 4px' }} />

        {/* BOTÃO: LIMPAR ALGUM DIA ESPECÍFICO */}
        <button
          type="button"
          onClick={() => {
            setSelectedDayToClear(lastDay > 0 ? lastDay : (daysWithData[0] || 1));
            setIsClearDayModalOpen(true);
          }}
          className="btn"
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#D9534F',
            color: '#fff',
            border: '1px solid #C9302C',
            borderRadius: '4px',
            fontWeight: 'bold',
            boxShadow: '0 1px 2px rgba(217, 83, 79, 0.25)',
          }}
          title="Limpar os lançamentos de qualquer dia específico da DIF Mensal"
        >
          <Trash2 size={13} />
          <span>Limpar Algum Dia</span>
        </button>

        {/* BOTÃO: ZERAR TODA A DIF MENSAL (NOVO MÊS) */}
        <button
          type="button"
          onClick={() => {
            setResetFechamentoMode('keep');
            setIsResetAllModalOpen(true);
          }}
          className="btn"
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#800000',
            color: '#fff',
            border: '1px solid #500000',
            borderRadius: '4px',
            fontWeight: 'bold',
            boxShadow: '0 1px 2px rgba(128, 0, 0, 0.3)',
          }}
          title="Zerar todos os dias da DIF Mensal para iniciar o próximo mês"
        >
          <RotateCcw size={13} />
          <span>Zerar Mês Completo</span>
        </button>


        {/* Alternador de Colunas: Apenas dias lançados vs Todos os 31 dias vs Apenas 14, 15, 19 */}
        <button
          type="button"
          onClick={() => {
             if (showOnly141519) {
                setShowOnly141519(false);
                setOnlyActiveDays(false);
             } else {
                setShowOnly141519(true);
                setOnlyActiveDays(false);
             }
          }}
          className="btn"
          style={{
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '4px',
            border: '1px solid #CBD5E1',
            background: showOnly141519 ? '#FEF3C7' : '#fff',
            color: showOnly141519 ? '#92400E' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
          }}
          title="Focar apenas nos dias 14, 15 e 19"
        >
          <span>{showOnly141519 ? '⭐ Foco: 14, 15, 19' : '📅 Todos os 31 Dias'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setOnlyActiveDays((prev) => !prev);
            setShowOnly141519(false);
          }}
          className="btn"
          style={{
            padding: '5px 10px',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '4px',
            border: '1px solid #CBD5E1',
            background: onlyActiveDays ? '#EBF3FC' : '#fff',
            color: onlyActiveDays ? '#1E3A8A' : '#475569',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
          }}
          title={
            onlyActiveDays
              ? 'Mostrando apenas dias com lançamentos (Dia 1, 2, 3...). Clique para ver os 31 dias.'
              : 'Clique para focar apenas nos dias com lançamentos (Dia 1, 2, 3...) de forma compacta.'
          }
        >
          <span>{onlyActiveDays ? '🔍 Foco: Dias com Dados' : '📅 Todos os 31 Dias'}</span>
        </button>

        {/* Legenda de Cores Compacta */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '11px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '12px', height: '12px', background: '#FFC7CE', border: '1px solid #9C0006', display: 'inline-block' }}></span>
            Abaixo
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '12px', height: '12px', background: '#FFEB9C', border: '1px solid #9C6500', display: 'inline-block' }}></span>
            Acima
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '12px', height: '12px', background: '#C6EFCE', border: '1px solid #006100', display: 'inline-block' }}></span>
            Igual
          </span>
        </div>
      </div>

      {/* PAINEL DE ANÁLISE DAS DIFERENÇAS DOS DIAS (QUANDO HOUVER PESQUISA ATIVA) */}
      {query.trim().length > 0 && (
        <div
          style={{
            margin: '0 24px 14px 24px',
            background: '#FFFDF5',
            border: '2px solid #FFC000',
            borderRadius: '8px',
            padding: '14px 18px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔍</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#111' }}>
                  ANÁLISE DAS DIFERENÇAS DOS DIAS ({filtered.length} produto{filtered.length !== 1 ? 's' : ''} localizado{filtered.length !== 1 ? 's' : ''})
                </h3>
                <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                  Exibindo os dias preenchidos (Dia 1, Dia 2, Dia 3...) e a <b>diferença apurada entre esses dias</b> (<b>NÃO a soma acumulada de contagens</b>).
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setOnlyActiveDays(!onlyActiveDays)}
                style={{
                  background: onlyActiveDays ? '#EBF3FC' : '#fff',
                  border: '1px solid #CBD5E1',
                  color: onlyActiveDays ? '#1E3A8A' : '#475569',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {onlyActiveDays ? '🔍 Foco: Apenas Dias Lançados' : '📅 Ver Todos 31 Dias'}
              </button>
              <button
                onClick={() => setQuery('')}
                style={{
                  background: '#eee',
                  border: '1px solid #ccc',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ✕ Limpar Busca
              </button>
            </div>
          </div>

          {/* TABELA COMPARATIVA DOS DIAS PESQUISADOS (SEM SOMA, APENAS DIFERENÇA) */}
          {activeDaysForFiltered.length > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                overflowX: 'auto',
                marginBottom: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155', fontWeight: 'bold' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px' }}>CÓD</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>PRODUTO</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>FECHAMENTO</th>
                    {activeDaysForFiltered.map((d, dIdx) => (
                      <React.Fragment key={d}>
                        <th style={{ padding: '8px 8px', textAlign: 'center', background: '#FFC000', color: '#000', minWidth: '65px' }}>
                          DIA {d}
                        </th>
                        {dIdx > 0 && (
                          <th style={{ padding: '8px 6px', textAlign: 'center', background: '#FEF3C7', color: '#92400E', fontSize: '10.5px', minWidth: '70px' }}>
                            Δ DIF (D{activeDaysForFiltered[dIdx - 1]}➔D{d})
                          </th>
                        )}
                      </React.Fragment>
                    ))}
                    <th style={{ padding: '8px 12px', textAlign: 'center', background: '#1E3A8A', color: '#FFD34D', fontWeight: 'bold', minWidth: '120px' }}>
                      ⚡ DIFERENÇA DOS DIAS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 15).map((r) => {
                    const rowStats = getRowStats(r);
                    return (
                      <tr key={r[0]} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {r[0]}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '500' }}>
                          {r[1]}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748B' }}>
                          {r[3] === null ? '—' : `${r[3]} cx`}
                        </td>
                        {activeDaysForFiltered.map((d, dIdx) => {
                          const currVal = r[4] ? r[4][d - 1] : null;
                          const prevDay = dIdx > 0 ? activeDaysForFiltered[dIdx - 1] : null;
                          const prevVal = prevDay !== null && r[4] ? r[4][prevDay - 1] : null;
                          const stepDelta = currVal !== null && prevVal !== null ? currVal - prevVal : null;

                          return (
                            <React.Fragment key={d}>
                              <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                                {currVal !== null ? (
                                  <span style={{ color: currVal < 0 ? '#C00000' : currVal > 0 ? '#008000' : '#334155' }}>
                                    {currVal > 0 ? `+${currVal}` : currVal} <small>cx</small>
                                  </span>
                                ) : (
                                  <span style={{ color: '#ccc' }}>-</span>
                                )}
                              </td>
                              {dIdx > 0 && (
                                <td
                                  style={{
                                    padding: '6px 6px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    color:
                                      stepDelta !== null
                                        ? stepDelta < 0
                                          ? '#C00000'
                                          : stepDelta > 0
                                          ? '#008000'
                                          : '#64748B'
                                        : '#94A3B8',
                                  }}
                                >
                                  {stepDelta !== null ? `${stepDelta > 0 ? `+${stepDelta}` : stepDelta} cx` : '—'}
                                </td>
                              )}
                            </React.Fragment>
                          );
                        })}
                        <td
                          style={{
                            padding: '6px 12px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            background:
                              rowStats.latestDiff < 0
                                ? '#FFEBEE'
                                : rowStats.latestDiff > 0
                                ? '#E8F5E9'
                                : '#F8FAFC',
                            color:
                              rowStats.latestDiff < 0
                                ? '#C00000'
                                : rowStats.latestDiff > 0
                                ? '#008000'
                                : '#334155',
                          }}
                        >
                          {rowStats.latestDiff > 0 ? `+${rowStats.latestDiff}` : rowStats.latestDiff} cx
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VISUALIZAÇÃO EM CARTÕES DOS DIAS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.slice(0, 10).map((r) => {
              const rowStats = getRowStats(r);
              return (
                <div
                  key={r[0]}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '8px',
                      marginBottom: '10px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: '#1e3f70' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          marginRight: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {r[0]}
                      </span>
                      {r[1]}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <span style={{ color: '#64748B' }}>
                        Fechamento Mês Anterior: <b>{r[3] === null ? '—' : `${r[3]} cx`}</b>
                      </span>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          background:
                            rowStats.latestDiff < 0
                              ? '#FFC7CE'
                              : rowStats.latestDiff > 0
                              ? '#C6EFCE'
                              : '#E2E8F0',
                          color:
                            rowStats.latestDiff < 0
                              ? '#9C0006'
                              : rowStats.latestDiff > 0
                              ? '#006100'
                              : '#334155',
                        }}
                      >
                        Diferença dos Dias: {rowStats.latestDiff > 0 ? `+${rowStats.latestDiff}` : rowStats.latestDiff} cx
                      </span>
                    </div>
                  </div>

                  {/* Lançamentos dos dias e variação entre eles */}
                  {rowStats.activeEntries.length === 0 ? (
                    <div style={{ fontSize: '11.5px', color: '#888', fontStyle: 'italic', padding: '6px 0' }}>
                      Nenhum dia lançado neste mês até o momento.
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          overflowX: 'auto',
                          paddingBottom: '6px',
                        }}
                      >
                        {rowStats.activeEntries.map((entry, idx) => {
                          const prevEntry = idx > 0 ? rowStats.activeEntries[idx - 1] : null;
                          const dayDelta = prevEntry ? entry.val - prevEntry.val : null;
                          const isLatest = idx === rowStats.activeEntries.length - 1;

                          return (
                            <React.Fragment key={entry.day}>
                              {idx > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 2px' }}>
                                  <span style={{ fontSize: '11px', color: '#888' }}>➔</span>
                                  {dayDelta !== null && (
                                    <span
                                      style={{
                                        fontSize: '9.5px',
                                        fontWeight: 'bold',
                                        color:
                                          dayDelta < 0
                                            ? '#C00000'
                                            : dayDelta > 0
                                            ? '#008000'
                                            : '#64748B',
                                        background:
                                          dayDelta < 0
                                            ? '#FFF0F2'
                                            : dayDelta > 0
                                            ? '#F0FFF4'
                                            : '#F1F5F9',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={`Variação do Dia ${prevEntry?.day} para o Dia ${entry.day}: ${dayDelta > 0 ? `+${dayDelta}` : dayDelta} cx`}
                                    >
                                      {dayDelta > 0 ? `+${dayDelta}` : dayDelta} cx
                                    </span>
                                  )}
                                </div>
                              )}
                          <div
                                style={{
                                  border: isLatest ? '2px solid #2B579A' : '1px solid #CBD5E1',
                                  background: isLatest ? '#F0F6FD' : '#FAFAFA',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  minWidth: '80px',
                                  textAlign: 'center',
                                  boxShadow: isLatest ? '0 2px 4px rgba(43, 87, 154, 0.15)' : 'none',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    color: isLatest ? '#1e3f70' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <span>DIA {entry.day}</span>
                                  {isLatest && <span style={{ color: '#2B579A' }}>★</span>}
                                </div>
                                <div
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color:
                                      entry.val < 0
                                        ? '#C00000'
                                        : entry.val > 0
                                        ? '#008000'
                                        : '#1e293b',
                                    marginTop: '3px',
                                  }}
                                >
                                  {entry.val > 0 ? `+${entry.val}` : entry.val}{' '}
                                  <small style={{ fontSize: '10.5px' }}>cx</small>
                                </div>
                                <div style={{ fontSize: '9.5px', color: '#64748B', marginTop: '2px' }}>
                                  {entry.val < 0 ? 'Falta' : entry.val > 0 ? 'Sobra' : 'Zerado'}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>

                      {/* Resumo da Diferença dos Dias */}
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '11.5px',
                          color: '#334155',
                          background: '#F8FAFC',
                          padding: '7px 12px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <div>
                          • Diferença Real Apurada: <b>{rowStats.latestDiff > 0 ? `+${rowStats.latestDiff}` : rowStats.latestDiff} cx</b>
                          {rowStats.activeEntries.length > 1 && (
                            <span style={{ marginLeft: '8px', color: '#64748B' }}>
                              (Variação líquida de <b>{rowStats.totalPeriodDelta > 0 ? `+${rowStats.totalPeriodDelta}` : rowStats.totalPeriodDelta} cx</b> entre o Dia {rowStats.first?.day} e o Dia {rowStats.latest?.day})
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#047857', fontWeight: 'bold' }}>
                          ✓ Diferença direta apurada entre os dias (e não a soma de contagens)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length > 10 && (
              <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#666', fontStyle: 'italic', padding: '4px 0' }}>
                Mostrando os primeiros 10 produtos nos cartões acima. Todos os {filtered.length} produtos continuam listados na planilha com a coluna <b>DIFERENÇA</b>.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela com Scroll Responsivo e Colunas Fixadas */}
      <div className="wrap" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div 
          ref={tableContainerRef}
          className="sc" 
          style={{ 
            width: '100%', 
            overflowX: 'auto', 
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 210px)',
            position: 'relative',
          }}
        >
          <table id="table-m">
            <colgroup>
              <col width="62" />
              <col width="260" />
              <col width="78" />
              <col width="90" />
              {displayDays.map((d) => (
                <col key={d} width="46" />
              ))}
              <col width="84" />
            </colgroup>
            <thead>
              <tr>
                {/* 1. Cod (Fixado à esquerda) */}
                <th className="sticky-col-cod">
                  Cod
                </th>

                {/* 2. Descrição (Fixado à esquerda com sombra) */}
                <th className="sticky-col-desc" style={{ textAlign: 'left', paddingLeft: '8px' }}>
                  Desc Produto
                </th>

                {/* 3. Fator HL (Rola normalmente com os dias) */}
                <th style={{ width: '78px' }}>
                  Fator HL
                </th>

                {/* 4. Fechamento */}
                <th style={{ width: '90px' }}>
                  Fechamento
                </th>

                {/* 5. Dias (Todos ou Apenas Lançados) */}
                {displayDays.map((dayNum) => {
                  const isCurrent = dayNum === lastDay;
                  const isToday = dayNum === todayDay;
                  const hasData = daysStats[dayNum].count > 0;
                  return (
                    <th 
                      key={dayNum} 
                      onClick={() => {
                        setSelectedDayToClear(dayNum);
                        setIsClearDayModalOpen(true);
                      }}
                      style={{ 
                        width: '46px',
                        background: isToday ? '#C9DCF5' : isCurrent ? '#E59400' : hasData ? '#FFC000' : '#FFF3D0',
                        color: isToday ? '#102A45' : '#000',
                        boxShadow: isToday ? 'inset 0 0 0 2px #2B579A' : isCurrent ? 'inset 0 -2px 0 #000' : 'none',
                        cursor: 'pointer',
                        padding: '4px 2px',
                        userSelect: 'none',
                        transition: 'background 0.15s ease',
                      }}
                      title={`Dia ${dayNum}${isToday ? ' (HOJE)' : ''}${hasData ? ` (${daysStats[dayNum].count} produtos preenchidos)` : ' (Vazio)'} — Clique para gerenciar ou limpar este dia`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{dayNum}</span>
                          {isToday && (
                            <span 
                              style={{ 
                                fontSize: '8px', 
                                background: '#2B579A', 
                                color: '#fff', 
                                padding: '0 2px', 
                                borderRadius: '2px', 
                                fontWeight: 'bold',
                                lineHeight: '10px',
                              }}
                            >
                              HOJE
                            </span>
                          )}
                        </div>
                        {hasData ? (
                          <span 
                            style={{ 
                              fontSize: '9px', 
                              background: isToday ? '#2B579A' : 'rgba(0,0,0,0.18)', 
                              color: isToday ? '#fff' : 'inherit',
                              padding: '1px 3px', 
                              borderRadius: '3px', 
                              marginTop: '2px',
                              fontWeight: isToday ? 'bold' : 'normal',
                            }}
                          >
                            {daysStats[dayNum].count}
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', color: isToday ? '#2B579A' : '#888', marginTop: '2px', fontWeight: isToday ? 'bold' : 'normal' }}>
                            {isToday ? 'gravar' : '-'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* 6. Coluna Final: DIFERENÇA (padrão) ou SOMA */}
                <th
                  style={{
                    width: '84px',
                    background: summaryMode === 'dif' ? '#1E3A8A' : '#E5A000',
                    color: summaryMode === 'dif' ? '#FFD34D' : '#000',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setSummaryMode(summaryMode === 'dif' ? 'soma' : 'dif')}
                  title="Clique para alternar entre DIFERENÇA (padrão) e SOMA"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                    <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
                      {summaryMode === 'dif' ? '⚡ DIFERENÇA' : '➕ SOMA'}
                    </span>
                    <span style={{ fontSize: '8.5px', opacity: 0.9 }}>
                      {summaryMode === 'dif' ? '(DOS DIAS)' : '(TOTAL)'}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5 + displayDays.length} style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const rowStats = getRowStats(r);
                  return (
                    <tr key={r[0]}>
                      {/* Cod Fixado */}
                      <td className="sticky-col-cod font-mono">
                        {r[0]}
                      </td>

                      {/* Descrição Fixada */}
                      <td className="sticky-col-desc" title={r[1]}>
                        {r[1]}
                      </td>

                      {/* Fator HL */}
                      <td className="n">
                        {N(r[2])}
                      </td>

                      {/* Fechamento */}
                      <td className="c" style={{ fontWeight: 'bold' }}>
                        {r[3] === null ? '—' : (r[3] < 0 ? '-' : '') + N(r[3], 0)}
                      </td>

                      {/* Dias Exibidos (conforme displayDays) */}
                      {displayDays.map((dayNum) => {
                        const i = dayNum - 1;
                        const v = r[4] ? r[4][i] : null;
                        const isToday = dayNum === todayDay;

                        if (v === null || v === undefined) {
                          return (
                            <td 
                              key={dayNum} 
                              className="c" 
                              style={{ 
                                color: '#ccc', 
                                cursor: 'pointer',
                                background: isToday ? '#F0F6FD' : undefined,
                                borderLeft: isToday ? '1px dashed #B8D5F5' : undefined,
                                borderRight: isToday ? '1px dashed #B8D5F5' : undefined,
                              }}
                              onClick={() => setCellEdit({
                                cod: r[0],
                                desc: r[1],
                                day: dayNum,
                                currentVal: null,
                                valInput: '',
                              })}
                              title={`Item ${r[0]} - Dia ${dayNum}${isToday ? ' (Hoje)' : ''}: Vazio (Clique para lançar ou editar)`}
                            >
                              -
                            </td>
                          );
                        }
                        let className = 'e';
                        let cellCustomStyle: React.CSSProperties = {
                          cursor: 'pointer',
                          borderLeft: isToday ? '1px solid #2B579A' : undefined,
                          borderRight: isToday ? '1px solid #2B579A' : undefined,
                        };

                        if (v < 0) {
                          className = 'l'; // falta (vermelho)
                        } else if (v > 0) {
                          className = 'u'; // sobra (amarelo)
                        } else {
                          // v === 0: Sem divergência (zerado)
                          className = 'e';
                          cellCustomStyle.background = isToday ? '#EBF5FB' : '#F8FAF8';
                          cellCustomStyle.color = '#006100';
                          cellCustomStyle.fontWeight = '600';
                        }

                        const tipText = v === 0
                          ? `Item ${r[0]} - Dia ${dayNum}${isToday ? ' (Hoje)' : ''}: 0 cx (Sem divergência)`
                          : v < 0
                          ? `Item ${r[0]} - Dia ${dayNum}${isToday ? ' (Hoje)' : ''}: ${v} cx (Falta de ${Math.abs(v)} caixas)`
                          : `Item ${r[0]} - Dia ${dayNum}${isToday ? ' (Hoje)' : ''}: +${v} cx (Sobra de ${v} caixas)`;

                        return (
                          <td 
                            key={dayNum} 
                            className={className}
                            style={cellCustomStyle}
                            onClick={() => setCellEdit({
                              cod: r[0],
                              desc: r[1],
                              day: dayNum,
                              currentVal: v,
                              valInput: String(v),
                            })}
                            title={tipText}
                          >
                            {v}
                          </td>
                        );
                      })}

                      {/* Coluna Final: DIFERENÇA ou SOMA */}
                      {summaryMode === 'dif' ? (
                        <td
                          className="n"
                          style={{
                            fontWeight: 'bold',
                            background:
                              rowStats.latestDiff < 0
                                ? '#FFEBEE'
                                : rowStats.latestDiff > 0
                                ? '#E8F5E9'
                                : '#F8FAFC',
                            color:
                              rowStats.latestDiff < 0
                                ? '#C00000'
                                : rowStats.latestDiff > 0
                                ? '#008000'
                                : '#475569',
                            borderLeft: '2px solid #2B579A',
                          }}
                          title={`Diferença apurada entre os dias: ${rowStats.latestDiff > 0 ? `+${rowStats.latestDiff}` : rowStats.latestDiff} cx (e não a soma acumulada)`}
                        >
                          {rowStats.latestDiff > 0 ? `+${rowStats.latestDiff}` : rowStats.latestDiff}
                        </td>
                      ) : (
                        <td className="n" style={{ fontWeight: 'bold', background: '#E0E0E0' }}>
                          {r[5]}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: LIMPAR ALGUM DIA ESPECÍFICO                          */}
      {/* ============================================================ */}
      {isClearDayModalOpen && selectedDayToClear !== null && (
        <div className="modal-overlay" onClick={() => setIsClearDayModalOpen(false)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', width: '92%' }}
          >
            {/* Cabeçalho */}
            <div style={{ background: '#C00000', margin: '-20px -20px 14px -20px', padding: '12px 18px', color: '#fff', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} />
                <span>Limpar Lançamentos da DIF Mensal</span>
              </div>
              <button 
                onClick={() => setIsClearDayModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#333', lineHeight: 1.5 }}>
              Escolha qual dia da DIF Mensal você deseja limpar. Todos os valores lançados neste dia específico serão removidos (definidos como vazios), recalculando a soma e as diferenças de todos os produtos.
            </p>

            {/* Caixa seletora do dia */}
            <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>
                Selecione o Dia para Limpar:
              </label>
              <select
                value={selectedDayToClear}
                onChange={(e) => setSelectedDayToClear(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  border: '1px solid #bbb',
                  background: '#fff',
                }}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  const st = daysStats[d];
                  const has = st.count > 0;
                  return (
                    <option key={d} value={d}>
                      Dia {d} {has ? `— ⚠️ ${st.count} produtos preenchidos (Soma: ${st.sum})` : '— (Vazio / sem dados)'}
                    </option>
                  );
                })}
              </select>

              {/* Detalhes do Dia Selecionado */}
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#555', display: 'flex', gap: '16px' }}>
                <div>
                  Produtos lançados: <b style={{ color: daysStats[selectedDayToClear].count > 0 ? '#C00000' : '#28a745' }}>{daysStats[selectedDayToClear].count}</b>
                </div>
                <div>
                  Soma no dia: <b>{daysStats[selectedDayToClear].sum}</b>
                </div>
              </div>
            </div>

            {/* Chips rápidos de dias com dados */}
            {daysWithData.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <small style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '6px' }}>
                  DIAS COM LANÇAMENTOS NESTE MÊS (CLIQUE PARA SELECIONAR):
                </small>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {daysWithData.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDayToClear(d)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        border: selectedDayToClear === d ? '2px solid #C00000' : '1px solid #ccc',
                        background: selectedDayToClear === d ? '#FFD2D2' : '#fff',
                        color: selectedDayToClear === d ? '#9C0006' : '#333',
                        fontWeight: selectedDayToClear === d ? 'bold' : 'normal',
                      }}
                    >
                      Dia {d} ({daysStats[d].count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
              <button
                type="button"
                onClick={() => setIsClearDayModalOpen(false)}
                style={{
                  background: '#eee',
                  border: '1px solid #ccc',
                  padding: '7px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClearDay(selectedDayToClear)}
                style={{
                  background: '#C00000',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 18px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(192, 0, 0, 0.3)',
                }}
              >
                <Trash2 size={13} />
                <span>Confirmar e Limpar Dia {selectedDayToClear}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ZERAR TODA A DIF MENSAL (VIRADA DE MÊS)             */}
      {/* ============================================================ */}
      {isResetAllModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResetAllModalOpen(false)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', width: '92%' }}
          >
            {/* Cabeçalho */}
            <div style={{ background: '#800000', margin: '-20px -20px 14px -20px', padding: '12px 18px', color: '#fff', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} />
                <span>Zerar Toda a DIF Mensal (Virada de Mês)</span>
              </div>
              <button 
                onClick={() => setIsResetAllModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#FFF3CD', border: '1px solid #FFEEBA', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
              <AlertTriangle size={24} style={{ color: '#856404', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#856404', lineHeight: 1.4 }}>
                <b>Atenção:</b> Esta operação irá zerar todos os lançamentos dos <b>dias 1 a 31</b> de todos os <b>{men.length} produtos</b> ({totalEntriesInMonth} lançamentos atuais), deixando a planilha pronta para seguir com o próximo mês.
              </div>
            </div>

            {/* Opções de Fechamento */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
                Como deseja tratar a coluna de FECHAMENTO?
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px 10px', borderRadius: '4px', background: resetFechamentoMode === 'keep' ? '#F0F8FF' : '#f9f9f9', border: resetFechamentoMode === 'keep' ? '1px solid #5B9BD5' : '1px solid #eee' }}>
                  <input
                    type="radio"
                    name="fechamento_mode"
                    checked={resetFechamentoMode === 'keep'}
                    onChange={() => setResetFechamentoMode('keep')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#000' }}>
                      Manter os Fechamentos atuais (Recomendado)
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Zera os 31 dias e mantém as metas/fechamentos já cadastrados para cada item.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px 10px', borderRadius: '4px', background: resetFechamentoMode === 'last_day' ? '#F0F8FF' : '#f9f9f9', border: resetFechamentoMode === 'last_day' ? '1px solid #5B9BD5' : '1px solid #eee' }}>
                  <input
                    type="radio"
                    name="fechamento_mode"
                    checked={resetFechamentoMode === 'last_day'}
                    onChange={() => setResetFechamentoMode('last_day')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#000' }}>
                      Definir novo Fechamento com base no último dia lançado {lastDay > 0 ? `(Dia ${lastDay})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Copia o saldo do último dia ativo do mês anterior como novo Fechamento de partida.
                    </div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', padding: '8px 10px', borderRadius: '4px', background: resetFechamentoMode === 'zero' ? '#F0F8FF' : '#f9f9f9', border: resetFechamentoMode === 'zero' ? '1px solid #5B9BD5' : '1px solid #eee' }}>
                  <input
                    type="radio"
                    name="fechamento_mode"
                    checked={resetFechamentoMode === 'zero'}
                    onChange={() => setResetFechamentoMode('zero')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: '#000' }}>
                      Zerar tudo completamente (dias e fechamentos)
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Limpa 100% da tabela, zerando tanto os 31 dias quanto todos os valores de Fechamento.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
              <button
                type="button"
                onClick={() => setIsResetAllModalOpen(false)}
                style={{
                  background: '#eee',
                  border: '1px solid #ccc',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                style={{
                  background: '#800000',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(128, 0, 0, 0.3)',
                }}
              >
                <RotateCcw size={14} />
                <span>Confirmar e Zerar DIF Mensal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: EDIÇÃO / LIMPEZA DE CÉLULA INDIVIDUAL               */}
      {/* ============================================================ */}
      {cellEdit && (
        <div className="modal-overlay" onClick={() => setCellEdit(null)}>
          <div 
            className="modal-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', width: '90%' }}
          >
            <div style={{ background: '#2B579A', margin: '-20px -20px 14px -20px', padding: '10px 16px', color: '#fff', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={15} />
                <span>Lançamento Individual — Dia {cellEdit.day}</span>
              </div>
              <button onClick={() => setCellEdit(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '15px' }}>✕</button>
            </div>

            <div style={{ fontSize: '12px', color: '#444', marginBottom: '14px' }}>
              <div>Código: <b className="font-mono">{cellEdit.cod}</b></div>
              <div style={{ fontWeight: 'bold', color: '#000', marginTop: '2px' }}>{cellEdit.desc}</div>
              <div style={{ marginTop: '4px', color: '#666' }}>
                Valor atual no Dia {cellEdit.day}: <b>{cellEdit.currentVal === null ? 'Vazio (-)' : cellEdit.currentVal}</b>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>
                Novo Valor para o Dia {cellEdit.day}:
              </label>
              <input
                type="number"
                value={cellEdit.valInput}
                onChange={(e) => setCellEdit({ ...cellEdit, valInput: e.target.value })}
                placeholder="Deixe em branco para limpar (vazio)"
                autoFocus
                style={{ width: '100%', padding: '6px 10px', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
              <small style={{ color: '#888', display: 'block', marginTop: '3px' }}>
                Dica: Digite o número ou clique em "Limpar Lançamento" para deixar vazio.
              </small>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  handleSaveCell(cellEdit.cod, cellEdit.day, null);
                  setCellEdit(null);
                }}
                style={{
                  background: '#FFF0F0',
                  color: '#C00000',
                  border: '1px solid #FFC7CE',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                }}
              >
                Limpar Lançamento (Vazio)
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCellEdit(null)}
                  style={{ background: '#eee', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11.5px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = cellEdit.valInput.trim() === '' ? null : Number(cellEdit.valInput);
                    handleSaveCell(cellEdit.cod, cellEdit.day, isNaN(parsed as any) ? null : parsed);
                    setCellEdit(null);
                  }}
                  style={{ background: '#2B579A', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 'bold' }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
