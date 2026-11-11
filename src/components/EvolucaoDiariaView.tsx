import React, { useState, useMemo } from 'react';
import { RawData, CalculatedProduct } from '../data/types';
import { N, Rt, RenderMoney } from '../utils/formatters';
import {
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Search,
  Copy,
  Check,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Filter,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Scale,
  Columns,
  Boxes
} from 'lucide-react';

interface EvolucaoDiariaViewProps {
  data: RawData;
  calculatedMap: Record<number, CalculatedProduct>;
  calculatedProducts: CalculatedProduct[];
  history?: { data: RawData; desc: string }[];
}

interface DiffOption {
  id: string;
  label: string;
  shortName: string;
  category: 'diario' | 'mensal' | 'historico' | 'outros';
}

export type DiagnosticoGrupo = 'vermelho' | 'amarelo' | 'verde' | 'neutro';

export type MudancaStatus =
  | 'nova_falta'
  | 'falta_aumentou'
  | 'falta_recuperou'
  | 'falta_sanada'
  | 'nova_sobra'
  | 'sobra_aumentou'
  | 'sobra_reduziu'
  | 'sobra_sanada'
  | 'virou_sobra'
  | 'virou_falta'
  | 'inalterado';

export interface MudancaItem {
  c: number;
  d: string;
  tipo: string;
  precoUnit: number;
  qtdOntem: number;
  qtdHoje: number;
  varQtd: number;
  valorOntem: number;
  valorHoje: number;
  impactoValor: number;
  status: MudancaStatus;
  diagnosticoGrupo: DiagnosticoGrupo;
  statusLabel: string;
  statusDesc: string;
  statusColor: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  dataRef: string;
}

