import React, { useMemo, useState, useEffect } from 'react';
import { RawData, CalculatedProduct, DashboardSnapshot, SavedPopupItem } from '../data/types';
import { N, Rt, RenderMoney } from '../utils/formatters';
import { calculateProducts, sum } from '../utils/calc';
import { Columns, Rows, CheckCircle2, Printer, Calendar, Ban, Package, X, Download, Camera } from 'lucide-react';
import { rawDia } from '../data/part2_dia';
import { CalendarHistoryWidget } from './CalendarHistoryWidget';
import { SaveDaily020502Modal } from './SaveDaily020502Modal';
import { PrintTop30Modal } from './PrintTop30Modal';
import { getMatchedProductsFrom021101, MatchedContagemInfo } from '../utils/contagem021101';
import { saveDevolucaoReminderDate, loadDevolucaoReminderDate } from '../firebase';

interface DashboardViewProps {
  data: RawData;
  calculated: CalculatedProduct[];
  onCongelar: () => void;
  onSalvar: () => void;
  onLimpar: () => void;
  onVoltarOriginal: () => void;
  onOpenImport020502?: () => void;
  onOpenAnalise?: (filter?: 'all' | 'vermelho' | 'laranja', code?: number | null) => void;
  onRecontar?: (code: number) => void;
  onToggleDesativar?: (code: number) => void;
  onNavigateToProdutos?: (searchQuery?: string) => void;
  onSavePopup?: (item: SavedPopupItem) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  lastActionDescription?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  snapshots?: DashboardSnapshot[];
  onSaveSnapshot?: (snapshot: DashboardSnapshot) => void;
  onDeleteSnapshot?: (id: string) => void;
  onDownloadSnapshot020502?: (snapshot: DashboardSnapshot) => void;
}

const mix = (a: number[], b: number[], t: number): number[] =>
  a.map((x, i) => Math.round(x + (b[i] - x) * Math.max(0, Math.min(1, t))));

function createColorScale(values: number[]) {
  const s = [...values].sort((x, y) => x - y);
  const n = s.length;
  if (n === 0) return () => '#fff';
  const md = (s[Math.floor((n - 1) / 2)] + s[Math.ceil((n - 1) / 2)]) / 2;
  const mn = s[0];
  const mx = s[n - 1];

  return (v: number) => {
    const rgb =
      v <= md
        ? mix([99, 190, 123], [255, 235, 132], md > mn ? (v - mn) / (md - mn) : 1)
        : mix([255, 235, 132], [248, 105, 107], mx > md ? (v - md) / (mx - md) : 1);
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  };
}

export interface ItemAnalysis {
  status: 'verde' | 'laranja' | 'vermelho';
  diff: number;
  hoje: number;
  ontem: number;
  label: string;
  bg: string;
  color: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  calculated,
  onCongelar,
  onSalvar,
  onLimpar,
  onVoltarOriginal,
  onOpenImport020502,
  onOpenAnalise,
  onRecontar,
  onToggleDesativar,
  onNavigateToProdutos,
  onSavePopup,
  canUndo = false,
  canRedo = false,
  lastActionDescription,
  onUndo,
  onRedo,
  snapshots = [],
  onSaveSnapshot,
  onDeleteSnapshot,
  onDownloadSnapshot020502,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'verde' | 'laranja' | 'vermelho' | 'recontagem_match'>('all');
  const [viewMode, setViewMode] = useState<'side_by_side' | 'stacked' | 'faltas_only' | 'sobras_only'>('side_by_side');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [saveModalInitialDate, setSaveModalInitialDate] = useState<string | undefined>(undefined);
  const [showDevolucaoReminder, setShowDevolucaoReminder] = useState(false);
  const [lastReminderDate, setLastReminderDate] = useState<string | null>(null);

