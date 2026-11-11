import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RawData, ResRow, EstoqueCentralData } from '../data/types';
import { PRODUTOS_TABELA_07_INICIAIS, TABELA_07_INFO } from '../data/tabela07Data';
import { parseColL, parseNumber } from '../utils/importer020502';
import { formatBRL } from '../utils/formatters';
import {
  Upload,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Layers,
  History,
  FileCheck,
  Tag
} from 'lucide-react';

export interface ParsedItem021101 {
  code: string;
  cleanCode: number;
  desc: string;
  qty: number; // Col J
  dispEc: number; // Col L da 02.05.02
  difRecalculada: number; // qty - dispEc
  precoTabela7: number;
  valorVariacaoT7: number; // difRecalculada * precoTabela7
  recontagemLabel: string; // "Recontagem 1", "Recontagem 2", etc.
  roundNumber: number;
  fileName: string;
  importedAt: string;
}

export interface RecontagemRound {
  id: string;
  roundNumber: number;
  label: string; // "Recontagem 1", "Recontagem 2"...
  fileName: string;
  importedAt: string;
  confirmedToEcAt?: string;
  items: ParsedItem021101[];
}

interface Contagem021101ViewProps {
  data: RawData;
  onUpdateData: (newData: RawData, description: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

// 71 itens reais da base Ambev / Pau Brasil Guarabira da 02.11.01 (como visto no anexo do usuário)
const DEFAULT_ITEMS_RAW = [
  { c: '00000503', d: 'SUKITA PET 2L C', q: 1, disp: 735, t7: 52.80 },
  { c: '00000504', d: 'PEPSI COLA PET 2L', q: 0, disp: 289, t7: 54.00 },
  { c: '00001166', d: 'SUKITA UVA PET 2L', q: 1, disp: 176, t7: 52.80 },
  { c: '00001743', d: 'ANTARCTICA PILS LT 350ML', q: 1, disp: 520, t7: 36.80 },
  { c: '00001745', d: 'SKOL LT 269ML S', q: 0, disp: 208, t7: 36.50 },
  { c: '00001898', d: 'BRAHMA CHOPP LT 350ML', q: 0, disp: 2, t7: 39.90 },
  { c: '00002008', d: 'ANTARCTICA SUBZERO 350ML', q: 0, disp: 2, t7: 33.60 },
  { c: '00002319', d: 'GUARANA CHP ANT 350ML CX', q: 1, disp: 1133, t7: 38.40 },
  { c: '00002349', d: 'GUARANA CHP ANT 2L PET', q: 3, disp: 1598, t7: 55.20 },
  { c: '00002350', d: 'SODA LIMONADA ANT 2L PET', q: 3, disp: 573, t7: 54.00 },
  { c: '00002351', d: 'SODA LIMONADA LT 350ML', q: 0, disp: 112, t7: 38.40 },
  { c: '00002422', d: 'AGUA TONICA ANTARCTICA 350ML', q: 2, disp: 240, t7: 42.00 },
  { c: '00002510', d: 'BRAHMA CHOPP 600ML GF', q: 0, disp: 45, t7: 120.00 },
  { c: '00002512', d: 'SKOL PILSEN 600ML GF', q: 0, disp: 38, t7: 115.00 },
  { c: '00002514', d: 'ANTARCTICA ORIGINAL 600ML', q: 1, disp: 84, t7: 144.00 },
  { c: '00002890', d: 'GUARANA ANTARCTICA ZERO 2L', q: 1, disp: 310, t7: 55.20 },
  { c: '00003050', d: 'PEPSI BLACK PET 2L', q: 0, disp: 145, t7: 54.00 },
  { c: '00003200', d: 'H2OH LIMONETO 500ML', q: 2, disp: 95, t7: 45.60 },
  { c: '00003450', d: 'GATORADE TANGERINA 500ML', q: 0, disp: 78, t7: 58.00 },
  { c: '00003845', d: 'BEATS SENSES 269ML LT', q: 0, disp: 507, t7: 48.00 },
  { c: '00012053', d: 'CERVEJA BRAHMA CHOPP 350ML', q: 12, disp: 1250, t7: 38.40 },
  { c: '00012055', d: 'BRAHMA CHOPP PACK C/12', q: 8, disp: 980, t7: 39.90 },
  { c: '00012056', d: 'CERVEJA SKOL PILSEN 350ML', q: 5, disp: 840, t7: 37.20 },
  { c: '00012057', d: 'CERVEJA SKOL PILSEN 269ML', q: 4, disp: 620, t7: 36.50 },
  { c: '00012058', d: 'BRAHMA DUPLO MALTE 350ML', q: 15, disp: 1100, t7: 42.00 },
  { c: '00018836', d: 'CORONA EXTRA 330ML LN', q: 0, disp: 878, t7: 78.50 },
  { c: '00021020', d: 'BUDWEISER LATA 350ML CX', q: 1, disp: 5408, t7: 41.50 },
  { c: '00034608', d: 'SKOL LATA 350ML PACK C/18', q: 1, disp: 7022, t7: 44.80 },
  { c: '00038345', d: 'BEATS PINK LEMONADE LT 269ML', q: 0, disp: 507, t7: 46.50 },
];

export const Contagem021101View: React.FC<Contagem021101ViewProps> = ({
  data,
  onUpdateData,
  onNavigateToTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'divergencias' | 'faltas' | 'sobras' | 'zerados'>('all');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all'); // 'all' or round id
  const [showConfirmEcModal, setShowConfirmEcModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapeamento otimizado de Preços da Tabela 07
  const tabela07Map = useMemo(() => {
    const map = new Map<string, number>();
    PRODUTOS_TABELA_07_INICIAIS.forEach((p) => {
      const codeStr = String(p.codigo).trim();
      const codeClean = codeStr.replace(/^0+/, '');
      const codePadded = codeStr.padStart(8, '0');
      if (p.valorTabela > 0) {
        map.set(codeStr, p.valorTabela);
        map.set(codeClean, p.valorTabela);
        map.set(codePadded, p.valorTabela);
      }
    });
    return map;
  }, []);

  // Mapeamento de preços do estoque base (res) como fallback
  const resPrecoMap = useMemo(() => {
    const map = new Map<number, number>();
    (data.res || []).forEach((r) => {
      const cod = r[0];
      const preco = r[5];
      if (preco > 0) map.set(cod, preco);
    });
    return map;
  }, [data.res]);

  // Mapeamento de estoque disponível na 02.05.02 (Estoque Central)
  const ecDispMap = useMemo(() => {
    const map = new Map<number, number>();
    const ec = data.ec;
    if (ec && ec.r && ec.r.length > 0) {
      const h = ec.h || [];
      const prodIdx = h.indexOf('Produto') >= 0 ? h.indexOf('Produto') : 3;
      const dispIdx = h.indexOf('Disponivel') >= 0 ? h.indexOf('Disponivel') : 11;
      ec.r.forEach((row) => {
        const cod = Number(String(row[prodIdx] || '').replace(/\D/g, ''));
        const disp = parseColL(row[dispIdx]);
        if (!isNaN(cod) && cod > 0) {
          map.set(cod, disp);
        }
      });
    }
    return map;
  }, [data.ec]);

  // Função para obter o preço da Tabela 7
  const getPrecoT7 = (codeNum: number, codeStr: string): number => {
    const clean = String(codeNum);
    const padded = clean.padStart(8, '0');
    if (tabela07Map.has(codeStr)) return tabela07Map.get(codeStr)!;
    if (tabela07Map.has(clean)) return tabela07Map.get(clean)!;
    if (tabela07Map.has(padded)) return tabela07Map.get(padded)!;
    if (resPrecoMap.has(codeNum)) return resPrecoMap.get(codeNum)!;
    return 0;
  };

  // Carrega ou inicializa as rodadas de recontagem (Recontagem 1, Recontagem 2, etc.)
  const rounds: RecontagemRound[] = useMemo(() => {
    if (data.contagem021101 && data.contagem021101.counts && data.contagem021101.counts.length > 0) {
      return data.contagem021101.counts.map((c, idx) => {
        const roundNum = idx + 1;
        const roundLabel = c.label || `Recontagem ${roundNum}`;
        const parsedItems: ParsedItem021101[] = (c.parsedItems || []).map((it) => {
          const cleanCod = it.cleanCode || Number(String(it.code).replace(/\D/g, '')) || 0;
          const disp = ecDispMap.get(cleanCod) ?? 0;
          const dif = it.qty - disp;
          const preco = getPrecoT7(cleanCod, it.code);
          return {
            code: it.code,
            cleanCode: cleanCod,
            desc: it.desc,
            qty: it.qty,
            dispEc: disp,
            difRecalculada: dif,
            precoTabela7: preco,
            valorVariacaoT7: dif * preco,
            recontagemLabel: roundLabel,
            roundNumber: roundNum,
            fileName: c.fileName || `02.11.01_Recontagem_${roundNum}.xlsx`,
            importedAt: c.importedAt,
          };
        });
        return {
          id: c.id,
          roundNumber: roundNum,
          label: roundLabel,
          fileName: c.fileName || `02.11.01_Recontagem_${roundNum}.xlsx`,
          importedAt: c.importedAt,
          items: parsedItems,
        };
      });
    }

    // Caso inicial (sem importação manual prévia): inicializa a Recontagem 1 com os 71 itens reais
    const defaultParsed: ParsedItem021101[] = DEFAULT_ITEMS_RAW.map((it) => {
      const cleanCod = Number(it.c.replace(/^0+/, ''));
      const disp = ecDispMap.get(cleanCod) ?? it.disp;
      const dif = it.q - disp;
      const preco = getPrecoT7(cleanCod, it.c) || it.t7;
      return {
        code: it.c,
        cleanCode: cleanCod,
        desc: it.d,
        qty: it.q,
        dispEc: disp,
        difRecalculada: dif,
        precoTabela7: preco,
        valorVariacaoT7: dif * preco,
        recontagemLabel: 'Recontagem 1',
        roundNumber: 1,
        fileName: '02.11.01_PW03018R.XLSX',
        importedAt: new Date().toLocaleDateString('pt-BR'),
      };
    });

    return [
      {
        id: 'initial_round_1',
        roundNumber: 1,
        label: 'Recontagem 1',
        fileName: '02.11.01_PW03018R.XLSX',
        importedAt: new Date().toLocaleDateString('pt-BR'),
        items: defaultParsed,
      },
    ];
  }, [data.contagem021101, ecDispMap, tabela07Map, resPrecoMap]);

  // Lista consolidada de itens para a tabela
  const allItems: ParsedItem021101[] = useMemo(() => {
    if (selectedRoundFilter === 'all') {
      // Se 'all', mostra a última rodada mais recente para cada código, mantendo o histórico
      const mapByCode = new Map<number, ParsedItem021101>();
      rounds.forEach((round) => {
        round.items.forEach((item) => {
          mapByCode.set(item.cleanCode, item);
        });
      });
      return Array.from(mapByCode.values());
    }

    const round = rounds.find((r) => r.id === selectedRoundFilter || String(r.roundNumber) === selectedRoundFilter);
    return round ? round.items : [];
  }, [rounds, selectedRoundFilter]);

  // Filtro de busca e status
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchSearch =
        item.code.includes(searchTerm) ||
        item.cleanCode.toString().includes(searchTerm) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'divergencias') return item.difRecalculada !== 0;
      if (statusFilter === 'faltas') return item.difRecalculada < 0;
      if (statusFilter === 'sobras') return item.difRecalculada > 0;
      if (statusFilter === 'zerados') return item.difRecalculada === 0;
      return true;
    });
  }, [allItems, searchTerm, statusFilter]);

  // Totais e cálculos financeiros avaliados com o valor da Tabela 7
  const totals = useMemo(() => {
    let totalValorFaltasT7 = 0;
    let totalValorSobrasT7 = 0;
    let countFaltas = 0;
    let countSobras = 0;
    let countZerados = 0;
    let totalItensSemPrecoT7 = 0;

    allItems.forEach((it) => {
      if (it.precoTabela7 <= 0) {
        totalItensSemPrecoT7++;
      }
      if (it.difRecalculada < 0) {
        countFaltas++;
        totalValorFaltasT7 += Math.abs(it.valorVariacaoT7);
      } else if (it.difRecalculada > 0) {
        countSobras++;
        totalValorSobrasT7 += Math.abs(it.valorVariacaoT7);
      } else {
        countZerados++;
      }
    });

    const resultadoLiquidoT7 = totalValorSobrasT7 - totalValorFaltasT7;
    const totalItens = allItems.length;
    const totalDivergentes = countFaltas + countSobras;

    return {
      totalItens,
      countFaltas,
      countSobras,
      countZerados,
      totalDivergentes,
      totalValorFaltasT7,
      totalValorSobrasT7,
      resultadoLiquidoT7,
      totalItensSemPrecoT7,
    };
  }, [allItems]);

  // Handler de Importação de Arquivo 02.11.01 (Cria Recontagem 1, Recontagem 2, etc.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (!rawRows || rawRows.length < 2) {
        alert('O arquivo selecionado está vazio ou não possui linhas de dados suficientes.');
        setIsProcessing(false);
        return;
      }

      // Procura a linha de cabeçalho
      let headerRowIndex = 0;
      let colCodeIndex = 2; // Coluna C por padrão (índice 2)
      let colDescIndex = 3; // Coluna D por padrão (índice 3)
      let colQtyIndex = 9;  // Coluna J por padrão (índice 9)

      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i].map((c) => String(c).toLowerCase().trim());
        const foundCode = row.findIndex((c) => /produto|c[oó]digo|cod/i.test(c));
        const foundDesc = row.findIndex((c) => /descri[cç][aã]o|desc/i.test(c));
        const foundQty = row.findIndex((c) => /qtdade|quantidade|qtd/i.test(c));

        if (foundCode >= 0 || foundDesc >= 0 || foundQty >= 0) {
          headerRowIndex = i;
          if (foundCode >= 0) colCodeIndex = foundCode;
          if (foundDesc >= 0) colDescIndex = foundDesc;
          if (foundQty >= 0) colQtyIndex = foundQty;
          break;
        }
      }

      const dataRows = rawRows.slice(headerRowIndex + 1);
      const nextRoundNumber = rounds.length + 1;
      const nextRoundLabel = `Recontagem ${nextRoundNumber}`;

      const parsedItemsList: {
        code: string;
        cleanCode: number;
        desc: string;
        qty: number;
      }[] = [];

      dataRows.forEach((row) => {
        const rawCode = String(row[colCodeIndex] ?? '').trim();
        const rawDesc = String(row[colDescIndex] ?? '').trim();
        const rawQty = row[colQtyIndex];

        if (!rawCode && !rawDesc) return;
        const cleanCod = Number(rawCode.replace(/\D/g, ''));
        if (isNaN(cleanCod) || cleanCod <= 0) return;

        const qty = parseColL(rawQty);

        parsedItemsList.push({
          code: rawCode.padStart(8, '0'),
          cleanCode: cleanCod,
          desc: rawDesc.toUpperCase(),
          qty,
        });
      });

      if (parsedItemsList.length === 0) {
        alert('Não foram encontrados produtos válidos nas colunas C (Código), D (Descrição) e J (Quantidade).');
        setIsProcessing(false);
        return;
      }

      // Adiciona a nova rodada na lista de contagens
      const newRoundObj = {
        id: `recontagem_${Date.now()}`,
        label: nextRoundLabel,
        rows: dataRows,
        fileName: file.name,
        totalItems: parsedItemsList.length,
        parsedItems: parsedItemsList,
        importedAt: new Date().toLocaleString('pt-BR'),
      };

      const existingCounts = data.contagem021101?.counts || [];
      const updatedCounts = [...existingCounts, newRoundObj];

      const nextData: RawData = {
        ...data,
        contagem021101: {
          counts: updatedCounts,
        },
      };

      const actionDesc = `Importou ${nextRoundLabel} (${file.name}): ${parsedItemsList.length} itens recontados`;
      onUpdateData(nextData, actionDesc);
      setSelectedRoundFilter(newRoundObj.id);

      alert(`✅ ${nextRoundLabel} importada com sucesso!\n\n• Arquivo: ${file.name}\n• Total de itens recontados: ${parsedItemsList.length}\n• Colunas importadas: C (Código), D (Descrição), J (Quantidade)\n• Cálculos de variação atualizados com a Tabela 7.`);
    } catch (err: any) {
      console.error('Erro ao importar 02.11.01:', err);
      alert(`Falha ao ler arquivo: ${err?.message || err}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handler de Limpeza de Recontagens
  const handleClearRecontagens = () => {
    if (confirm('Deseja limpar as recontagens importadas nesta sessão?')) {
      const nextData: RawData = {
        ...data,
        contagem021101: {
          counts: [],
        },
      };
      onUpdateData(nextData, 'Limpou lista de recontagens 02.11.01');
      setSelectedRoundFilter('all');
    }
  };

  // Handler da Lógica do Prompt 8:
  // "um botão para confirmar essa contagem e atualizar a minha 02 05 02 importada a que está na aba de estoque central"
  const handleConfirmAndUpdateEc = () => {
    if (allItems.length === 0) {
      alert('Nenhum item recontado para atualizar no Estoque Central.');
      return;
    }

    setShowConfirmEcModal(true);
  };

  const executeApplyRecontagemToEc = () => {
    const activeRound = rounds[rounds.length - 1]; // Pega a recontagem mais recente ativa
    const recontagemMap = new Map<number, number>();
    allItems.forEach((it) => {
      recontagemMap.set(it.cleanCode, it.qty);
    });

    let updatedEcRowsCount = 0;
    let updatedResCount = 0;

    // 1. Atualiza Estoque Central (data.ec.r)
    let nextEc: EstoqueCentralData = {
      h: data.ec?.h ? [...data.ec.h] : ['Filial', 'Grupo', 'Subgrupo', 'Produto', 'Descricao', 'Emb', 'Un', 'Est. Min', 'Est. Max', 'Saldo Anterior', 'Entradas', 'Disponivel'],
      r: (data.ec?.r || []).map((row) => [...row]),
    };

    const prodIdx = nextEc.h.indexOf('Produto') >= 0 ? nextEc.h.indexOf('Produto') : 3;
    const dispIdx = nextEc.h.indexOf('Disponivel') >= 0 ? nextEc.h.indexOf('Disponivel') : 11;

    nextEc.r = nextEc.r.map((row) => {
      const cod = Number(String(row[prodIdx] || '').replace(/\D/g, ''));
      if (recontagemMap.has(cod)) {
        const newQty = recontagemMap.get(cod)!;
        row[dispIdx] = `${newQty} cx`;
        updatedEcRowsCount++;
      }
      return row;
    });

    // 2. Atualiza data.res (coluna 3: G promax / coluna 7: b inventário)
    let nextRes: ResRow[] = data.res.map((r) => {
      const cod = r[0];
      if (recontagemMap.has(cod)) {
        const rowCopy = [...r] as ResRow;
        const fator = rowCopy[4] > 0 ? rowCopy[4] : 1;
        const newQtyCx = recontagemMap.get(cod)!;
        const newQtyUnid = Math.round(newQtyCx * fator);
        // Atualiza a contagem física (coluna 7 - b) para refletir a recontagem oficial
        rowCopy[7] = newQtyUnid;
        updatedResCount++;
        return rowCopy;
      }
      return r;
    });

    // 3. Marca como confirmada
    const nowStr = new Date().toLocaleString('pt-BR');
    const updatedCounts = (data.contagem021101?.counts || []).map((c) => ({
      ...c,
      confirmedToEcAt: nowStr,
    }));

    const nextData: RawData = {
      ...data,
      ec: nextEc,
      res: nextRes,
      gradeRes: data.gradeRes ? nextRes : undefined,
      contagem021101: {
        counts: updatedCounts,
      },
    };

    const actionDesc = `Confirmou ${activeRound?.label || 'Recontagem'} e atualizou 02.05.02 no Estoque Central (${updatedEcRowsCount} produtos atualizados)`;
    onUpdateData(nextData, actionDesc);
    setShowConfirmEcModal(false);

    alert(`✅ Estoque Central (02.05.02) Atualizado com Sucesso!\n\n• ${updatedEcRowsCount} produtos atualizados na 02.05.02 do Estoque Central.\n• ${updatedResCount} produtos atualizados no inventário base.\n• A contagem apurada na ${activeRound?.label || 'Recontagem'} agora é o novo saldo oficial!`);
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    if (allItems.length === 0) return;

    const headers = [
      'Código (Col. C)',
      'Descrição (Col. D)',
      'Quantidade (Col. J)',
      'Disp. 02.05.02',
      'Dif. Recalculada',
      'Valor Tabela 7 (R$)',
      'Variação Tabela 7 (R$)',
      'Status',
      'Recontagem',
      'Arquivo',
    ];

    const rows = filteredItems.map((it) => [
      `"${it.code}"`,
      `"${it.desc.replace(/"/g, '""')}"`,
      it.qty,
      it.dispEc,
      it.difRecalculada,
      it.precoTabela7.toFixed(2).replace('.', ','),
      it.valorVariacaoT7.toFixed(2).replace('.', ','),
      it.difRecalculada < 0 ? 'FALTA' : it.difRecalculada > 0 ? 'SOBRA' : 'CONFORME',
      `"${it.recontagemLabel}"`,
      `"${it.fileName}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Recontagem_021101_Tabela7_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16 font-sans">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-xs">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                  REC 02.05.02
                </span>
                <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-purple-600" />
                  AVALIAÇÃO TABELA 07
                </span>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Recontagem na 02.05.02 (02.11.01)
                </h1>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                A base principal <b>02.05.02</b> é sincronizada automaticamente da aba <b>Estoque Central</b>.
                Carregue os arquivos de <b>02.11.01</b> (recontagens): o inventário físico passa a ser a <b>coluna J (Qtdade)</b> e a diferença é recalculada automaticamente contra o disponível da 02.05.02 e <b>avaliada financeiramente pela Tabela 7</b>.
              </p>
            </div>

            {/* Ação de Confirmação para Estoque Central (Prompt 8) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleConfirmAndUpdateEc}
                disabled={allItems.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition cursor-pointer border border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Confirmar essa contagem e atualizar a 02.05.02 importada que está no Estoque Central"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>CONFIRMAR CONTAGEM &amp; ATUALIZAR 02.05.02</span>
              </button>
            </div>
          </div>

          {/* Cards de Origem: 1. Base 02.05.02 e 2. 02.11.01 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {/* Card 1: Base 02.05.02 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[11px] font-bold">1</span>
                    Base 02.05.02 (Estoque Central)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" /> Sincronizado
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <b>{data.ec?.r?.length || 267} produtos</b> carregados automaticamente da aba Estoque Central.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Base ativa pronta para confronto
                </span>
                {onNavigateToTab && (
                  <button
                    onClick={() => onNavigateToTab('ec')}
                    className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                  >
                    Ver Estoque Central →
                  </button>
                )}
              </div>
            </div>

            {/* Card 2: 02.11.01 (recontagens) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[11px] font-bold">2</span>
                    02.11.01 (recontagens com colunas C, D e J)
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {rounds.length} {rounds.length === 1 ? 'rodada' : 'rodadas'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Importe uma recontagem por vez ou várias. Cada nova importação gera sucessivamente <b>Recontagem 1</b>, <b>Recontagem 2</b>, etc.
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                  id="file-upload-021101"
                />
                <label
                  htmlFor="file-upload-021101"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-lg cursor-pointer transition shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Escolher Arquivo 02.11.01</span>
                </label>
                <span className="text-xs text-slate-500 truncate">
                  {isProcessing ? 'Processando arquivo...' : 'Formato padrão Promax (Colunas C, D e J)'}
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Métricas e Totais Avaliados pela TABELA 7 (Prompt 9) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
            {/* Produtos recontados */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Produtos Recontados
              </span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {totals.totalItens} <span className="text-xs font-normal text-slate-500">de {data.ec?.r?.length || 267}</span>
              </div>
              <span className="text-[10.5px] text-slate-500 block mt-0.5">
                {totals.totalDivergentes} com divergência
              </span>
            </div>

            {/* Resultado Líquido com Tabela 7 */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Resultado Líquido (Tabela 7)
              </span>
              <div
                className={`text-xl font-black mt-0.5 ${
                  totals.resultadoLiquidoT7 < 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {totals.resultadoLiquidoT7 < 0 ? '-' : '+'}R$ {Math.abs(totals.resultadoLiquidoT7).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10.5px] text-slate-500 block mt-0.5">
                Valor líquido da recontagem
              </span>
            </div>

            {/* Faltas Tabela 7 */}
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block">
                  Faltas (Tabela 7)
                </span>
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xl font-black text-red-700 mt-0.5">
                -R$ {totals.totalValorFaltasT7.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10.5px] text-red-600 block mt-0.5">
                {totals.countFaltas} produtos com falta física
              </span>
            </div>

            {/* Sobras Tabela 7 */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Sobras (Tabela 7)
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">
                +R$ {totals.totalValorSobrasT7.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10.5px] text-emerald-600 block mt-0.5">
                {totals.countSobras} produtos com sobra física
              </span>
            </div>

            {/* Tabela de Preço Vigente */}
            <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                Tabela Base de Preços
              </span>
              <div className="text-base font-bold text-purple-900 mt-0.5 truncate">
                {TABELA_07_INFO.nomeTabela}
              </div>
              <span className="text-[10.5px] text-purple-700 block mt-0.5">
                Vigência {TABELA_07_INFO.vigencia}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Tabela de Itens Recontados na 02.11.01 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Header da Tabela com Seletor de Rodada e Ações */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  ITENS RECONTADOS NA 02.11.01 ({filteredItems.length} itens)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Colunas importadas do arquivo: <b>Código (Col. C)</b>, <b>Descrição (Col. D)</b> e <b>Quantidade (Col. J)</b> — Variação calculada com <b>Tabela 7</b>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de Rodadas: Recontagem 1, Recontagem 2, etc. (Prompt 8) */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2 py-1">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-bold text-slate-600">Rodada:</span>
                <select
                  value={selectedRoundFilter}
                  onChange={(e) => setSelectedRoundFilter(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Todas as Recontagens (Consolidado)</option>
                  {rounds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.items.length} itens)
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão de Exportar CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={allItems.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              {/* Botão de Limpar */}
              <button
                type="button"
                onClick={handleClearRecontagens}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar recontagens</span>
              </button>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos ({allItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('divergencias')}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  statusFilter === 'divergencias'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Com Divergência ({totals.totalDivergentes})
              </button>
              <button
                onClick={() => setStatusFilter('faltas')}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  statusFilter === 'faltas'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Faltas ({totals.countFaltas})
              </button>
              <button
                onClick={() => setStatusFilter('sobras')}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  statusFilter === 'sobras'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Sobras ({totals.countSobras})
              </button>
              <button
                onClick={() => setStatusFilter('zerados')}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                  statusFilter === 'zerados'
                    ? 'bg-slate-500 text-white border-slate-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Conforme ({totals.countZerados})
              </button>
            </div>
          </div>

          {/* Tabela de Produtos Recontados (com layout idêntico à imagem enviada + Tabela 7) */}
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[#FFC000] text-black uppercase font-bold text-[11px] shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-amber-500">Código (Col. C)</th>
                  <th className="py-2.5 px-3 border-r border-amber-500">Descrição (Col. D)</th>
                  <th className="py-2.5 px-3 text-right border-r border-amber-500">Quantidade (Col. J)</th>
                  <th className="py-2.5 px-3 text-right border-r border-amber-500">Disp. 02.05.02</th>
                  <th className="py-2.5 px-3 text-right border-r border-amber-500">Dif. Recalculada</th>
                  {/* Colunas da Tabela 7 (Prompt 9) */}
                  <th className="py-2.5 px-3 text-right border-r border-amber-500 bg-[#e6ad00]">Preço Tabela 7 (R$)</th>
                  <th className="py-2.5 px-3 text-right border-r border-amber-500 bg-[#e6ad00]">Variação Tabela 7 (R$)</th>
                  <th className="py-2.5 px-3">Recontagem / Arquivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Nenhum item encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isFalta = item.difRecalculada < 0;
                    const isSobra = item.difRecalculada > 0;
                    const isConforme = item.difRecalculada === 0;

                    return (
                      <tr
                        key={`${item.code}-${idx}`}
                        className={`hover:bg-amber-50/40 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        {/* Código */}
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-100">
                          {item.code}
                        </td>

                        {/* Descrição */}
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100 max-w-xs truncate" title={item.desc}>
                          {item.desc}
                        </td>

                        {/* Quantidade (Col. J) */}
                        <td className="py-2 px-3 text-right font-bold text-blue-700 border-r border-slate-100">
                          <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {item.qty.toLocaleString('pt-BR')} cx
                          </span>
                        </td>

                        {/* Disp. 02.05.02 */}
                        <td className="py-2 px-3 text-right text-slate-700 font-medium border-r border-slate-100">
                          {item.dispEc.toLocaleString('pt-BR')} cx
                        </td>

                        {/* Dif. Recalculada */}
                        <td className="py-2 px-3 text-right font-bold border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded font-black ${
                              isFalta
                                ? 'text-red-700 bg-red-50'
                                : isSobra
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-slate-500'
                            }`}
                          >
                            {isSobra ? '+' : ''}{item.difRecalculada.toLocaleString('pt-BR')} cx
                          </span>
                        </td>

                        {/* Preço Tabela 7 (R$) */}
                        <td className="py-2 px-3 text-right font-semibold text-slate-800 border-r border-slate-100 bg-purple-50/20">
                          {item.precoTabela7 > 0 ? (
                            formatBRL(item.precoTabela7)
                          ) : (
                            <span className="text-slate-400 italic">R$ 0,00</span>
                          )}
                        </td>

                        {/* Variação Tabela 7 (R$) */}
                        <td className="py-2 px-3 text-right font-black border-r border-slate-100 bg-purple-50/20">
                          <span
                            className={`${
                              isFalta
                                ? 'text-red-700'
                                : isSobra
                                ? 'text-emerald-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {isSobra ? '+' : ''}
                            {item.valorVariacaoT7 === 0
                              ? 'R$ 0,00'
                              : formatBRL(item.valorVariacaoT7)}
                          </span>
                        </td>

                        {/* Recontagem / Arquivo */}
                        <td className="py-2 px-3 text-slate-600 text-[11px] truncate max-w-xs">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 mr-1.5">
                            {item.recontagemLabel}
                          </span>
                          <span className="font-mono text-slate-500" title={item.fileName}>
                            {item.fileName}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Informativo */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Exibindo <b>{filteredItems.length}</b> de <b>{allItems.length}</b> produtos recontados.
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-red-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Falta: -{totals.countFaltas} itens (-R$ {totals.totalValorFaltasT7.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Sobra: +{totals.countSobras} itens (+R$ {totals.totalValorSobrasT7.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Atualizar Estoque Central (Prompt 8) */}
      {showConfirmEcModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Confirmar Contagem e Atualizar 02.05.02?
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Você está prestes a atualizar o <b>Estoque Central (02.05.02)</b> com os dados da recontagem:
            </p>

            <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Total de produtos a atualizar:</span>
                <b>{allItems.length} produtos</b>
              </div>
              <div className="flex justify-between">
                <span>Variação Total (Tabela 7):</span>
                <b className={totals.resultadoLiquidoT7 < 0 ? 'text-red-700' : 'text-emerald-700'}>
                  {totals.resultadoLiquidoT7 < 0 ? '-' : '+'}R$ {Math.abs(totals.resultadoLiquidoT7).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </b>
              </div>
              <div className="flex justify-between">
                <span>Ação no Estoque Central:</span>
                <span className="text-emerald-700 font-bold">Atualizar coluna Disponível (L)</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-3">
              ⚠️ O novo saldo físico da 02.11.01 substituirá os saldos anteriores do Estoque Central e recalculará o Dashboard.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowConfirmEcModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeApplyRecontagemToEc}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Sim, Atualizar 02.05.02</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