export const EvolucaoDiariaView: React.FC<EvolucaoDiariaViewProps> = ({
  data,
  calculatedMap,
  calculatedProducts,
  history = [],
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<
    | 'com_mudanca'
    | 'vermelhos'
    | 'amarelos'
    | 'verdes'
    | 'pioraram'
    | 'melhoraram'
    | 'sanados'
    | 'novos'
    | 'faltas'
    | 'sobras'
    | 'todos'
  >('com_mudanca');

  const [sortField, setSortField] = useState<'impacto' | 'varQtd' | 'cod' | 'desc'>('impacto');
  const [sortAsc, setSortAsc] = useState<boolean>(true); // Pior impacto financeiro primeiro
  const [copied, setCopied] = useState(false);

  // Mapeamentos diários e mensais
  const diaMap = useMemo(() => {
    const map: Record<number, { eq: number; gq: number }> = {};
    data.dia.forEach(([cod, eq, gq]) => {
      map[cod] = { eq, gq };
    });
    return map;
  }, [data.dia]);

  const menMap = useMemo(() => {
    const map: Record<number, { fechamento: number; dias: (number | null)[] }> = {};
    data.men.forEach((r) => {
      map[r[0]] = {
        fechamento: r[3] || 0,
        dias: r[4] || [],
      };
    });
    return map;
  }, [data.men]);

  const availableMonthlyDays = useMemo(() => {
    const daysSet = new Set<number>();
    data.men.forEach((r) => {
      if (r[4]) {
        r[4].forEach((v, idx) => {
          if (v !== null && v !== undefined) daysSet.add(idx + 1);
        });
      }
    });
    return Array.from(daysSet).sort((a, b) => a - b);
  }, [data.men]);

  // Lista de todas as opções de conciliações para seleção
  const allOptions = useMemo<DiffOption[]>(() => {
    const opts: DiffOption[] = [
      {
        id: 'atual',
        label: '⚡ Conciliação Atual em Tempo Real (Hoje / Dashboard)',
        shortName: 'HOJE (ATUAL)',
        category: 'diario',
      },
      {
        id: 'dia_eq',
        label: '📌 DIF Congelada / Salva Oficial no Diário (EQ)',
        shortName: 'DIF CONGELADA (EQ)',
        category: 'diario',
      },
      {
        id: 'dia_gq',
        label: '📋 DIF Gravada no Relatório Diário (GQ)',
        shortName: 'DIF GRAVADA (GQ)',
        category: 'diario',
      },
      {
        id: 'men_fechamento',
        label: '🏁 Fechamento do Mês Anterior (DIF Mensal)',
        shortName: 'FECHAMENTO',
        category: 'mensal',
      },
    ];

    availableMonthlyDays.forEach((d) => {
      const dStr = String(d).padStart(2, '0');
      opts.push({
        id: `men_day_${d}`,
        label: `📅 DIF Mensal - Dia ${dStr}`,
        shortName: `DIA ${dStr}`,
        category: 'mensal',
      });
    });

    if (history && history.length > 0) {
      history.forEach((h, idx) => {
        opts.push({
          id: `hist_${idx}`,
          label: `💾 Histórico [${idx + 1}]: ${h.desc.slice(0, 32)}…`,
          shortName: `HIST #${idx + 1}`,
          category: 'historico',
        });
      });
    }

    opts.push({
      id: 'zero',
      label: '0️⃣ Base Zerada (0 caixas)',
      shortName: 'BASE ZERADA',
      category: 'outros',
    });

    return opts;
  }, [availableMonthlyDays, history]);

  // Detecção Automática das 2 Últimas Conciliações (Ontem x Hoje)
  const twoLatestConciliacoes = useMemo<{ refId: string; targetId: string }>(() => {
    const list: Array<{ id: string; order: number; count: number }> = [];

    const hasFechamento = data.men.some((r) => (r[3] || 0) !== 0);
    if (hasFechamento) {
      list.push({ id: 'men_fechamento', order: 100, count: 1 });
    }

    availableMonthlyDays.forEach((d) => {
      let count = 0;
      data.men.forEach((r) => {
        const val = r[4]?.[d - 1];
        if (val !== null && val !== undefined && val !== 0) count++;
      });
      if (count > 0) {
        list.push({ id: `men_day_${d}`, order: 200 + d, count });
      }
    });

    if (history && history.length > 0) {
      history.forEach((h, idx) => {
        const hasData = h.data?.dia?.some((x) => (x[1] || 0) !== 0);
        if (hasData) {
          list.push({ id: `hist_${idx}`, order: 500 + idx, count: 1 });
        }
      });
    }

    let gqCount = 0;
    data.dia.forEach((d) => {
      if ((d[2] || 0) !== 0) gqCount++;
    });
    if (gqCount > 0) {
      list.push({ id: 'dia_gq', order: 800, count: gqCount });
    }

    let eqCount = 0;
    data.dia.forEach((d) => {
      if ((d[1] || 0) !== 0) eqCount++;
    });
    if (eqCount > 0) {
      list.push({ id: 'dia_eq', order: 900, count: eqCount });
    }

    let liveCount = 0;
    calculatedProducts.forEach((p) => {
      const r = calculatedMap[p.c]?.R ?? 0;
      if (r !== 0) liveCount++;
    });
    if (liveCount > 0) {
      list.push({ id: 'atual', order: 1000, count: liveCount });
    }

    list.sort((a, b) => a.order - b.order);

    if (list.length >= 2) {
      return {
        refId: list[list.length - 2].id, // Ontem / Penúltima
        targetId: list[list.length - 1].id, // Hoje / Última
      };
    } else if (list.length === 1) {
      return { refId: 'zero', targetId: list[0].id };
    } else {
      return { refId: 'dia_eq', targetId: 'atual' };
    }
  }, [data.dia, data.men, availableMonthlyDays, history, calculatedProducts, calculatedMap]);

  const [autoSelectLatest, setAutoSelectLatest] = useState<boolean>(true);
  const [refSource, setRefSource] = useState<string>(twoLatestConciliacoes.refId);
  const [targetSource, setTargetSource] = useState<string>(twoLatestConciliacoes.targetId);

  React.useEffect(() => {
    if (autoSelectLatest) {
      setRefSource(twoLatestConciliacoes.refId);
      setTargetSource(twoLatestConciliacoes.targetId);
    }
  }, [autoSelectLatest, twoLatestConciliacoes]);

  const refOption = useMemo(() => {
    return allOptions.find((o) => o.id === refSource) || allOptions[0];
  }, [allOptions, refSource]);

  const targetOption = useMemo(() => {
    return allOptions.find((o) => o.id === targetSource) || allOptions[1] || allOptions[0];
  }, [allOptions, targetSource]);

  // Função para extrair o valor da diferença de qualquer conciliação
  const getDiffValue = (sourceId: string, code: number): number => {
    if (sourceId === 'atual') {
      const r = calculatedMap[code];
      return r ? r.R : 0;
    }
    if (sourceId === 'dia_eq') {
      const eqVal = diaMap[code]?.eq;
      if (eqVal !== undefined && eqVal !== null && eqVal !== 0) {
        return eqVal;
      }
      const menItem = menMap[code];
      if (menItem && menItem.dias) {
        for (let i = menItem.dias.length - 1; i >= 0; i--) {
          const dVal = menItem.dias[i];
          if (dVal !== null && dVal !== undefined && dVal !== 0) {
            return dVal;
          }
        }
      }
      return eqVal ?? 0;
    }
    if (sourceId === 'dia_gq') {
      return diaMap[code]?.gq ?? 0;
    }
    if (sourceId === 'men_fechamento') {
      return menMap[code]?.fechamento ?? 0;
    }
    if (sourceId.startsWith('men_day_')) {
      const day = parseInt(sourceId.replace('men_day_', ''), 10);
      return menMap[code]?.dias[day - 1] ?? 0;
    }
    if (sourceId.startsWith('hist_')) {
      const idx = parseInt(sourceId.replace('hist_', ''), 10);
      const hItem = history[idx];
      if (hItem) {
        const dEntry = hItem.data.dia.find((x) => x[0] === code);
        return dEntry ? dEntry[1] : 0;
      }
      return 0;
    }
    return 0;
  };

  // Cálculo Detalhado de todas as mudanças da Conciliação de Ontem para a de Hoje
  const items = useMemo<MudancaItem[]>(() => {
    const list: MudancaItem[] = [];
    const dataLabel = `${refOption.shortName} ➔ ${targetOption.shortName}`;

    calculatedProducts.forEach((r) => {
      const qtdOntem = getDiffValue(refSource, r.c);
      const qtdHoje = getDiffValue(targetSource, r.c);
      const varQtd = qtdHoje - qtdOntem;
      const precoUnit = r.U || 0;
      const valorOntem = qtdOntem * precoUnit;
      const valorHoje = qtdHoje * precoUnit;
      const impactoValor = valorHoje - valorOntem;

      // Diagnóstico detalhado do que mudou
      let status: MudancaStatus = 'inalterado';
      let statusLabel = 'Inalterado';
      let statusDesc = 'Manteve a mesma diferença';
      let statusColor = {
        bg: '#F9FAFB',
        text: '#6B7280',
        border: '#E5E7EB',
        badgeBg: '#F3F4F6',
        badgeText: '#4B5563',
      };

      if (qtdOntem < 0 && qtdHoje < 0) {
        if (qtdHoje < qtdOntem) {
          status = 'falta_aumentou';
          const dif = Math.abs(qtdHoje) - Math.abs(qtdOntem);
          statusLabel = '🔴 Falta Aumentou';
          statusDesc = `Falta aumentou em ${dif} cx (${N(qtdOntem)} ➔ ${N(qtdHoje)})`;
          statusColor = {
            bg: '#FEF2F2',
            text: '#991B1B',
            border: '#F87171',
            badgeBg: '#FEE2E2',
            badgeText: '#DC2626',
          };
        } else if (qtdHoje > qtdOntem) {
          status = 'falta_recuperou';
          const rec = Math.abs(qtdOntem) - Math.abs(qtdHoje);
          statusLabel = '🟢 Falta Recuperou';
          statusDesc = `Falta recuperou ${rec} cx (${N(qtdOntem)} ➔ ${N(qtdHoje)})`;
          statusColor = {
            bg: '#F0FDF4',
            text: '#166534',
            border: '#4ADE80',
            badgeBg: '#DCFCE7',
            badgeText: '#15803D',
          };
        }
      } else if (qtdOntem < 0 && qtdHoje === 0) {
        status = 'falta_sanada';
        statusLabel = '🎯 Falta Sanada (= 0)';
        statusDesc = `Falta de ${N(qtdOntem)} cx foi 100% resolvida / encontrada hoje`;
        statusColor = {
          bg: '#ECFDF5',
          text: '#065F46',
          border: '#34D399',
          badgeBg: '#D1FAE5',
          badgeText: '#047857',
        };
      } else if (qtdOntem === 0 && qtdHoje < 0) {
        status = 'nova_falta';
        statusLabel = '🔴 Nova Falta Surgida';
        statusDesc = `Surgiu falta de ${N(qtdHoje)} cx hoje`;
        statusColor = {
          bg: '#FEF2F2',
          text: '#991B1B',
          border: '#EF4444',
          badgeBg: '#FEE2E2',
          badgeText: '#B91C1C',
        };
      } else if (qtdOntem > 0 && qtdHoje > 0) {
        if (qtdHoje > qtdOntem) {
          status = 'sobra_aumentou';
          const dif = qtdHoje - qtdOntem;
          statusLabel = '🔵 Sobra Aumentou';
          statusDesc = `Sobra aumentou em ${dif} cx (${N(qtdOntem)} ➔ ${N(qtdHoje)})`;
          statusColor = {
            bg: '#EFF6FF',
            text: '#1E40AF',
            border: '#60A5FA',
            badgeBg: '#DBEAFE',
            badgeText: '#1D4ED8',
          };
        } else if (qtdHoje < qtdOntem) {
          status = 'sobra_reduziu';
          const red = qtdOntem - qtdHoje;
          statusLabel = '🟡 Sobra Reduziu';
          statusDesc = `Sobra reduziu em ${red} cx (${N(qtdOntem)} ➔ ${N(qtdHoje)})`;
          statusColor = {
            bg: '#FFFBEB',
            text: '#92400E',
            border: '#FBBF24',
            badgeBg: '#FEF3C7',
            badgeText: '#B45309',
          };
        }
      } else if (qtdOntem > 0 && qtdHoje === 0) {
        status = 'sobra_sanada';
        statusLabel = '🎯 Sobra Regularizada (= 0)';
        statusDesc = `Sobra de +${N(qtdOntem)} cx foi regularizada/zerada hoje`;
        statusColor = {
          bg: '#ECFDF5',
          text: '#065F46',
          border: '#34D399',
          badgeBg: '#D1FAE5',
          badgeText: '#047857',
        };
      } else if (qtdOntem === 0 && qtdHoje > 0) {
        status = 'nova_sobra';
        statusLabel = '🔵 Nova Sobra Surgida';
        statusDesc = `Surgiu sobra de +${N(qtdHoje)} cx hoje`;
        statusColor = {
          bg: '#EFF6FF',
          text: '#1E40AF',
          border: '#3B82F6',
          badgeBg: '#DBEAFE',
          badgeText: '#1D4ED8',
        };
      } else if (qtdOntem < 0 && qtdHoje > 0) {
        status = 'virou_sobra';
        statusLabel = '🟢 Virou Sobra';
        statusDesc = `Inverteu: era falta de ${N(qtdOntem)} cx e virou sobra de +${N(qtdHoje)} cx`;
        statusColor = {
          bg: '#F0FDF4',
          text: '#166534',
          border: '#10B981',
          badgeBg: '#DCFCE7',
          badgeText: '#15803D',
        };
      } else if (qtdOntem > 0 && qtdHoje < 0) {
        status = 'virou_falta';
        statusLabel = '🔴 Virou Falta';
        statusDesc = `Inverteu: era sobra de +${N(qtdOntem)} cx e virou falta de ${N(qtdHoje)} cx`;
        statusColor = {
          bg: '#FEF2F2',
          text: '#991B1B',
          border: '#EF4444',
          badgeBg: '#FEE2E2',
          badgeText: '#B91C1C',
        };
      }

      let diagnosticoGrupo: DiagnosticoGrupo = 'neutro';
      if (
        status === 'falta_aumentou' ||
        status === 'nova_falta' ||
        status === 'virou_falta'
      ) {
        diagnosticoGrupo = 'vermelho';
      } else if (
        status === 'sobra_aumentou' ||
        status === 'nova_sobra' ||
        status === 'sobra_reduziu' ||
        status === 'virou_sobra'
      ) {
        diagnosticoGrupo = 'amarelo';
      } else if (
        status === 'falta_recuperou' ||
        status === 'falta_sanada' ||
        status === 'sobra_sanada'
      ) {
        diagnosticoGrupo = 'verde';
      }

      list.push({
        c: r.c,
        d: r.d,
        tipo: r.t,
        precoUnit,
        qtdOntem,
        qtdHoje,
        varQtd,
        valorOntem,
        valorHoje,
        impactoValor,
        status,
        diagnosticoGrupo,
        statusLabel,
        statusDesc,
        statusColor,
        dataRef: dataLabel,
      });
    });

    return list;
  }, [calculatedProducts, refSource, targetSource, refOption, targetOption, diaMap, menMap, calculatedMap, history]);

  // Estatísticas dos 3 Grupos de Diagnósticos (Vermelhos, Amarelos, Verdes)
  const diagnosticosStats = useMemo(() => {
    let vermCount = 0;
    let vermCx = 0;
    let vermVal = 0;
    let faltaAumentouCount = 0;
    let novaFaltaCount = 0;
    let virouFaltaCount = 0;

    let amarCount = 0;
    let amarCx = 0;
    let amarVal = 0;
    let novaSobraCount = 0;
    let sobraAumentouCount = 0;
    let sobraReduziuCount = 0;
    let virouSobraCount = 0;

    let verdCount = 0;
    let verdCx = 0;
    let verdVal = 0;
    let faltaRecuperouCount = 0;
    let faltaSanadaCount = 0;
    let sobraSanadaCount = 0;

    items.forEach((item) => {
      if (item.diagnosticoGrupo === 'vermelho') {
        vermCount++;
        vermCx += Math.abs(item.varQtd);
        vermVal += Math.abs(item.impactoValor);
        if (item.status === 'falta_aumentou') faltaAumentouCount++;
        if (item.status === 'nova_falta') novaFaltaCount++;
        if (item.status === 'virou_falta') virouFaltaCount++;
      } else if (item.diagnosticoGrupo === 'amarelo') {
        amarCount++;
        amarCx += Math.abs(item.varQtd);
        amarVal += Math.abs(item.impactoValor);
        if (item.status === 'nova_sobra') novaSobraCount++;
        if (item.status === 'sobra_aumentou') sobraAumentouCount++;
        if (item.status === 'sobra_reduziu') sobraReduziuCount++;
        if (item.status === 'virou_sobra') virouSobraCount++;
      } else if (item.diagnosticoGrupo === 'verde') {
        verdCount++;
        verdCx += Math.abs(item.varQtd);
        verdVal += Math.abs(item.impactoValor);
        if (item.status === 'falta_recuperou') faltaRecuperouCount++;
        if (item.status === 'falta_sanada') faltaSanadaCount++;
        if (item.status === 'sobra_sanada') sobraSanadaCount++;
      }
    });

    return {
      vermelhos: {
        count: vermCount,
        cx: vermCx,
        val: vermVal,
        faltaAumentouCount,
        novaFaltaCount,
        virouFaltaCount,
      },
      amarelos: {
        count: amarCount,
        cx: amarCx,
        val: amarVal,
        novaSobraCount,
        sobraAumentouCount,
        sobraReduziuCount,
        virouSobraCount,
      },
      verdes: {
        count: verdCount,
        cx: verdCx,
        val: verdVal,
        faltaRecuperouCount,
        faltaSanadaCount,
        sobraSanadaCount,
      },
    };
  }, [items]);

  // Totais e KPIs Executivos
  const metrics = useMemo(() => {
    let pioraramCount = 0;
    let pioraramCx = 0;
    let pioraramVal = 0;

    let melhoraramCount = 0;
    let melhoraramCx = 0;
    let melhoraramVal = 0;

    let sanadosCount = 0;
    let sanadosVal = 0;

    let saldoOntem = 0;
    let saldoHoje = 0;

    items.forEach((item) => {
      saldoOntem += item.valorOntem;
      saldoHoje += item.valorHoje;

      if (
        item.status === 'falta_aumentou' ||
        item.status === 'nova_falta' ||
        item.status === 'virou_falta'
      ) {
        pioraramCount++;
        pioraramCx += Math.abs(item.varQtd);
        pioraramVal += Math.abs(item.impactoValor);
      } else if (
        item.status === 'falta_recuperou' ||
        item.status === 'sobra_reduziu' ||
        item.status === 'virou_sobra'
      ) {
        melhoraramCount++;
        melhoraramCx += Math.abs(item.varQtd);
        melhoraramVal += Math.abs(item.impactoValor);
      } else if (item.status === 'falta_sanada' || item.status === 'sobra_sanada') {
        sanadosCount++;
        sanadosVal += Math.abs(item.valorOntem);
      }
    });

    const evolucaoSaldo = saldoHoje - saldoOntem;
    const totalComMudanca = items.filter((i) => i.varQtd !== 0).length;

    return {
      pioraramCount,
      pioraramCx,
      pioraramVal,
      melhoraramCount,
      melhoraramCx,
      melhoraramVal,
      sanadosCount,
      sanadosVal,
      saldoOntem,
      saldoHoje,
      evolucaoSaldo,
      totalComMudanca,
      totalProdutos: items.length,
    };
  }, [items]);

  // Filtragem da Tabela
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items
      .filter((item) => {
        // Busca por código ou descrição
        if (q && !(item.c + ' ' + item.d).toLowerCase().includes(q)) {
          return false;
        }

        // Filtro por tipo de mudança ou grupo de diagnóstico
        switch (filterType) {
          case 'com_mudanca':
            return item.varQtd !== 0;
          case 'vermelhos':
            return item.diagnosticoGrupo === 'vermelho';
          case 'amarelos':
            return item.diagnosticoGrupo === 'amarelo';
          case 'verdes':
            return item.diagnosticoGrupo === 'verde';
          case 'pioraram':
            return item.diagnosticoGrupo === 'vermelho';
          case 'melhoraram':
            return (
              item.status === 'falta_recuperou' ||
              item.status === 'sobra_reduziu' ||
              item.status === 'virou_sobra'
            );
          case 'sanados':
            return item.status === 'falta_sanada' || item.status === 'sobra_sanada';
          case 'novos':
            return item.status === 'nova_falta' || item.status === 'nova_sobra';
          case 'faltas':
            return item.qtdHoje < 0 || item.qtdOntem < 0;
          case 'sobras':
            return item.qtdHoje > 0 || item.qtdOntem > 0;
          case 'todos':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'impacto') {
          diff = a.impactoValor - b.impactoValor;
        } else if (sortField === 'varQtd') {
          diff = a.varQtd - b.varQtd;
        } else if (sortField === 'cod') {
          diff = a.c - b.c;
        } else if (sortField === 'desc') {
          diff = a.d.localeCompare(b.d);
        }
        return sortAsc ? diff : -diff;
      });
  }, [items, query, filterType, sortField, sortAsc]);

  // Totais da tabela filtrada
  const tableTotals = useMemo(() => {
    let totQtdOntem = 0;
    let totQtdHoje = 0;
    let totVarQtd = 0;
    let totValOntem = 0;
    let totValHoje = 0;
    let totImpacto = 0;

    filteredItems.forEach((i) => {
      totQtdOntem += i.qtdOntem;
      totQtdHoje += i.qtdHoje;
      totVarQtd += i.varQtd;
      totValOntem += i.valorOntem;
      totValHoje += i.valorHoje;
      totImpacto += i.impactoValor;
    });

    return {
      totQtdOntem,
      totQtdHoje,
      totVarQtd,
      totValOntem,
      totValHoje,
      totImpacto,
    };
  }, [filteredItems]);

  const handleSort = (field: 'impacto' | 'varQtd' | 'cod' | 'desc') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'impacto' || field === 'varQtd' ? true : false);
    }
  };

  const copyTableToClipboard = () => {
    const headers = [
      'DATA',
      'PRODUTO',
      'DESCRIÇÃO',
      'VALOR UNIT.',
      'QTD ONTEM',
      'QTD HOJE',
      'VARIAÇÃO QTD',
      'VALOR ONTEM',
      'VALOR HOJE',
      'IMPACTO TOTAL R$',
      'STATUS / DIAGNÓSTICO',
    ];

    const rows = filteredItems.map((item) => [
      item.dataRef,
      item.c,
      item.d,
      item.precoUnit.toFixed(2).replace('.', ','),
      item.qtdOntem,
      item.qtdHoje,
      item.varQtd,
      item.valorOntem.toFixed(2).replace('.', ','),
      item.valorHoje.toFixed(2).replace('.', ','),
      item.impactoValor.toFixed(2).replace('.', ','),
      `${item.statusLabel} - ${item.statusDesc}`,
    ]);

    const tsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <section className="w-full flex flex-col gap-3 px-3 py-2 bg-slate-50 min-h-screen">
      {/* =========================================================================
          1. BARRA SUPERIOR DE CONCILIAÇÕES: ONTEM (Penúltima) vs HOJE (Última)
         ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          color: '#fff',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid #3730A3',
          boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="#A5B4FC" />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#EEF2FF' }}>
              ANÁLISE DIÁRIA (O QUE MUDOU DE ONTEM PARA HOJE):
            </span>
          </div>

          {/* Seletor Ontem (Penúltima) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#FCD34D', fontWeight: 600 }}>ONTEM:</span>
            <select
              value={refSource}
              onChange={(e) => {
                setAutoSelectLatest(false);
                setRefSource(e.target.value);
              }}
              style={{
                background: '#0f172a',
                color: '#FCD34D',
                border: '1px solid #D97706',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {allOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.shortName}
                </option>
              ))}
            </select>
          </div>

          <span style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: '13px' }}>➔</span>

          {/* Seletor Hoje (Última) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#93C5FD', fontWeight: 600 }}>HOJE:</span>
            <select
              value={targetSource}
              onChange={(e) => {
                setAutoSelectLatest(false);
                setTargetSource(e.target.value);
              }}
              style={{
                background: '#0f172a',
                color: '#93C5FD',
                border: '1px solid #2563EB',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {allOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.shortName}
                </option>
              ))}
            </select>
          </div>

          {autoSelectLatest ? (
            <span
              style={{
                fontSize: '10.5px',
                background: 'rgba(16, 185, 129, 0.25)',
                color: '#34D399',
                border: '1px solid #10B981',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
              }}
              title="Comparando automaticamente a penúltima conciliação (ontem) com a última (hoje)"
            >
              ⚡ Auto (Ontem x Hoje)
            </span>
          ) : (
            <button
              onClick={() => setAutoSelectLatest(true)}
              style={{
                background: '#047857',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 10px',
                fontSize: '10.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ⚡ Reativar Auto
            </button>
          )}
        </div>

        {/* Resumo Financeiro Líquido */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.5px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: '#94a3b8' }}>Saldo Ontem: </span>
            <b style={{ color: metrics.saldoOntem < 0 ? '#F87171' : '#4ADE80' }}>
              {Rt(metrics.saldoOntem)}
            </b>
          </div>
          <span style={{ color: '#64748b' }}>➔</span>
          <div>
            <span style={{ color: '#94a3b8' }}>Saldo Hoje: </span>
            <b style={{ color: metrics.saldoHoje < 0 ? '#F87171' : '#4ADE80' }}>
              {Rt(metrics.saldoHoje)}
            </b>
          </div>
          <span style={{ color: '#64748b' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#cbd5e1' }}>Evolução Líquida: </span>
            <span
              style={{
                background:
                  metrics.evolucaoSaldo >= 0
                    ? 'rgba(74, 222, 128, 0.2)'
                    : 'rgba(248, 113, 113, 0.2)',
                color: metrics.evolucaoSaldo >= 0 ? '#4ADE80' : '#F87171',
                border:
                  metrics.evolucaoSaldo >= 0
                    ? '1px solid #4ADE80'
                    : '1px solid #F87171',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
            >
              {metrics.evolucaoSaldo >= 0 ? '+' : ''}
              {Rt(metrics.evolucaoSaldo)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. CARDS DE DIAGNÓSTICOS: VERMELHOS | AMARELOS | VERDES (UM DO LADO DO OUTRO)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Diagnósticos Vermelhos */}
        <div
          onClick={() => setFilterType(filterType === 'vermelhos' ? 'com_mudanca' : 'vermelhos')}
          className={`cursor-pointer transition-all duration-150 p-3.5 rounded-xl border flex flex-col justify-between shadow-xs ${
            filterType === 'vermelhos'
              ? 'ring-2 ring-red-500 bg-red-50/90 border-red-400 shadow-md transform -translate-y-0.5'
              : 'bg-white border-red-200 hover:border-red-400 hover:shadow-sm'
          }`}
          title="Clique para filtrar apenas os Diagnósticos Vermelhos (Faltas que aumentaram, novas faltas e viraram falta)"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-red-700 tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                <AlertTriangle size={15} className="text-red-600" />
                Diagnósticos Vermelhos
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-800 border border-red-200">
                {diagnosticosStats.vermelhos.count} produtos
              </span>
            </div>
            <div className="text-[11px] text-red-600 font-medium mt-0.5">
              Faltas Críticas & Piora no Estoque
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div className="text-2xl font-black text-red-700 font-mono tracking-tight">
                -R$ {N(diagnosticosStats.vermelhos.val)}
              </div>
              <div className="text-xs font-bold text-red-600 font-mono bg-red-100/70 px-2 py-0.5 rounded">
                +{N(diagnosticosStats.vermelhos.cx)} cx em falta
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-red-100">
            <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
              <span className="bg-red-100/80 text-red-800 px-2 py-0.5 rounded font-medium">
                Aumentaram: <b>{diagnosticosStats.vermelhos.faltaAumentouCount}</b>
              </span>
              <span className="bg-red-100/80 text-red-800 px-2 py-0.5 rounded font-medium">
                Novas faltas: <b>{diagnosticosStats.vermelhos.novaFaltaCount}</b>
              </span>
              {diagnosticosStats.vermelhos.virouFaltaCount > 0 && (
                <span className="bg-red-100/80 text-red-800 px-2 py-0.5 rounded font-medium">
                  Viraram falta: <b>{diagnosticosStats.vermelhos.virouFaltaCount}</b>
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-red-700 font-bold">
              <span>{filterType === 'vermelhos' ? '✓ Filtro Ativo' : 'Filtrar Vermelhos ➔'}</span>
              <span className="text-[10px] text-red-500 font-normal">Impacto Financeiro Negativo</span>
            </div>
          </div>
        </div>

        {/* Card 2: Diagnósticos Amarelos */}
        <div
          onClick={() => setFilterType(filterType === 'amarelos' ? 'com_mudanca' : 'amarelos')}
          className={`cursor-pointer transition-all duration-150 p-3.5 rounded-xl border flex flex-col justify-between shadow-xs ${
            filterType === 'amarelos'
              ? 'ring-2 ring-amber-500 bg-amber-50/90 border-amber-400 shadow-md transform -translate-y-0.5'
              : 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-sm'
          }`}
          title="Clique para filtrar apenas os Diagnósticos Amarelos (Sobras físicas e divergências em análise)"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-amber-800 tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <Boxes size={15} className="text-amber-600" />
                Diagnósticos Amarelos
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                {diagnosticosStats.amarelos.count} produtos
              </span>
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
              Sobras Físicas & Variações em Análise
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div className="text-2xl font-black text-amber-800 font-mono tracking-tight">
                R$ {N(diagnosticosStats.amarelos.val)}
              </div>
              <div className="text-xs font-bold text-amber-700 font-mono bg-amber-100/70 px-2 py-0.5 rounded">
                {N(diagnosticosStats.amarelos.cx)} cx em sobra
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-amber-100">
            <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
              <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded font-medium">
                Novas sobras: <b>{diagnosticosStats.amarelos.novaSobraCount}</b>
              </span>
              <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded font-medium">
                Aumentaram: <b>{diagnosticosStats.amarelos.sobraAumentouCount}</b>
              </span>
              <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded font-medium">
                Reduziram: <b>{diagnosticosStats.amarelos.sobraReduziuCount}</b>
              </span>
              {diagnosticosStats.amarelos.virouSobraCount > 0 && (
                <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded font-medium">
                  Viraram sobra: <b>{diagnosticosStats.amarelos.virouSobraCount}</b>
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-800 font-bold">
              <span>{filterType === 'amarelos' ? '✓ Filtro Ativo' : 'Filtrar Amarelos ➔'}</span>
              <span className="text-[10px] text-amber-600 font-normal">Atenção Operacional</span>
            </div>
          </div>
        </div>

        {/* Card 3: Diagnósticos Verdes */}
        <div
          onClick={() => setFilterType(filterType === 'verdes' ? 'com_mudanca' : 'verdes')}
          className={`cursor-pointer transition-all duration-150 p-3.5 rounded-xl border flex flex-col justify-between shadow-xs ${
            filterType === 'verdes'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/90 border-emerald-400 shadow-md transform -translate-y-0.5'
              : 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-sm'
          }`}
          title="Clique para filtrar apenas os Diagnósticos Verdes (Faltas recuperadas e divergências 100% zeradas)"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-emerald-800 tracking-wide uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <CheckCircle2 size={15} className="text-emerald-600" />
                Diagnósticos Verdes
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                {diagnosticosStats.verdes.count} produtos
              </span>
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Faltas Recuperadas & 100% Sanados
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                +R$ {N(diagnosticosStats.verdes.val)}
              </div>
              <div className="text-xs font-bold text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded">
                {N(diagnosticosStats.verdes.cx)} cx recuperadas
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-emerald-100">
            <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
              <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded font-medium">
                Recuperadas: <b>{diagnosticosStats.verdes.faltaRecuperouCount}</b>
              </span>
              <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded font-medium">
                100% Zeradas: <b>{diagnosticosStats.verdes.faltaSanadaCount}</b>
              </span>
              {diagnosticosStats.verdes.sobraSanadaCount > 0 && (
                <span className="bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded font-medium">
                  Regularizadas: <b>{diagnosticosStats.verdes.sobraSanadaCount}</b>
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
              <span>{filterType === 'verdes' ? '✓ Filtro Ativo' : 'Filtrar Verdes ➔'}</span>
              <span className="text-[10px] text-emerald-600 font-normal">Recuperação e Regularização</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BARRA DE FILTROS RÁPIDOS, BUSCA E EXPORTAÇÃO
         ========================================================================= */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter size={13} /> Filtrar:
          </span>

          <button
            onClick={() => setFilterType('com_mudanca')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              filterType === 'com_mudanca'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Com Mudança ({metrics.totalComMudanca})
          </button>

          <button
            onClick={() => setFilterType('vermelhos')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              filterType === 'vermelhos'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            🔴 Vermelhos ({diagnosticosStats.vermelhos.count})
          </button>

          <button
            onClick={() => setFilterType('amarelos')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              filterType === 'amarelos'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            🟡 Amarelos ({diagnosticosStats.amarelos.count})
          </button>

          <button
            onClick={() => setFilterType('verdes')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              filterType === 'verdes'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🟢 Verdes ({diagnosticosStats.verdes.count})
          </button>

          <button
            onClick={() => setFilterType('sanados')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              filterType === 'sanados'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            🎯 100% Zerados ({metrics.sanadosCount})
          </button>

          <button
            onClick={() => setFilterType('todos')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              filterType === 'todos'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({metrics.totalProdutos})
          </button>
        </div>

        {/* Busca e Botão Copiar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar código ou descrição…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={copyTableToClipboard}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm transition-colors cursor-pointer"
            title="Copiar tabela formatada para colar no Excel ou Promax"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar p/ Excel'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          4. TABELA DETALHADA COM AS COLUNAS SOLICITADAS:
             Data | Produto | Descrição | Qtd Ontem | Qtd Hoje | Var Qtd | Valor do Produto | Impacto R$ | Diagnóstico
         ========================================================================= */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[calc(100vh-330px)]">
          <table className="w-full border-collapse text-left" style={{ minWidth: '1200px' }}>
            <thead className="sticky top-0 z-10 bg-slate-800 text-white text-xs select-none shadow">
              <tr style={{ height: '32px' }}>
                <th className="py-2 px-2 text-center w-10 font-bold border-r border-slate-700">#</th>

                <th className="py-2 px-3 text-center w-28 font-bold border-r border-slate-700">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar size={13} className="text-amber-400" />
                    <span>DATA</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('cod')}
                  className="py-2 px-3 text-center w-24 font-bold border-r border-slate-700 cursor-pointer hover:bg-slate-700"
                  title="Código do Produto Promax"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>PRODUTO</span>
                    {sortField === 'cod' && (
                      <span>{sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('desc')}
                  className="py-2 px-3 text-left font-bold border-r border-slate-700 cursor-pointer hover:bg-slate-700"
                  style={{ minWidth: '220px' }}
                >
                  <div className="flex items-center gap-1">
                    <span>DESCRIÇÃO DO PRODUTO</span>
                    {sortField === 'desc' && (
                      <span>{sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>
                    )}
                  </div>
                </th>

                <th className="py-2 px-3 text-right w-28 font-bold border-r border-slate-700 bg-slate-900">
                  <span>VALOR PRODUTO</span>
                  <div className="text-[10px] text-amber-300 font-normal">Preço Unit. R$/cx</div>
                </th>

                <th className="py-2 px-3 text-right w-24 font-bold border-r border-slate-700 bg-amber-950 text-amber-200">
                  <span>QTD ONTEM</span>
                  <div className="text-[10px] font-normal opacity-80">{refOption.shortName}</div>
                </th>

                <th className="py-2 px-3 text-right w-24 font-bold border-r border-slate-700 bg-blue-950 text-blue-200">
                  <span>QTD HOJE</span>
                  <div className="text-[10px] font-normal opacity-80">{targetOption.shortName}</div>
                </th>

                <th
                  onClick={() => handleSort('varQtd')}
                  className="py-2 px-3 text-right w-28 font-bold border-r border-slate-700 bg-indigo-950 text-indigo-200 cursor-pointer hover:bg-indigo-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>VARIAÇÃO QTD</span>
                    {sortField === 'varQtd' && (
                      <span>{sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>
                    )}
                  </div>
                  <div className="text-[10px] font-normal opacity-80">Δ Caixas (Hoje - Ontem)</div>
                </th>

                <th className="py-2 px-3 text-right w-28 font-bold border-r border-slate-700">
                  <span>VALOR ONTEM</span>
                  <div className="text-[10px] text-slate-400 font-normal">R$ da Diferença</div>
                </th>

                <th className="py-2 px-3 text-right w-28 font-bold border-r border-slate-700">
                  <span>VALOR HOJE</span>
                  <div className="text-[10px] text-slate-400 font-normal">R$ da Diferença</div>
                </th>

                <th
                  onClick={() => handleSort('impacto')}
                  className="py-2 px-3 text-right w-32 font-bold border-r border-slate-700 bg-slate-900 cursor-pointer hover:bg-slate-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>IMPACTO TOTAL</span>
                    {sortField === 'impacto' && (
                      <span>{sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-300 font-normal">Δ Financeiro (R$)</div>
                </th>

                <th className="py-2 px-3 text-left w-64 font-bold">
                  <span>DIAGNÓSTICO DA MUDANÇA</span>
                  <div className="text-[10px] text-slate-400 font-normal">
                    O que aconteceu da conciliação de ontem para hoje
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-200 font-sans">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 bg-slate-50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 size={32} className="text-emerald-500" />
                      <span className="font-bold text-sm text-slate-700">
                        Nenhuma alteração encontrada para este filtro
                      </span>
                      <span className="text-xs text-slate-500 max-w-md">
                        Não houve variação de caixas ou valores entre as duas conciliações
                        selecionadas para os critérios informados.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isPositiveChange = item.impactoValor > 0;
                  const isNegativeChange = item.impactoValor < 0;

                  return (
                    <tr
                      key={item.c}
                      className="hover:bg-indigo-50/40 transition-colors"
                      style={{ background: item.statusColor.bg }}
                    >
                      {/* # */}
                      <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* DATA */}
                      <td className="py-1.5 px-3 text-center border-r border-slate-200">
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-200 text-slate-700 whitespace-nowrap">
                          Ontem ➔ Hoje
                        </span>
                      </td>

                      {/* PRODUTO */}
                      <td className="py-1.5 px-3 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                        {item.c}
                      </td>

                      {/* DESCRIÇÃO */}
                      <td className="py-1.5 px-3 font-semibold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <span title={item.d} className="truncate max-w-xs">
                            {item.d}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase">
                            {item.tipo}
                          </span>
                        </div>
                      </td>

                      {/* VALOR DO PRODUTO (PREÇO UNIT CX) */}
                      <td className="py-1.5 px-3 text-right font-mono font-medium text-slate-700 border-r border-slate-200 bg-slate-50">
                        R$ {N(item.precoUnit)}
                      </td>

                      {/* QTD ONTEM */}
                      <td
                        className="py-1.5 px-3 text-right font-mono font-bold border-r border-slate-200"
                        style={{
                          color: item.qtdOntem < 0 ? '#DC2626' : item.qtdOntem > 0 ? '#2563EB' : '#9CA3AF',
                          background: item.qtdOntem < 0 ? '#FEE2E2' : item.qtdOntem > 0 ? '#DBEAFE' : undefined,
                        }}
                      >
                        {item.qtdOntem === 0 ? '0' : N(item.qtdOntem)}
                      </td>

                      {/* QTD HOJE */}
                      <td
                        className="py-1.5 px-3 text-right font-mono font-bold border-r border-slate-200"
                        style={{
                          color: item.qtdHoje < 0 ? '#DC2626' : item.qtdHoje > 0 ? '#2563EB' : '#9CA3AF',
                          background: item.qtdHoje < 0 ? '#FEE2E2' : item.qtdHoje > 0 ? '#DBEAFE' : undefined,
                        }}
                      >
                        {item.qtdHoje === 0 ? '0' : N(item.qtdHoje)}
                      </td>

                      {/* VARIAÇÃO QTD */}
                      <td className="py-1.5 px-3 text-right font-mono font-bold border-r border-slate-200">
                        {item.varQtd === 0 ? (
                          <span className="text-slate-400 text-xs">0 cx</span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold inline-block"
                            style={{
                              background: item.varQtd > 0 ? '#DCFCE7' : '#FEE2E2',
                              color: item.varQtd > 0 ? '#15803D' : '#DC2626',
                            }}
                          >
                            {item.varQtd > 0 ? `+${N(item.varQtd)}` : N(item.varQtd)} cx
                          </span>
                        )}
                      </td>

                      {/* VALOR ONTEM */}
                      <td className="py-1.5 px-3 text-right font-mono border-r border-slate-200 text-slate-700">
                        <RenderMoney value={item.valorOntem} />
                      </td>

                      {/* VALOR HOJE */}
                      <td className="py-1.5 px-3 text-right font-mono border-r border-slate-200 text-slate-700">
                        <RenderMoney value={item.valorHoje} />
                      </td>

                      {/* IMPACTO TOTAL */}
                      <td className="py-1.5 px-3 text-right font-mono font-bold border-r border-slate-200">
                        {item.impactoValor === 0 ? (
                          <span className="text-slate-400 text-xs">R$ 0,00</span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold inline-block"
                            style={{
                              background: isPositiveChange ? '#DCFCE7' : '#FEE2E2',
                              color: isPositiveChange ? '#15803D' : '#DC2626',
                            }}
                          >
                            {isPositiveChange ? '+' : ''}
                            {Rt(item.impactoValor)}
                          </span>
                        )}
                      </td>

                      {/* DIAGNÓSTICO DA MUDANÇA */}
                      <td className="py-1.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded inline-block w-fit"
                            style={{
                              background: item.statusColor.badgeBg,
                              color: item.statusColor.badgeText,
                            }}
                          >
                            {item.statusLabel}
                          </span>
                          <span className="text-[10.5px] text-slate-600 font-medium">
                            {item.statusDesc}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* =========================================================================
            5. RODAPÉ COM TOTAIS SOMADOS DA TABELA
           ========================================================================= */}
        <div className="bg-slate-900 text-white p-3 border-t border-slate-700 flex items-center justify-between flex-wrap gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">TOTAL DA LISTA:</span>
            <span className="bg-slate-800 px-2 py-1 rounded text-slate-200">
              {filteredItems.length} produtos exibidos
            </span>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-slate-400">Total Qtd Ontem: </span>
              <b className={tableTotals.totQtdOntem < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {N(tableTotals.totQtdOntem)} cx
              </b>
            </div>

            <div>
              <span className="text-slate-400">Total Qtd Hoje: </span>
              <b className={tableTotals.totQtdHoje < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {N(tableTotals.totQtdHoje)} cx
              </b>
            </div>

            <div>
              <span className="text-slate-400">Variação Qtd: </span>
              <b
                className={
                  tableTotals.totVarQtd > 0
                    ? 'text-emerald-400'
                    : tableTotals.totVarQtd < 0
                    ? 'text-red-400'
                    : 'text-slate-300'
                }
              >
                {tableTotals.totVarQtd > 0 ? '+' : ''}
                {N(tableTotals.totVarQtd)} cx
              </b>
            </div>

            <div>
              <span className="text-slate-400">Saldo Ontem: </span>
              <b className={tableTotals.totValOntem < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {Rt(tableTotals.totValOntem)}
              </b>
            </div>

            <div>
              <span className="text-slate-400">Saldo Hoje: </span>
              <b className={tableTotals.totValHoje < 0 ? 'text-red-400' : 'text-emerald-400'}>
                {Rt(tableTotals.totValHoje)}
              </b>
            </div>

            <div className="bg-slate-800 px-3 py-1 rounded border border-slate-700">
              <span className="text-amber-400 font-bold">Impacto Financeiro Total: </span>
              <b
                className={`text-sm ${
                  tableTotals.totImpacto >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {tableTotals.totImpacto >= 0 ? '+' : ''}
                {Rt(tableTotals.totImpacto)}
              </b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