  // Carrega a data do lembrete diretamente do Firebase Firestore
  useEffect(() => {
    let isMounted = true;
    loadDevolucaoReminderDate().then((d) => {
      if (d && isMounted) {
        setLastReminderDate(d);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Confirma o lembrete e grava no Firestore
  const handleConfirmDevolucaoReminder = () => {
    const today = new Date().toISOString().slice(0, 10);
    setLastReminderDate(today);
    saveDevolucaoReminderDate(today);
    setShowDevolucaoReminder(false);
    onOpenImport020502?.();
  };

  // Ao clicar em IMPORTAR 02.05.02: exibe o lembrete apenas na 1ª vez do dia
  const handleOpenImportWithReminder = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (lastReminderDate === today) {
      // Já exibiu e confirmou hoje: abre a importação diretamente sem abrir o popup
      onOpenImport020502?.();
    } else {
      // Primeira vez do dia: abre o popup de lembrete
      setShowDevolucaoReminder(true);
    }
  };

  // Fecha o popup com Escape e confirma com Enter
  useEffect(() => {
    if (!showDevolucaoReminder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDevolucaoReminder(false);
      } else if (e.key === 'Enter') {
        handleConfirmDevolucaoReminder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDevolucaoReminder]);

  const [selectedItemForAction, setSelectedItemForAction] = useState<{
    code: number;
    desc: string;
    qtde: number;
    valor: number;
    isFalta: boolean;
  } | null>(null);

  // Estado para o popup expandido e informativo ao passar o mouse na quantidade
  const [hoveredItem, setHoveredItem] = useState<{
    code: number;
    desc: string;
    qtde: number;
    valor: number;
    peso: number;
    unitPrice: number;
    variacaoCx: number;
    impactoVariacao: number;
    isFalta: boolean;
    analysis: ItemAnalysis;
    x: number;
    y: number;
  } | null>(null);

  const handleQuantityMouseEnter = (
    e: React.MouseEvent,
    item: {
      c: number;
      d: string;
      qtde: number;
      valor: number;
      peso: number;
      isFalta?: boolean;
      analysis?: ItemAnalysis;
    },
    isFaltaDefault: boolean
  ) => {
    if (!item.analysis) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isFalta = item.isFalta ?? isFaltaDefault;

    // Busca o preço unitário da caixa na Tabela 7 (U)
    const prod = effectiveCalculated.find((p) => p.c === item.c);
    const resEntry = data.res.find((x) => x[0] === item.c);
    const unitPrice =
      prod?.U ||
      (resEntry ? Number(resEntry[5]) : 0) ||
      (item.qtde > 0 ? Math.abs(item.valor) / item.qtde : 0);

    const variacaoCx = item.analysis.hoje - item.analysis.ontem;
    const impactoVariacao = isFalta
      ? -(variacaoCx * unitPrice)
      : variacaoCx * unitPrice;

    setHoveredItem({
      code: item.c,
      desc: item.d,
      qtde: item.qtde,
      valor: item.valor,
      peso: item.peso,
      unitPrice,
      variacaoCx,
      impactoVariacao,
      isFalta,
      analysis: item.analysis,
      x: rect.right,
      y: rect.top,
    });
  };

  const handleQuantityMouseLeave = () => {
    setHoveredItem(null);
  };

  // Dados do snapshot histórico quando ativo
  const snapshotData = useMemo(() => {
    if (!selectedSnapshot) return null;
    return {
      ...data,
      ec: selectedSnapshot.ec,
      res: selectedSnapshot.res || data.res,
    };
  }, [data, selectedSnapshot]);

  // Produtos calculados efetivos (do snapshot ou do cálculo atual)
  const effectiveCalculated = useMemo(() => {
    if (snapshotData) {
      return calculateProducts(snapshotData).C;
    }
    return calculated;
  }, [snapshotData, calculated]);

  // Mapeamento dos dados do dia anterior a partir de data.dia
  const diaMap = useMemo(() => {
    const map: Record<number, { eq: number; gq: number }> = {};
    data.dia.forEach(([cod, eq, gq]) => {
      map[cod] = { eq, gq };
    });
    return map;
  }, [data.dia]);

  // Mapa rápido de dados gravados de ontem (rawDia)
  const rawDiaMap = useMemo(() => {
    const map = new Map<number, number>();
    rawDia.forEach(([c, _eq, gq]) => {
      map.set(c, gq);
    });
    return map;
  }, []);

  // Mapeamento dos dados mensais (dias 1..31 e fechamento) a partir de data.men
  const menMap = useMemo(() => {
    const map = new Map<number, { fechamento: number; dias: (number | null)[] }>();
    data.men.forEach((r) => {
      map.set(r[0], {
        fechamento: r[3] || 0,
        dias: r[4] || [],
      });
    });
    return map;
  }, [data.men]);

  // Identifica todos os dias que possuem conciliação gravada (1..31)
  const daysWithConciliacao = useMemo(() => {
    const set = new Set<number>();
    set.add(14); // Dia 14 sempre disponível com a conciliação gravada de ontem
    data.men.forEach((r) => {
      if (r[4]) {
        r[4].forEach((v, idx) => {
          if (v !== null && v !== undefined && v !== 0) {
            set.add(idx + 1);
          }
        });
      }
    });
    return set;
  }, [data.men]);

  // Identifica o último dia que possui conciliação/dados gravados
  const latestRecordedDay = useMemo(() => {
    let maxDay = 14;
    data.men.forEach((r) => {
      if (r[4]) {
        r[4].forEach((v, idx) => {
          if (v !== null && v !== undefined && v !== 0) {
            if (idx + 1 > maxDay) maxDay = idx + 1;
          }
        });
      }
    });
    return maxDay;
  }, [data.men]);

  // Função para obter o histórico e a variação dos últimos 5 dias para o popup
  const getProductLast5Days = (code: number, isFalta: boolean, currentQty: number) => {
    const refDay = selectedDay !== null ? selectedDay : latestRecordedDay;
    const dayNumbers: number[] = [];
    const startDay = Math.max(1, refDay - 4);
    for (let d = startDay; d <= Math.min(31, startDay + 4); d++) {
      dayNumbers.push(d);
    }
    while (dayNumbers.length < 5 && dayNumbers[0] > 1) {
      dayNumbers.unshift(dayNumbers[0] - 1);
    }

    const daysData = dayNumbers.map((d) => {
      let qtyVal = 0;
      if (d === refDay) {
        qtyVal = Math.round(currentQty);
      } else {
        const diffVal = getProductDayDiff(d, code);
        qtyVal = isFalta ? Math.abs(diffVal < 0 ? diffVal : 0) : Math.max(0, diffVal);
        if (qtyVal === 0 && d === refDay - 1 && selectedDay === null) {
          const prevEntry = diaMap[code];
          if (prevEntry) {
            const v = prevEntry.eq;
            qtyVal = isFalta ? Math.abs(v < 0 ? v : 0) : Math.max(0, v);
          }
        }
      }

      return {
        day: d,
        isToday: d === refDay,
        label: d === refDay ? 'Hoje' : d === refDay - 1 ? 'Ontem' : `D${d}`,
        qty: qtyVal,
      };
    });

    const firstVal = daysData[0]?.qty ?? 0;
    const lastVal = daysData[daysData.length - 1]?.qty ?? 0;
    const periodDiff = lastVal - firstVal;
    const avg = daysData.reduce((acc, curr) => acc + curr.qty, 0) / daysData.length;

    return {
      days: daysData,
      periodDiff,
      avg: Number(avg.toFixed(1)),
      startDay: dayNumbers[0],
      endDay: dayNumbers[dayNumbers.length - 1],
    };
  };

  // Função para obter a diferença (em caixas) de um produto em um dia específico
  const getProductDayDiff = (day: number, code: number): number => {
    const entry = menMap.get(code);
    const val = entry?.dias?.[day - 1];
    if (val !== null && val !== undefined) {
      return val;
    }
    // Se for Dia 14 e não tiver na DIF Mensal, busca em rawDia ou data.dia
    if (day === 14) {
      const raw = rawDiaMap.get(code);
      if (raw !== undefined && raw !== null) return raw;
      const diaEntry = data.dia.find((x) => x[0] === code);
      if (diaEntry && (diaEntry[2] !== 0 || diaEntry[1] !== 0)) {
        return diaEntry[2] || diaEntry[1];
      }
    }
    return 0;
  };

  // Função para analisar um item (falta ou sobra) comparando hoje/dia selecionado contra o dia anterior
  const analyzeRow = (code: number, isFalta: boolean, currentQty: number): ItemAnalysis => {
    let prevDiff = 0;
    if (selectedDay === null) {
      const prevEntry = diaMap[code];
      prevDiff = prevEntry ? prevEntry.eq : 0;
    } else {
      if (selectedDay > 1) {
        prevDiff = getProductDayDiff(selectedDay - 1, code);
      } else {
        prevDiff = menMap.get(code)?.fechamento ?? 0;
      }
    }

    // Quantidade de falta ou sobra no dia anterior
    const ontem = isFalta
      ? Math.abs(prevDiff < 0 ? prevDiff : 0)
      : Math.max(0, prevDiff);

    // Quantidade atual
    const hoje = Math.round(currentQty);

    // Divergência em caixas entre hoje e o dia anterior
    const diff = Math.abs(hoje - ontem);

    if (diff < 2) {
      return {
        status: 'verde',
        diff,
        hoje,
        ontem,
        label: 'Permaneceu Igual',
        bg: '#C6EFCE',
        color: '#006100',
      };
    } else if (diff >= 2 && diff <= 3) {
      return {
        status: 'laranja',
        diff,
        hoje,
        ontem,
        label: 'Divergência de 2 a 3 cx',
        bg: '#FFEB9C',
        color: '#9C6500',
      };
    } else {
      return {
        status: 'vermelho',
        diff,
        hoje,
        ontem,
        label: 'Divergência ≥ 4 cx',
        bg: '#FFC7CE',
        color: '#9C0006',
      };
    }
  };

  const { f, s, tf, ts, sd, cf, cs } = useMemo(() => {
    const desativadosSet = new Set(data.desativados || []);
    const activeProducts = effectiveCalculated.filter((p) => !desativadosSet.has(p.c) && !p.desativado);

    if (selectedDay === null) {
      // MODO CONCILIAÇÃO ATUAL (AO VIVO)
      const sv0 = (r: CalculatedProduct) => (data.xs.includes(r.c) ? 0 : r.S);

      // FALTAS: apenas produtos com divergência real de falta em caixas (R < 0)
      const faltas = activeProducts.filter((r) => r.R < 0);
      faltas.sort((a, b) => a.S - b.S); // Maior perda financeira (mais negativo) primeiro

      // SOBRAS: apenas produtos com divergência real de sobra em caixas (R > 0)
      const sobras = activeProducts.filter((r) => r.R > 0 && sv0(r) >= 0);
      sobras.sort((a, b) => sv0(b) - sv0(a)); // Maior sobra financeira primeiro

      const totalF = sum(faltas, (r) => -r.S);
      const totalS = sum(sobras, sv0);

      // Ranking de Faltas: apenas itens com falta real
      const fRows = faltas.map((r, i) => {
        const qtde = Math.abs(r.R);
        const valor = -r.S;
        const analysis = analyzeRow(r.c, true, qtde);
        return {
          rank: i + 1,
          c: r.c,
          d: r.d,
          qtde,
          valor,
          peso: totalF > 0 ? valor / totalF : 0,
          analysis,
        };
      });

      // Ranking de Sobras: apenas itens com sobra real
      const sRows = sobras.map((r, i) => {
        const valS = sv0(r);
        const qtde = Math.abs(r.R);
        const valor = valS;
        const analysis = analyzeRow(r.c, false, qtde);
        return {
          rank: i + 1,
          c: r.c,
          d: r.d,
          qtde,
          valor,
          peso: totalS > 0 ? valor / totalS : 0,
          analysis,
        };
      });

      const colorScaleF = createColorScale(fRows.map((r) => r.peso));
      const colorScaleS = createColorScale(sRows.map((r) => r.peso));

      return {
        f: fRows,
        s: sRows,
        tf: totalF,
        ts: totalS,
        sd: totalS - totalF,
        cf: colorScaleF,
        cs: colorScaleS,
      };
    }

    // =======================================================================
    // MODO HISTÓRICO: CALCULA DASHBOARD DO DIA SELECIONADO (EX: DIA 14)
    // =======================================================================
    const allItems = activeProducts.map((r) => {
      const diff = getProductDayDiff(selectedDay, r.c);
      const isFalta = diff < 0;
      const isSobra = diff > 0;
      const qtde = Math.abs(diff);
      const valorUnit = r.U || 0;
      const valorFalta = isFalta ? qtde * valorUnit : 0;
      const valorSobra = isSobra ? (data.xs.includes(r.c) ? 0 : qtde * valorUnit) : 0;

      return {
        c: r.c,
        d: r.d,
        diff,
        isFalta,
        isSobra,
        qtde,
        valorFalta,
        valorSobra,
        r,
      };
    });

    // Faltas do dia selecionado: apenas com falta real (qtde > 0 e diff < 0), ordenadas por valor decrescente
    const faltasItems = allItems.filter((item) => item.isFalta && item.qtde > 0);
    faltasItems.sort((a, b) => b.valorFalta - a.valorFalta);

    // Sobras do dia selecionado: apenas com sobra real (qtde > 0 e diff > 0), ordenadas por valor decrescente
    const sobrasItems = allItems.filter((item) => item.isSobra && item.qtde > 0);
    sobrasItems.sort((a, b) => b.valorSobra - a.valorSobra);

    const totalF = sum(faltasItems, (item) => item.valorFalta);
    const totalS = sum(sobrasItems, (item) => item.valorSobra);

    const fRows = faltasItems.map((item, i) => {
      const analysis = analyzeRow(item.c, true, item.qtde);
      return {
        rank: i + 1,
        c: item.c,
        d: item.d,
        qtde: item.qtde,
        valor: item.valorFalta,
        peso: totalF > 0 ? item.valorFalta / totalF : 0,
        analysis,
      };
    });

    const sRows = sobrasItems.map((item, i) => {
      const analysis = analyzeRow(item.c, false, item.qtde);
      return {
        rank: i + 1,
        c: item.c,
        d: item.d,
        qtde: item.qtde,
        valor: item.valorSobra,
        peso: totalS > 0 ? item.valorSobra / totalS : 0,
        analysis,
      };
    });

    const colorScaleF = createColorScale(fRows.map((r) => r.peso));
    const colorScaleS = createColorScale(sRows.map((r) => r.peso));

    return {
      f: fRows,
      s: sRows,
      tf: totalF,
      ts: totalS,
      sd: totalS - totalF,
      cf: colorScaleF,
      cs: colorScaleS,
    };
  }, [effectiveCalculated, data.xs, diaMap, selectedDay, menMap, rawDiaMap, selectedSnapshot]);

  // Contagem para exibição nos botões de filtro sobre TODOS os itens
  const counts = useMemo(() => {
    let verde = 0;
    let laranja = 0;
    let vermelho = 0;

    f.forEach((item) => {
      if (item.analysis?.status === 'verde') verde++;
      if (item.analysis?.status === 'laranja') laranja++;
      if (item.analysis?.status === 'vermelho') vermelho++;
    });

    s.forEach((item) => {
      if (item.analysis?.status === 'verde') verde++;
      if (item.analysis?.status === 'laranja') laranja++;
      if (item.analysis?.status === 'vermelho') vermelho++;
    });

    return { verde, laranja, vermelho };
  }, [f, s]);

  // Mapeamento dos produtos cuja recontagem bateu na rotina 02.11.01 (multi-rodadas)
  const matched021101Map = useMemo(() => {
    const counts = data.contagem021101?.counts || [];
    if (counts.length < 2) return new Map<number, MatchedContagemInfo>();
    return getMatchedProductsFrom021101(counts);
  }, [data.contagem021101]);

  // Contagem de itens divergentes no dashboard atual cuja recontagem bateu
  const matchedInDashboardCount = useMemo(() => {
    let count = 0;
    f.forEach(item => {
      if (matched021101Map.has(item.c)) count++;
    });
    s.forEach(item => {
      if (matched021101Map.has(item.c)) count++;
    });
    return count;
  }, [f, s, matched021101Map]);

  // Informações do mês e dias para o Calendário de Consulta Histórica
  const { firstDayOfMonth, totalDaysInMonth, monthName, todayDay } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return {
      firstDayOfMonth: new Date(year, month, 1).getDay(),
      totalDaysInMonth: new Date(year, month + 1, 0).getDate(),
      monthName: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      todayDay: now.getDate(),
    };
  }, []);

  const maxRows = Math.max(f.length, s.length);

  // Linhas visíveis conforme o filtro selecionado (aplicado a toda a lista)
  const visibleIndices = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < maxRows; i++) {
      const rf = f[i];
      const rs = s[i];

      if (statusFilter === 'all') {
        list.push(i);
      } else if (statusFilter === 'recontagem_match') {
        const matchF = rf && matched021101Map.has(rf.c);
        const matchS = rs && matched021101Map.has(rs.c);
        if (matchF || matchS) {
          list.push(i);
        }
      } else {
        const matchF = rf?.analysis?.status === statusFilter;
        const matchS = rs?.analysis?.status === statusFilter;
        if (matchF || matchS) {
          list.push(i);
        }
      }
    }
    return list;
  }, [maxRows, f, s, statusFilter, matched021101Map]);

  // Função para salvar o pop-up do produto na aba de POP-UPS SALVOS por duplo clique na QTDE
  const handleDoubleClickQuantity = (
    r: {
      c: number;
      d: string;
      qtde: number;
      valor: number;
      peso: number;
      analysis?: ItemAnalysis;
    },
    isFalta: boolean
  ) => {
    if (!onSavePopup) return;
    const analysis = r.analysis || analyzeRow(r.c, isFalta, r.qtde);
    const last5 = getProductLast5Days(r.c, isFalta, r.qtde);
    const matched = matched021101Map.get(r.c);

    // Preço da caixa na Tabela 7 (U)
    const prod = effectiveCalculated.find((p) => p.c === r.c);
    const resEntry = data.res.find((x) => x[0] === r.c);
    const unitPrice =
      prod?.U ||
      (resEntry ? Number(resEntry[5]) : 0) ||
      (r.qtde > 0 ? Math.abs(r.valor) / r.qtde : 0);

    const variacaoCx = analysis.hoje - analysis.ontem;
    const impactoVariacao = isFalta
      ? -(variacaoCx * unitPrice)
      : variacaoCx * unitPrice;

    const item: SavedPopupItem = {
      id: `popup_${r.c}_${Date.now()}`,
      code: r.c,
      desc: r.d,
      isFalta,
      qtde: r.qtde,
      valor: r.valor,
      peso: r.peso,
      unitPrice,
      variacaoCx,
      impactoVariacao,
      savedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      analysis: {
        status: analysis.status,
        diff: analysis.diff,
        hoje: analysis.hoje,
        ontem: analysis.ontem,
        label: analysis.label,
        bg: analysis.bg,
        color: analysis.color,
      },
      last5Days: last5,
      matched021101: matched
        ? {
            statusText: matched.statusText,
            confirmedQty: matched.confirmedQty,
          }
        : null,
    };

    onSavePopup(item);
  };

  // Renderizador de Tabela Individual para Modos Empilhado / Foco
  const renderSingleRankingTable = (isFalta: boolean) => {
    const items = isFalta ? f : s;
    const title = isFalta ? 'RANKING DE FALTAS' : 'RANKING DE SOBRAS';
    const bgHeader = isFalta ? '#C00000' : '#2B579A';
    const colorScale = isFalta ? cf : cs;

    const filtered = items.filter((item) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'recontagem_match') return matched021101Map.has(item.c);
      return item.analysis?.status === statusFilter;
    });

    return (
      <div style={{ width: '100%', marginBottom: '14px' }}>
        <table id="table-b" style={{ width: '100%', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th colSpan={6} style={{ background: bgHeader, color: '#fff', fontSize: '12px', padding: '5px' }}>
                {title} ({filtered.length} itens)
              </th>
            </tr>
            <tr>
              <th style={{ width: '36px' }}>#</th>
              <th style={{ width: '56px' }}>COD</th>
              <th>DESCRIÇÃO</th>
              <th style={{ width: '70px' }}>QTDE</th>
              <th style={{ width: '110px' }}>VALOR R$</th>
              <th style={{ width: '60px' }}>PESO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                  Nenhum item encontrado com o filtro atual.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.c}>
                  <td 
                    className="c"
                    style={r.qtde === 0 ? { color: '#888' } : r.analysis ? { background: r.analysis.bg, color: r.analysis.color, fontWeight: 'bold' } : undefined}
                  >
                    {r.rank}
                  </td>
                  <td 
                    className="c font-mono"
                    style={{ 
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      userSelect: 'none',
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onRecontar && onRecontar(r.c);
                    }}
                    title={
                      matched021101Map.has(r.c)
                        ? `RECONTAGEM 02.11.01 CONFIRMADA:\n• ${matched021101Map.get(r.c)?.statusText}\n• A contagem física coincidiu e a diferença fiscal foi confirmada!\n(Dê duplo clique para abrir recontagem)`
                        : "Dê DUPLO CLIQUE neste código para abrir a Recontagem de Itens"
                    }
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <span>{r.c}</span>
                      {matched021101Map.has(r.c) && (
                        <span
                          className=""
                          style={{
                            padding: '1px 4px',
                            borderRadius: '3px',
                            background: '#059669',
                            color: '#ffffff',
                            fontSize: '8px',
                            fontWeight: '900',
                            boxShadow: 'none',
                            letterSpacing: '0.2px',
                          }}
                        >
                          CONFIRMADO
                        </span>
                      )}
                    </div>
                  </td>
                  <td title={r.d}>{r.d}</td>
                  <td 
                    className="c font-mono"
                    title="Dê DUPLO CLIQUE para salvar este pop-up na aba POP-UPS SALVOS"
                    style={r.qtde === 0 ? { color: '#888', background: 'transparent' } : r.analysis ? { background: r.analysis.bg, color: r.analysis.color, fontWeight: 'bold', cursor: 'pointer' } : undefined}
                    onMouseEnter={(e) => handleQuantityMouseEnter(e, r, isFalta)}
                    onMouseLeave={handleQuantityMouseLeave}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDoubleClickQuantity(r, isFalta);
                    }}
                  >
                    {N(r.qtde)}
                  </td>
                  <td>
                    <RenderMoney value={r.valor} />
                  </td>
                  <td 
                    className="p"
                    style={r.analysis ? { background: r.analysis.bg, color: r.analysis.color, fontWeight: 'bold' } : { background: colorScale(r.peso) }}
                  >
                    {Math.round(r.peso * 100)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section>
      {/* BARRA DE FILTRO E LEGENDA TOTALMENTE RESPONSIVA */}
      <div 
        style={{ 
          margin: '8px 16px 0 16px', 
          padding: '6px 12px', 
          background: '#fff', 
          border: '1px solid #ddd', 
          borderLeft: '4px solid #FFC000',
          borderRadius: '5px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>
            STATUS:
          </span>

          {/* Botão: Todos */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              borderRadius: '10px',
              border: statusFilter === 'all' ? '1.5px solid #000' : '1px solid #ccc',
              background: statusFilter === 'all' ? '#000' : '#f5f5f5',
              color: statusFilter === 'all' ? '#fff' : '#444',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Todos ({maxRows})
          </button>

          {/* Botão: Verdes */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'verde' ? 'all' : 'verde')}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              borderRadius: '10px',
              border: statusFilter === 'verde' ? '2px solid #006100' : '1px solid #70AD47',
              background: '#C6EFCE',
              color: '#006100',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: statusFilter === 'verde' ? '0 0 0 2px rgba(0,97,0,0.25)' : 'none',
            }}
            title="VERDE: A sobra ou falta permaneceu IGUAL ao dia anterior (ou variação mínima < 2 cx)"
          >
            <span>🟢</span>
            <span>Iguais ({counts.verde})</span>
          </button>

          {/* Botão: Laranjas */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'laranja' ? 'all' : 'laranja')}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              borderRadius: '10px',
              border: statusFilter === 'laranja' ? '2px solid #9C6500' : '1px solid #D97706',
              background: '#FFEB9C',
              color: '#9C6500',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: statusFilter === 'laranja' ? '0 0 0 2px rgba(156,101,0,0.25)' : 'none',
            }}
            title="LARANJA: A sobra ou falta teve DIVERGÊNCIA DE 2 A 3 CAIXAS vs dia anterior"
          >
            <span>🟠</span>
            <span>Dif. 2 a 3 cx ({counts.laranja})</span>
          </button>

          {/* Botão: Vermelhos */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'vermelho' ? 'all' : 'vermelho')}
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              borderRadius: '10px',
              border: statusFilter === 'vermelho' ? '2px solid #9C0006' : '1px solid #C00000',
              background: '#FFC7CE',
              color: '#9C0006',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: statusFilter === 'vermelho' ? '0 0 0 2px rgba(156,0,6,0.25)' : 'none',
            }}
            title="VERMELHO: A sobra ou falta teve DIVERGÊNCIA DE 4 OU MAIS CAIXAS vs dia anterior"
          >
            <span>🔴</span>
            <span>Dif. ≥ 4 cx ({counts.vermelho})</span>
          </button>

          {/* Botão: Recontagem Confirmada (02.11.01) */}
          {matched021101Map.size > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'recontagem_match' ? 'all' : 'recontagem_match')}
              
              style={{
                padding: '3px 9px',
                fontSize: '10.5px',
                borderRadius: '10px',
                border: statusFilter === 'recontagem_match' ? '2px solid #047857' : '1.5px solid #10B981',
                background: statusFilter === 'recontagem_match' ? '#059669' : '#D1FAE5',
                color: statusFilter === 'recontagem_match' ? '#ffffff' : '#065F46',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: statusFilter === 'recontagem_match' ? '0 0 0 2px rgba(5,150,105,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
              }}
              title="Exibir apenas produtos cuja recontagem bateu com a base (diferença permaneceu confirmada)"
            >
              
              <span>Recontagem Confirmada ({matchedInDashboardCount})</span>
            </button>
          )}
        </div>

        {/* CONTROLES DE VISUALIZAÇÃO E AUDITORIA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Seletor de Modo de Visualização */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#EAEAEA', padding: '2px', borderRadius: '4px' }}>
            <button
              type="button"
              onClick={() => setViewMode('side_by_side')}
              style={{
                padding: '2px 7px',
                fontSize: '10px',
                borderRadius: '3px',
                border: 'none',
                background: viewMode === 'side_by_side' ? '#fff' : 'transparent',
                color: viewMode === 'side_by_side' ? '#000' : '#666',
                fontWeight: viewMode === 'side_by_side' ? 'bold' : 'normal',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Ambas as tabelas lado a lado (ajustadas sem cortar colunas)"
            >
              <Columns size={11} />
              <span>Lado a Lado</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('stacked')}
              style={{
                padding: '2px 7px',
                fontSize: '10px',
                borderRadius: '3px',
                border: 'none',
                background: viewMode === 'stacked' ? '#fff' : 'transparent',
                color: viewMode === 'stacked' ? '#000' : '#666',
                fontWeight: viewMode === 'stacked' ? 'bold' : 'normal',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Tabelas empilhadas (100% largura cada)"
            >
              <Rows size={11} />
              <span>Empilhado</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('faltas_only')}
              style={{
                padding: '2px 7px',
                fontSize: '10px',
                borderRadius: '3px',
                border: 'none',
                background: viewMode === 'faltas_only' ? '#C00000' : 'transparent',
                color: viewMode === 'faltas_only' ? '#fff' : '#666',
                fontWeight: viewMode === 'faltas_only' ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
              title="Apenas Ranking de Faltas"
            >
              Só Faltas
            </button>

            <button
              type="button"
              onClick={() => setViewMode('sobras_only')}
              style={{
                padding: '2px 7px',
                fontSize: '10px',
                borderRadius: '3px',
                border: 'none',
                background: viewMode === 'sobras_only' ? '#2B579A' : 'transparent',
                color: viewMode === 'sobras_only' ? '#fff' : '#666',
                fontWeight: viewMode === 'sobras_only' ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
              title="Apenas Ranking de Sobras"
            >
              Só Sobras
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE FECHAMENTO HISTÓRICO SALVO (SNAPSHOT 02.05.02) */}
      {selectedSnapshot !== null && (
        <div 
          style={{ 
            margin: '6px 16px 0 16px', 
            padding: '8px 14px', 
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', 
            color: '#fff', 
            border: '1.5px solid #34D399', 
            borderRadius: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '8px', 
            boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#FFC000', color: '#000', borderRadius: '5px', padding: '4px 8px', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={15} />
              <span>FECHAMENTO SALVO</span>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>CONSULTANDO DASHBOARD DO DIA {selectedSnapshot.date.split('-').reverse().join('/')}</span>
                <span style={{ background: '#059669', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                  {selectedSnapshot.label}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#A7F3D0' }}>
                Snapshot gravado às {new Date(selectedSnapshot.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • 02.05.02 com {selectedSnapshot.ec?.r?.length || 0} produtos cadastrados.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onDownloadSnapshot020502 && (
              <button
                type="button"
                onClick={() => onDownloadSnapshot020502(selectedSnapshot)}
                style={{
                  background: '#fff',
                  color: '#065F46',
                  border: 'none',
                  fontWeight: 'bold',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Baixar a planilha 02.05.02 salva deste fechamento"
              >
                <Download size={13} />
                <span>Baixar 02.05.02 (CSV)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedSnapshot(null)}
              style={{
                background: '#FFC000',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              <span>✕</span>
              <span>Voltar para Conciliação Atual (Ao Vivo)</span>
            </button>
          </div>
        </div>
      )}

      {/* BANNER DE CONSULTA HISTÓRICA DO DIA */}
      {selectedDay !== null && (
        <div 
          style={{ 
            margin: '6px 16px 0 16px', 
            padding: '8px 14px', 
            background: 'linear-gradient(135deg, #1e3f70 0%, #152847 100%)', 
            color: '#fff', 
            border: '1.5px solid #5B9BD5', 
            borderRadius: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '8px', 
            boxShadow: '0 2px 6px rgba(43, 87, 154, 0.25)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#FFC000', color: '#000', borderRadius: '5px', padding: '4px 8px', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={15} />
              <span>DIA {selectedDay}</span>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>CONSULTANDO DASHBOARD HISTÓRICO DO DIA {selectedDay} DE OUTUBRO</span>
                {selectedDay === 14 && (
                  <span style={{ background: '#F59E0B', color: '#000', fontSize: '9.5px', padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                    ONTEM
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Você está consultando os rankings, divergências e saldos apurados na conciliação salva deste dia.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              style={{
                background: '#FFC000',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              <span>✕</span>
              <span>Voltar para Conciliação Atual (Ao Vivo)</span>
            </button>
          </div>
        </div>
      )}

      {/* Banner de Orientação da Nova Função de Recontagem */}
      <div 
        style={{ 
          margin: '6px 16px 0 16px', 
          padding: '6px 12px', 
          background: '#FFFBEB', 
          border: '1px solid #FDE68A', 
          borderLeft: '4px solid #D97706',
          borderRadius: '5px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '6px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>📋</span>
          <span style={{ fontSize: '11px', color: '#92400E' }}>
            <b>RECONTAGEM DE ITENS:</b> Dê <b>duplo clique</b> no código (<b>COD</b>) de qualquer produto para enviá-lo à aba de <b>Recontagem</b>.
          </span>
        </div>
      </div>

      {/* Banner de Recontagem 02.11.01 Confirmada (Bateu c/ a Base / Recontagens) */}
      {matched021101Map.size > 0 && (
        <div 
          style={{ 
            margin: '6px 16px 0 16px', 
            padding: '7px 12px', 
            background: '#ECFDF5', 
            border: '1.5px solid #10B981', 
            borderLeft: '5px solid #059669',
            borderRadius: '5px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '8px',
            boxShadow: '0 1px 3px rgba(5,150,105,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>RECONTAGEM 02.11.01: {matched021101Map.size} ITEM(NS) BATERAM (DIFERENÇA PERMANECEU CONFIRMADA)</span>
                <span style={{ background: '#059669', color: '#ffffff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: '800' }}>
                  CONFIRMADO
                </span>
              </div>
              <div style={{ fontSize: '10.5px', color: '#047857' }}>
                Os itens cuja recontagem coincidiu com a Base (ou recontagem anterior) estão <b>piscando com selo CONFIRMADO</b> no ranking.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'recontagem_match' ? 'all' : 'recontagem_match')}
            
            style={{
              padding: '3px 8px',
              fontSize: '10.5px',
              borderRadius: '4px',
              border: 'none',
              background: '#059669',
              color: '#ffffff',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{statusFilter === 'recontagem_match' ? '✕ Ver Todos os Itens' : 'Filtrar Itens Confirmados'}</span>
          </button>
        </div>
      )}

      {tf === 0 && ts === 0 && (
        <div 
          style={{ 
            margin: '8px 16px 0 16px', 
            padding: '8px 14px', 
            background: '#E8F5E9', 
            border: '1px solid #A5D6A7', 
            borderRadius: '5px', 
            color: '#1B5E20', 
            fontSize: '12px', 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}
        >
          <CheckCircle2 size={16} color="#2E7D32" />
          <span>Base 100% Conciliada e Zerada: Não há divergência entre a contagem física e o sistema Promax (Faltas R$ 0,00 | Sobras R$ 0,00 | Saldo R$ 0,00).</span>
        </div>
      )}

      <div className="wrap" style={{ paddingTop: '8px' }}>
        <div className="sc" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {viewMode === 'stacked' ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {renderSingleRankingTable(true)}
              {renderSingleRankingTable(false)}
            </div>
          ) : viewMode === 'faltas_only' ? (
            renderSingleRankingTable(true)
          ) : viewMode === 'sobras_only' ? (
            renderSingleRankingTable(false)
          ) : (
            /* TABELA LADO A LADO CALIBRADA: CABE 100% EM QUALQUER TELA SEM CORTAR */
            <table id="table-b" style={{ width: 'max-content', minWidth: '100%' }}>
              <colgroup>
                {/* Lado Esquerdo: Faltas (Larguras otimizadas) */}
                <col width="26" />
                <col width="44" />
                <col width="165" />
                <col width="52" />
                <col width="86" />
                <col width="44" />

                {/* Separador */}
                <col width="6" />

                {/* Lado Direito: Sobras (Larguras otimizadas) */}
                <col width="26" />
                <col width="44" />
                <col width="165" />
                <col width="52" />
                <col width="86" />
                <col width="44" />
              </colgroup>
              <thead>
                <tr>
                  <th className="tt" colSpan={6}>
                    RANKING DE FALTAS
                  </th>
                  <th className="sp"></th>
                  <th className="tt" colSpan={6}>
                    RANKING DE SOBRAS
                  </th>
                </tr>
                <tr>
                  <th style={{ width: '26px' }}>#</th>
                  <th style={{ width: '44px' }}>COD</th>
                  <th style={{ width: '165px' }}>DESCRIÇÃO</th>
                  <th style={{ width: '52px' }}>QTDE</th>
                  <th style={{ width: '86px' }}>VALOR R$</th>
                  <th style={{ width: '44px' }}>PESO</th>
                  <th className="sp" style={{ width: '6px' }}></th>
                  <th style={{ width: '26px' }}>#</th>
                  <th style={{ width: '44px' }}>COD</th>
                  <th style={{ width: '165px' }}>DESCRIÇÃO</th>
                  <th style={{ width: '52px' }}>QTDE</th>
                  <th style={{ width: '86px' }}>VALOR R$</th>
                  <th style={{ width: '44px' }}>PESO</th>
                </tr>
              </thead>
              <tbody>
                {visibleIndices.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                      Nenhum item encontrado com o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  visibleIndices.map((i) => {
                    const rf = f[i];
                    const rs = s[i];

                    return (
                      <tr key={i}>
                        {/* COLUNAS DE FALTAS */}
                        {rf ? (
                          <>
                            <td 
                              className="c" 
                              style={
                                rf.qtde === 0
                                  ? { color: '#888' }
                                  : rf.analysis 
                                  ? { 
                                      background: rf.analysis.bg, 
                                      color: rf.analysis.color, 
                                      fontWeight: 'bold',
                                      cursor: rf.analysis.status !== 'verde' ? 'pointer' : 'default',
                                    } 
                                  : undefined
                              }
                              onClick={() => {
                                if (rf.qtde > 0 && rf.analysis && rf.analysis.status !== 'verde' && onOpenAnalise) {
                                  onOpenAnalise(rf.analysis.status, rf.c);
                                }
                              }}
                              title={
                                rf.analysis 
                                  ? `Análise Automática vs Dia Anterior:\n• Hoje: ${rf.analysis.hoje} cx\n• Ontem: ${rf.analysis.ontem} cx\n• Divergência: ${rf.analysis.diff} cx (${rf.analysis.label})${rf.analysis.status !== 'verde' ? '\n• Clique para auditar minuciosamente de onde veio cada real de divergência!' : ''}` 
                                  : undefined
                              }
                            >
                              {rf.rank}
                            </td>
                            <td 
                              className="c font-mono"
                              style={{ 
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                userSelect: 'none',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onRecontar && onRecontar(rf.c);
                              }}
                              title={
                                matched021101Map.has(rf.c)
                                  ? `RECONTAGEM 02.11.01 CONFIRMADA:\n• ${matched021101Map.get(rf.c)?.statusText}\n• A contagem física coincidiu e a falta foi confirmada!\n(Dê duplo clique para abrir recontagem)`
                                  : "Dê DUPLO CLIQUE neste código para abrir a Recontagem de Itens"
                              }
                            >
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2.5px' }}>
                                <span>{rf.c}</span>
                                {matched021101Map.has(rf.c) && (
                                  <span
                                    className=""
                                    style={{
                                      padding: '1px 3.5px',
                                      borderRadius: '3px',
                                      background: '#059669',
                                      color: '#ffffff',
                                      fontSize: '7.5px',
                                      fontWeight: '900',
                                      boxShadow: 'none',
                                      letterSpacing: '0.2px',
                                    }}
                                  >
                                    CONFIRMADO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td 
                              title={`${rf.d}\nClique para opções do produto (Recontar / Desativar da plataforma por inteiro)`} 
                              style={{ 
                                maxWidth: '165px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                              }}
                              onClick={() => setSelectedItemForAction({
                                code: rf.c,
                                desc: rf.d,
                                qtde: rf.qtde,
                                valor: rf.valor,
                                isFalta: true,
                              })}
                            >
                              <span style={{ textDecoration: 'underline dotted #94a3b8', textUnderlineOffset: '2px' }}>
                                {rf.d}
                              </span>
                            </td>
                            <td 
                              className="c font-mono"
                              title="Dê DUPLO CLIQUE para salvar este pop-up na aba POP-UPS SALVOS"
                              style={
                                rf.qtde === 0
                                  ? { color: '#888', background: 'transparent' }
                                  : rf.analysis 
                                  ? { 
                                      background: rf.analysis.bg, 
                                      color: rf.analysis.color, 
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                    } 
                                  : undefined
                              }
                              onClick={() => {
                                if (rf.analysis && rf.analysis.status !== 'verde' && onOpenAnalise) {
                                  onOpenAnalise(rf.analysis.status, rf.c);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleDoubleClickQuantity(rf, true);
                              }}
                              onMouseEnter={(e) => handleQuantityMouseEnter(e, rf, true)}
                              onMouseLeave={handleQuantityMouseLeave}
                            >
                              {N(rf.qtde)}
                            </td>
                            <td style={{ width: '86px', padding: '1px 3px' }}>
                              <RenderMoney value={rf.valor} />
                            </td>
                            <td 
                              className="p" 
                              style={
                                rf.analysis 
                                  ? { background: rf.analysis.bg, color: rf.analysis.color, fontWeight: 'bold' } 
                                  : { background: cf(rf.peso) }
                              }
                              title={
                                rf.analysis 
                                  ? `Análise vs Ontem: ${rf.analysis.label} (Divergência: ${rf.analysis.diff} cx)` 
                                  : undefined
                              }
                            >
                              {Math.round(rf.peso * 100)}%
                            </td>
                          </>
                        ) : (
                          <>
                            <td></td><td></td><td></td><td></td><td></td><td></td>
                          </>
                        )}

                        <td className="sp"></td>

                        {/* COLUNAS DE SOBRAS */}
                        {rs ? (
                          <>
                            <td 
                              className="c" 
                              style={
                                rs.qtde === 0
                                  ? { color: '#888' }
                                  : rs.analysis 
                                  ? { 
                                      background: rs.analysis.bg, 
                                      color: rs.analysis.color, 
                                      fontWeight: 'bold',
                                      cursor: rs.analysis.status !== 'verde' ? 'pointer' : 'default',
                                    } 
                                  : undefined
                              }
                              onClick={() => {
                                if (rs.qtde > 0 && rs.analysis && rs.analysis.status !== 'verde' && onOpenAnalise) {
                                  onOpenAnalise(rs.analysis.status, rs.c);
                                }
                              }}
                              title={
                                rs.analysis 
                                  ? `Análise Automática vs Dia Anterior:\n• Hoje: ${rs.analysis.hoje} cx\n• Ontem: ${rs.analysis.ontem} cx\n• Divergência: ${rs.analysis.diff} cx (${rs.analysis.label})${rs.analysis.status !== 'verde' ? '\n• Clique para auditar minuciosamente de onde veio cada real de divergência!' : ''}` 
                                  : undefined
                              }
                            >
                              {rs.rank}
                            </td>
                            <td 
                              className="c font-mono"
                              style={{ 
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                userSelect: 'none',
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onRecontar && onRecontar(rs.c);
                              }}
                              title={
                                matched021101Map.has(rs.c)
                                  ? `RECONTAGEM 02.11.01 CONFIRMADA:\n• ${matched021101Map.get(rs.c)?.statusText}\n• A contagem física coincidiu e a sobra foi confirmada!\n(Dê duplo clique para abrir recontagem)`
                                  : "Dê DUPLO CLIQUE neste código para abrir a Recontagem de Itens"
                              }
                            >
                              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2.5px' }}>
                                <span>{rs.c}</span>
                                {matched021101Map.has(rs.c) && (
                                  <span
                                    className=""
                                    style={{
                                      padding: '1px 3.5px',
                                      borderRadius: '3px',
                                      background: '#059669',
                                      color: '#ffffff',
                                      fontSize: '7.5px',
                                      fontWeight: '900',
                                      boxShadow: 'none',
                                      letterSpacing: '0.2px',
                                    }}
                                  >
                                    CONFIRMADO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td 
                              title={`${rs.d}\nClique para opções do produto (Recontar / Desativar da plataforma por inteiro)`} 
                              style={{ 
                                maxWidth: '165px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                              }}
                              onClick={() => setSelectedItemForAction({
                                code: rs.c,
                                desc: rs.d,
                                qtde: rs.qtde,
                                valor: rs.valor,
                                isFalta: false,
                              })}
                            >
                              <span style={{ textDecoration: 'underline dotted #94a3b8', textUnderlineOffset: '2px' }}>
                                {rs.d}
                              </span>
                            </td>
                            <td 
                              className="c font-mono"
                              title="Dê DUPLO CLIQUE para salvar este pop-up na aba POP-UPS SALVOS"
                              style={
                                rs.qtde === 0
                                  ? { color: '#888', background: 'transparent' }
                                  : rs.analysis 
                                  ? { 
                                      background: rs.analysis.bg, 
                                      color: rs.analysis.color, 
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                    } 
                                  : undefined
                              }
                              onClick={() => {
                                if (rs.analysis && rs.analysis.status !== 'verde' && onOpenAnalise) {
                                  onOpenAnalise(rs.analysis.status, rs.c);
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleDoubleClickQuantity(rs, false);
                              }}
                              onMouseEnter={(e) => handleQuantityMouseEnter(e, rs, false)}
                              onMouseLeave={handleQuantityMouseLeave}
                            >
                              {N(rs.qtde)}
                            </td>
                            <td style={{ width: '86px', padding: '1px 3px' }}>
                              <RenderMoney value={rs.valor} />
                            </td>
                            <td 
                              className="p" 
                              style={
                                rs.analysis 
                                  ? { background: rs.analysis.bg, color: rs.analysis.color, fontWeight: 'bold' } 
                                  : { background: cs(rs.peso) }
                              }
                              title={
                                rs.analysis 
                                  ? `Análise vs Ontem: ${rs.analysis.label} (Divergência: ${rs.analysis.diff} cx)` 
                                  : undefined
                              }
                            >
                              {Math.round(rs.peso * 100)}%
                            </td>
                          </>
                        ) : (
                          <>
                            <td></td><td></td><td></td><td></td><td></td><td></td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* PAINEL LATERAL DE CONTROLES */}
        <div className="side">
          {/* Seção de Desfazer e Refazer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            <button
              type="button"
              className="btn"
              disabled={!canUndo}
              onClick={onUndo}
              style={{
                background: canUndo ? '#fff' : '#f5f5f5',
                color: canUndo ? '#C00000' : '#aaa',
                border: canUndo ? '1.5px solid #C00000' : '1px solid #ddd',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 10px',
                cursor: canUndo ? 'pointer' : 'not-allowed',
                borderRadius: '5px',
                fontSize: '11px',
                boxShadow: canUndo ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
              }}
              title={
                canUndo
                  ? `Desfazer última alteração: ${lastActionDescription || ''} (Ctrl+Z)`
                  : 'Nenhuma alteração recente para desfazer'
              }
            >
              <span style={{ fontSize: '12px' }}>↩️</span>
              <span>DESFAZER {canUndo ? '(Ctrl+Z)' : ''}</span>
            </button>

            {canRedo && (
              <button
                type="button"
                className="btn"
                onClick={onRedo}
                style={{
                  background: '#fff',
                  color: '#008000',
                  border: '1.5px solid #008000',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                }}
                title="Refazer a alteração desfeita (Ctrl+Y)"
              >
                <span>↪️</span>
                <span>REFAZER (Ctrl+Y)</span>
              </button>
            )}

            {canUndo && lastActionDescription && (
              <div
                style={{
                  fontSize: '9.5px',
                  color: '#666',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  marginTop: '1px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={lastActionDescription}
              >
                Última: {lastActionDescription}
              </div>
            )}
          </div>

          {onOpenImport020502 && (
            <button
              className="btn"
              style={{
                background: 'linear-gradient(180deg, #FFD34D 0%, #FFB800 100%)',
                color: '#000',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                padding: '7px 12px',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                width: '100%',
              }}
              onClick={handleOpenImportWithReminder}
              title="Importar 02.05.02 (Rotina de devolução 02-01-06)"
            >
              <span>📥</span>
              <span>IMPORTAR 02.05.02</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <button 
              className="btn" 
              onClick={onCongelar}
              style={{ flex: 1, padding: '7px 6px', fontSize: '11px' }}
            >
              CONGELAR
            </button>
            <button 
              className="btn" 
              onClick={onSalvar}
              style={{ 
                flex: 1, 
                padding: '7px 4px', 
                fontSize: '10.5px',
                background: '#2B579A',
                color: '#fff',
                borderColor: '#1e3f70',
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(43, 87, 154, 0.3)',
              }}
              title={`Salvar a diferença calculada da conciliação no Dia ${new Date().getDate()} (Hoje) da DIF Mensal`}
            >
              SALVAR DIF (DIA {new Date().getDate()})
            </button>
          </div>

          <button 
            className="btn" 
            onClick={onLimpar}
            style={{ width: '100%', padding: '6px 10px', fontSize: '11px' }}
          >
            LIMPAR DIF
          </button>

          {/* BOTÃO PRINT DA TELA (TOP 30 FALTAS & TOP 30 SOBRAS) */}
          <button
            type="button"
            className="btn"
            onClick={() => setIsPrintModalOpen(true)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 800,
              background: '#007A4D',
              color: '#ffffff',
              border: '2px solid #005030',
              borderRadius: '8px',
              boxShadow: '0 3px 4px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              cursor: 'pointer',
              letterSpacing: '0.3px',
            }}
            title="Print da Tela: Visualizar, imprimir e baixar imagem JPG com as 30 Faltas e 30 Sobras completas"
          >
            <Camera size={16} color="#ffffff" strokeWidth={2.4} />
            <span>PRINT DA TELA</span>
          </button>

          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <div className="bx" style={{ flex: 1, width: 'auto' }}>
              <div style={{ fontSize: '10px', padding: '3px' }}>FALTAS</div>
              <div style={{ fontSize: '11.5px', padding: '4px' }}>
                <span>{tf < 0 ? '-' : ''}R$</span>
                <span>{N(tf)}</span>
              </div>
            </div>
            <div className="bx" style={{ flex: 1, width: 'auto' }}>
              <div style={{ fontSize: '10px', padding: '3px' }}>SOBRAS</div>
              <div style={{ fontSize: '11.5px', padding: '4px' }}>
                <span>{ts < 0 ? '-' : ''}R$</span>
                <span>{N(ts)}</span>
              </div>
            </div>
          </div>

          <div className="sal" style={{ width: '100%' }}>
            <div style={{ fontSize: '11px', padding: '4px' }}>SALDO FINAL</div>
            <div
              style={{
                background: sd < 0 ? '#FFC7CE' : sd > 0 ? '#C6EFCE' : '#fff',
                color: sd < 0 ? '#9C0006' : sd > 0 ? '#006100' : '#000',
                fontSize: '14px',
                padding: '6px',
              }}
            >
              {Rt(sd)}
            </div>
          </div>

          <span 
            className="rs" 
            onClick={onVoltarOriginal}
            style={{ fontSize: '10px', marginTop: '2px', cursor: 'pointer' }}
          >
            ↺ restaurar base zerada (sem divergências)
          </span>

          {/* Aviso de Itens Desativados da Plataforma */}
          {(data.desativados?.length || 0) > 0 && (
            <div
              style={{
                marginTop: '10px',
                padding: '6px 8px',
                background: '#FEF2F2',
                border: '1px solid #FECDD3',
                borderRadius: '4px',
                fontSize: '9.5px',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Ban size={11} color="#DC2626" />
                <span><b>{data.desativados?.length}</b> item(ns) desativado(s)</span>
              </div>
              {onNavigateToProdutos && (
                <button
                  type="button"
                  onClick={() => onNavigateToProdutos()}
                  style={{
                    background: '#DC2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '2px 6px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Ver Catálogo
                </button>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Modal de Ações Rápidas do Item no Dashboard */}
      {selectedItemForAction && (
        <div className="modal-overlay" onClick={() => setSelectedItemForAction(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '480px', width: '92%', padding: 0, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: '#0F172A', color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ background: '#FFC000', color: '#000', fontSize: '10.5px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>
                  COD #{selectedItemForAction.code}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: '#fff', lineHeight: 1.3 }}>
                  {selectedItemForAction.desc}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForAction(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Resumo da divergência no Dashboard */}
              <div
                style={{
                  background: selectedItemForAction.isFalta ? '#FEE2E2' : '#FEF3C7',
                  border: `1px solid ${selectedItemForAction.isFalta ? '#FCA5A5' : '#FDE68A'}`,
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: selectedItemForAction.isFalta ? '#991B1B' : '#92400E' }}>
                    {selectedItemForAction.isFalta ? 'DIVERGÊNCIA EM FALTA' : 'DIVERGÊNCIA EM SOBRA'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: selectedItemForAction.isFalta ? '#991B1B' : '#78350F' }}>
                    {selectedItemForAction.qtde} caixas
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>IMPACTO FINANCEIRO</div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: selectedItemForAction.isFalta ? '#DC2626' : '#D97706' }}>
                    <RenderMoney value={selectedItemForAction.valor} />
                  </div>
                </div>
              </div>

              {/* Botão de Desativar da Plataforma por Inteiro */}
              {onToggleDesativar && (
                <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#9F1239', marginBottom: '4px' }}>
                    DESATIVAR DA PLATAFORMA POR INTEIRO
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#881337', lineHeight: 1.4 }}>
                    O produto será imediatamente zerado e removido das divergências, faltas, sobras e relatórios operacionais de conciliação.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleDesativar(selectedItemForAction.code);
                      setSelectedItemForAction(null);
                    }}
                    style={{
                      width: '100%',
                      background: '#DC2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '9px 12px',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Ban size={14} />
                    <span>DESATIVAR DA PLATAFORMA POR INTEIRO</span>
                  </button>
                </div>
              )}

              {/* Ações adicionais: Recontagem e Catálogo */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {onRecontar && (
                  <button
                    type="button"
                    onClick={() => {
                      onRecontar(selectedItemForAction.code);
                      setSelectedItemForAction(null);
                    }}
                    style={{
                      flex: 1,
                      background: '#D97706',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>📋 Recontar</span>
                  </button>
                )}

                {onNavigateToProdutos && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToProdutos(String(selectedItemForAction.code));
                      setSelectedItemForAction(null);
                    }}
                    style={{
                      flex: 1,
                      background: '#0F172A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <Package size={13} />
                    <span>Ver no Catálogo</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedItemForAction(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    padding: '8px 14px',
                    fontSize: '11.5px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Salvar a 02.05.02 / Fechamento do Dia */}
      <SaveDaily020502Modal
        isOpen={isSaveModalOpen}
        initialDate={saveModalInitialDate}
        data={data}
        calculated={calculated}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveSnapshot={(snapshot) => {
          onSaveSnapshot?.(snapshot);
        }}
      />

      {/* Modal para Print da Tela (Top 30 Faltas & Top 30 Sobras) */}
      <PrintTop30Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        faltas={f}
        sobras={s}
        totalFaltas={tf}
        totalSobras={ts}
        saldoFinal={sd}
        colorScaleF={cf}
        colorScaleS={cs}
        dateLabel={selectedDay !== null ? `Dia ${selectedDay} de Outubro` : undefined}
      />

      {/* POPUP DE LEMBRETE: ROTINA DE DEVOLUÇÃO 02-01-06 */}
      {showDevolucaoReminder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setShowDevolucaoReminder(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.3), 0 10px 15px -5px rgba(0, 0, 0, 0.2)',
              border: '2px solid #EAB308',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FEF08A 0%, #FDE047 100%)',
                borderBottom: '1px solid #FACC15',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>⚠️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#713F12' }}>
                    Lembrete Importante
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#854D0E' }}>
                    Importação do Relatório 02.05.02
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDevolucaoReminder(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#854D0E',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo */}
            <div style={{ padding: '20px' }}>
              <div
                style={{
                  background: '#FEF9C3',
                  border: '1.5px solid #FACC15',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '22px', lineHeight: 1 }}>📢</span>
                <div style={{ fontSize: '13.5px', color: '#713F12', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                    Executar a rotina de devolução 02-01-06
                  </div>
                  Antes de importar o relatório <b>02.05.02</b>, certifique-se de executar a rotina de devolução <b>02-01-06</b> no Promax para conciliar as devoluções e os estoques corretamente.
                </div>
              </div>

              <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                Deseja prosseguir com a importação agora?
              </p>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                  ℹ️ Este lembrete é exibido apenas na 1ª importação do dia.
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDevolucaoReminder(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      background: '#F1F5F9',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDevolucaoReminder}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '6px',
                      border: '1px solid #D97706',
                      background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                      color: '#ffffff',
                      fontWeight: 'bold',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Prosseguir com a Importação</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP FLUTUANTE EXPANDIDO E INFORMATIVO (COMPARATIVO ONTEM VS HOJE) */}
      {hoveredItem && (
        <div
          style={{
            position: 'fixed',
            left: hoveredItem.x + 370 > (typeof window !== 'undefined' ? window.innerWidth : 1200)
              ? Math.max(12, hoveredItem.x - 380)
              : Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - 380, hoveredItem.x + 14),
            top: Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 430, Math.max(16, hoveredItem.y - 35)),
            zIndex: 999999,
            pointerEvents: 'none',
            width: '360px',
            background: '#ffffff',
            border: '2px solid #FFC000',
            borderRadius: '10px',
            boxShadow: '0 14px 30px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.1)',
            padding: '14px 16px',
            color: '#1f2937',
            fontSize: '12px',
            lineHeight: 1.4,
            animation: 'fadeIn 0.12s ease-out',
          }}
        >
          {/* Cabeçalho com Código e Tipo de Divergência */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold', background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#1f2937' }}>
              CÓDIGO #{hoveredItem.code}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 'bold',
                padding: '3px 9px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                background: hoveredItem.isFalta ? '#FEE2E2' : '#DCFCE7',
                color: hoveredItem.isFalta ? '#991B1B' : '#166534',
                border: `1px solid ${hoveredItem.isFalta ? '#FCA5A5' : '#86EFAC'}`,
              }}
            >
              {hoveredItem.isFalta ? '⚠️ Falta no Estoque' : '📦 Sobra no Estoque'}
            </span>
          </div>

          {/* Nome Completo do Produto */}
          <div style={{ fontWeight: 'bold', fontSize: '13.5px', color: '#111827', marginBottom: '10px', lineHeight: '1.35' }}>
            {hoveredItem.desc}
          </div>

          {/* Faixa de Status da Análise */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: '6px',
              marginBottom: '12px',
              background: hoveredItem.analysis.bg,
              color: hoveredItem.analysis.color,
              fontWeight: 'bold',
              fontSize: '11.5px',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>
                {hoveredItem.analysis.status === 'verde' ? '🟢' : hoveredItem.analysis.status === 'laranja' ? '🟡' : '🔴'}
              </span>
              <span>{hoveredItem.analysis.label}</span>
            </div>
            <span style={{ fontSize: '11px', opacity: 0.9 }}>
              {hoveredItem.analysis.diff === 0 ? 'Estável' : `Divergência: ${hoveredItem.analysis.diff} cx`}
            </span>
          </div>

          {/* Alerta de Recontagem Confirmada / Diferença Permaneceu */}
          {matched021101Map.has(hoveredItem.code) && (() => {
            const m = matched021101Map.get(hoveredItem.code)!;
            return (
              <div
                className=""
                style={{
                  background: '#ECFDF5',
                  border: '1.5px solid #10B981',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  marginBottom: '12px',
                  color: '#065F46',
                  fontSize: '11px',
                }}
              >
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>RECONTAGEM 02.11.01 CONFIRMADA:</span>
                </div>
                <div style={{ marginTop: '2px', lineHeight: '1.3' }}>
                  • {m.statusText}
                  <br />
                  • <b>A diferença fiscal PERMANECEU</b> (físico confirmado em {m.confirmedQty} cx).
                </div>
              </div>
            );
          })()}

          {/* Painel Comparativo Principal (Ontem vs Hoje vs Variação) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '8px 6px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Ontem</span>
              <strong style={{ fontSize: '16px', color: '#334155', display: 'block', marginTop: '2px' }}>
                {hoveredItem.analysis.ontem} <small style={{ fontSize: '10px', fontWeight: 'normal' }}>cx</small>
              </strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '7px', padding: '8px 6px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10.5px', color: '#0f172a', fontWeight: 'bold', textTransform: 'uppercase' }}>Hoje</span>
              <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                {hoveredItem.analysis.hoje} <small style={{ fontSize: '10px', fontWeight: 'normal' }}>cx</small>
              </strong>
            </div>

            <div
              style={{
                background: hoveredItem.analysis.diff === 0 ? '#f8fafc' : hoveredItem.analysis.diff <= 2 ? '#fefce8' : '#fef2f2',
                border: `1px solid ${hoveredItem.analysis.diff === 0 ? '#e2e8f0' : hoveredItem.analysis.diff <= 2 ? '#fef08a' : '#fecaca'}`,
                borderRadius: '7px',
                padding: '8px 6px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Variação</span>
              <strong
                style={{
                  fontSize: '16px',
                  display: 'block',
                  marginTop: '2px',
                  color: hoveredItem.analysis.diff === 0 ? '#16a34a' : hoveredItem.analysis.diff <= 2 ? '#b45309' : '#dc2626',
                }}
              >
                {hoveredItem.analysis.hoje > hoveredItem.analysis.ontem ? '▲ +' : hoveredItem.analysis.hoje < hoveredItem.analysis.ontem ? '▼ -' : '='}
                {hoveredItem.analysis.diff} <small style={{ fontSize: '10px', fontWeight: 'normal' }}>cx</small>
              </strong>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '10px',
                  fontWeight: '800',
                  marginTop: '3px',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: hoveredItem.isFalta ? '#fee2e2' : '#dcfce7',
                  color: hoveredItem.isFalta ? '#b91c1c' : '#15803d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                {hoveredItem.isFalta ? 'Faltando' : 'Sobrando'}
              </span>
            </div>
          </div>

          {/* Painel do Impacto Financeiro da Variação (Ontem vs Hoje) com Tabela 7 */}
          <div
            style={{
              background: hoveredItem.impactoVariacao < 0 ? '#fef2f2' : hoveredItem.impactoVariacao > 0 ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${hoveredItem.impactoVariacao < 0 ? '#fecaca' : hoveredItem.impactoVariacao > 0 ? '#a7f3d0' : '#e2e8f0'}`,
              borderRadius: '7px',
              padding: '8px 10px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Impacto da Variação (Ontem → Hoje)
              </span>
              <strong
                style={{
                  fontSize: '14px',
                  display: 'block',
                  color: hoveredItem.impactoVariacao < 0 ? '#dc2626' : hoveredItem.impactoVariacao > 0 ? '#16a34a' : '#475569',
                }}
              >
                {hoveredItem.impactoVariacao < 0 ? '-' : hoveredItem.impactoVariacao > 0 ? '+' : ''}R${' '}
                {Math.abs(hoveredItem.impactoVariacao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '9.5px', color: '#64748b', fontWeight: '600' }}>
                Preço Tab. 7 / Cx:
              </span>
              <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#1e293b' }}>
                R$ {hoveredItem.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* PAINEL: VARIAÇÃO DOS ÚLTIMOS 5 DIAS */}
          {(() => {
            const last5 = getProductLast5Days(hoveredItem.code, hoveredItem.isFalta, hoveredItem.qtde);
            return (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '9px 10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📈 Variação dos Últimos 5 Dias
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '1px 7px',
                      borderRadius: '4px',
                      background: last5.periodDiff === 0 ? '#f1f5f9' : last5.periodDiff > 0 ? '#fee2e2' : '#eff6ff',
                      color: last5.periodDiff === 0 ? '#475569' : last5.periodDiff > 0 ? '#b91c1c' : '#1d4ed8',
                    }}
                  >
                    {last5.periodDiff === 0 ? '= Estável' : last5.periodDiff > 0 ? `▲ +${last5.periodDiff} cx` : `▼ ${last5.periodDiff} cx`}
                  </span>
                </div>

                {/* Grade dos 5 Dias */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '6px' }}>
                  {last5.days.map((item) => (
                    <div
                      key={item.day}
                      style={{
                        background: item.isToday ? '#eff6ff' : '#ffffff',
                        border: `1px solid ${item.isToday ? '#93c5fd' : '#e2e8f0'}`,
                        borderRadius: '5px',
                        padding: '4px 2px',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: '9.5px', color: item.isToday ? '#1d4ed8' : '#64748b', fontWeight: item.isToday ? 'bold' : '500' }}>
                        {item.label}
                      </span>
                      <strong style={{ fontSize: '12px', color: item.isToday ? '#1e3a8a' : '#1f2937', display: 'block', marginTop: '1px' }}>
                        {item.qty} <small style={{ fontSize: '9px', fontWeight: 'normal', color: '#64748b' }}>cx</small>
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Período: Dia {last5.startDay} ao {last5.endDay}</span>
                  <span>Média: <b>{last5.avg} cx/dia</b></span>
                </div>
              </div>
            );
          })()}

          {/* Dados Financeiros e Relevância no Fechamento */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', padding: '9px 12px', marginBottom: '8px', fontSize: '11.5px', color: '#475569' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span>Total Acumulado (Hoje):</span>
              <strong style={{ color: '#0f172a' }}>{hoveredItem.qtde} cx (R$ {Math.abs(hoveredItem.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Peso no Fechamento:</span>
              <strong style={{ color: '#0f172a' }}>{Math.round(hoveredItem.peso * 100)}%</strong>
            </div>
          </div>

          {/* Dica de Ação */}
          <div style={{ fontSize: '10.5px', color: '#64748b', textAlign: 'center', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: '#7C3AED', fontWeight: 'bold' }}>
              📌 Dê DUPLO CLIQUE na quantidade para salvar este pop-up na aba POP-UPS SALVOS
            </span>
            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>
              💡 Dê duplo clique no código para abrir a Recontagem deste produto
            </span>
          </div>
        </div>
      )}

      {/* MODAL PRINT DO TOP 30 FALTAS & SOBRAS */}
      <PrintTop30Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        faltas={f}
        sobras={s}
        totalFaltas={tf}
        totalSobras={ts}
        saldoFinal={sd}
        colorScaleF={cf}
        colorScaleS={cs}
        dateLabel={selectedDay !== null ? `Conciliação Histórica do Dia ${selectedDay}` : `Posição Oficial em ${new Date().toLocaleDateString('pt-BR')}`}
      />
    </section>
  );
};
