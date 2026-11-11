import React, { useState, useMemo, useRef } from 'react';
import { SavedPopupItem } from '../data/types';
import { 
  ArrowLeft, 
  Trash2, 
  Printer, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  AlertCircle,
  Camera,
  Loader2,
  Columns,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  List,
  Table
} from 'lucide-react';
import { formatBRL } from '../utils/formatters';
import { toJpeg } from 'html-to-image';

interface PopupsSalvosViewProps {
  savedPopups: SavedPopupItem[];
  onRemovePopup: (id: string) => void;
  onClearAll: () => void;
  onNavigateToDashboard: () => void;
}

/**
 * Extrai e normaliza os dados de variação e impacto financeiro de Ontem para Hoje
 * usando o Preço da Caixa da Tabela 7
 */
export const getPopupVariationInfo = (item: SavedPopupItem) => {
  const ontem = item.analysis ? item.analysis.ontem : 0;
  const hoje = item.analysis ? item.analysis.hoje : item.qtde;
  const variacaoCx = item.variacaoCx !== undefined ? item.variacaoCx : (hoje - ontem);
  const absVariacao = Math.abs(variacaoCx);

  // Preço unitário da caixa na Tabela 7
  let unitPrice = item.unitPrice;
  if (!unitPrice || unitPrice <= 0) {
    if (item.qtde > 0 && item.valor) {
      unitPrice = Math.abs(item.valor) / item.qtde;
    } else if (hoje > 0 && item.valor) {
      unitPrice = Math.abs(item.valor) / hoje;
    } else {
      unitPrice = 0;
    }
  }

  // Impacto financeiro da variação de ontem para hoje:
  // Se for falta:
  //   - aumento de falta (hoje > ontem, variacaoCx > 0): piorou o estoque -> impacto negativo (-variacaoCx * unitPrice)
  //   - redução de falta (hoje < ontem, variacaoCx < 0): recuperou o estoque -> impacto positivo
  // Se for sobra:
  //   - aumento de sobra (hoje > ontem, variacaoCx > 0): gerou sobra nova -> impacto positivo (+variacaoCx * unitPrice)
  //   - redução de sobra (hoje < ontem, variacaoCx < 0): reduziu sobra -> impacto negativo
  let impactoFinanceiro = 0;
  if (item.impactoVariacao !== undefined) {
    impactoFinanceiro = item.impactoVariacao;
  } else {
    impactoFinanceiro = item.isFalta ? -(variacaoCx * unitPrice) : (variacaoCx * unitPrice);
  }

  return {
    ontem,
    hoje,
    variacaoCx,
    absVariacao,
    unitPrice,
    impactoFinanceiro,
  };
};

export const PopupsSalvosView: React.FC<PopupsSalvosViewProps> = ({
  savedPopups,
  onRemovePopup,
  onClearAll,
  onNavigateToDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'falta' | 'sobra'>('all');

  const filteredPopups = useMemo(() => {
    return savedPopups.filter((item) => {
      const matchSearch =
        item.code.toString().includes(searchTerm) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType =
        filterType === 'all' ||
        (filterType === 'falta' && item.isFalta) ||
        (filterType === 'sobra' && !item.isFalta);
      return matchSearch && matchType;
    });
  }, [savedPopups, searchTerm, filterType]);

  // Totais baseados ESTRITAMENTE na VARIAÇÃO e no IMPACTO FINANCEIRO da variação de Ontem para Hoje
  const totals = useMemo(() => {
    let totalImpactoFaltas = 0;
    let totalImpactoSobras = 0;
    let totalVariacaoCxFaltas = 0;
    let totalVariacaoCxSobras = 0;
    let countFaltas = 0;
    let countSobras = 0;

    savedPopups.forEach((p) => {
      const v = getPopupVariationInfo(p);
      if (p.isFalta) {
        // Se a falta aumentou (+7 cx), o impacto financeiro é negativo (-R$ 287,05)
        totalImpactoFaltas += v.impactoFinanceiro;
        totalVariacaoCxFaltas += v.variacaoCx;
        countFaltas++;
      } else {
        totalImpactoSobras += v.impactoFinanceiro;
        totalVariacaoCxSobras += v.variacaoCx;
        countSobras++;
      }
    });

    const saldoLiquido = totalImpactoSobras + totalImpactoFaltas;

    return {
      totalImpactoFaltas,
      totalImpactoSobras,
      totalVariacaoCxFaltas,
      totalVariacaoCxSobras,
      saldoLiquido,
      countFaltas,
      countSobras,
    };
  }, [savedPopups]);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const rowScrollRef = useRef<HTMLDivElement>(null);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [exportingCardId, setExportingCardId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'table' | 'linear' | 'grid' | 'fit'>('table'); // Padrão: 'table' (Por Linha e Coluna)

  const handlePrint = () => {
    window.print();
  };

  const scrollRow = (direction: 'left' | 'right') => {
    if (rowScrollRef.current) {
      rowScrollRef.current.scrollBy({
        left: direction === 'left' ? -380 : 380,
        behavior: 'smooth',
      });
    }
  };

  /**
   * Exporta toda a visualização dos cards e métricas salvos em arquivo JPG
   */
  const handleExportBoardJpg = async () => {
    if (!printAreaRef.current || savedPopups.length === 0) return;
    try {
      setIsExportingJpg(true);
      // Pequena pausa para garantir renderização estável
      await new Promise((r) => setTimeout(r, 120));

      const node = printAreaRef.current;
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        backgroundColor: '#f8fafc',
        pixelRatio: 2,
        cacheBust: true,
        width: node.scrollWidth,
        height: node.scrollHeight,
      });

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const link = document.createElement('a');
      link.download = `auditoria-popups-salvos-${dateStr}_${timeStr}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar print em JPG:', err);
      alert('Não foi possível gerar a imagem JPG. Tente novamente.');
    } finally {
      setIsExportingJpg(false);
    }
  };

  /**
   * Exporta um único card individual de produto em arquivo JPG
   */
  const handleExportSingleCardJpg = async (cardId: string, desc: string, code: number) => {
    const cardEl = document.getElementById(`popup-card-${cardId}`);
    if (!cardEl) return;
    try {
      setExportingCardId(cardId);
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toJpeg(cardEl, {
        quality: 0.96,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
      });

      const cleanDesc = desc
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .slice(0, 25);

      const link = document.createElement('a');
      link.download = `card-${code}_${cleanDesc}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar card em JPG:', err);
    } finally {
      setExportingCardId(null);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen pb-16 font-sans">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-10 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToDashboard}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Pop-ups Salvos para Auditoria
                </h1>
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {savedPopups.length} {savedPopups.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Variação de Ontem para Hoje e Impacto Financeiro calculado pelo Preço da Tabela 7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Print em JPG */}
            <button
              onClick={handleExportBoardJpg}
              disabled={savedPopups.length === 0 || isExportingJpg}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition shadow-xs ${
                savedPopups.length === 0 || isExportingJpg
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 active:scale-95'
              }`}
              title="Baixar print de auditoria em arquivo de imagem JPG"
            >
              {isExportingJpg ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Gerando JPG...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-white" />
                  <span>Print em JPG</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={savedPopups.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition shadow-xs ${
                savedPopups.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClearAll}
              disabled={savedPopups.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition shadow-xs ${
                savedPopups.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Limpar Tudo</span>
            </button>
          </div>
        </div>

        {/* Metrics Cards: Focados no IMPACTO DA VARIAÇÃO de Ontem para Hoje */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* FALTAS SALVAS */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
                Faltas Salvas ({totals.countFaltas})
              </span>
              <span className="text-lg font-black text-red-900 mt-0.5 block">
                {totals.totalImpactoFaltas === 0
                  ? 'R$ 0,00'
                  : `${totals.totalImpactoFaltas < 0 ? '-' : '+'}R$ ${Math.abs(totals.totalImpactoFaltas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
              <span className="text-[10px] text-red-700/80 font-semibold block mt-0.5">
                Variação: {totals.totalVariacaoCxFaltas > 0 ? `+${totals.totalVariacaoCxFaltas}` : totals.totalVariacaoCxFaltas} cx vs ontem
              </span>
            </div>
            <TrendingDown className="w-6 h-6 text-red-500" />
          </div>

          {/* SOBRAS SALVAS */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Sobras Salvas ({totals.countSobras})
              </span>
              <span className="text-lg font-black text-emerald-900 mt-0.5 block">
                {totals.totalImpactoSobras === 0
                  ? 'R$ 0,00'
                  : `${totals.totalImpactoSobras < 0 ? '-' : '+'}R$ ${Math.abs(totals.totalImpactoSobras).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
              <span className="text-[10px] text-emerald-700/80 font-semibold block mt-0.5">
                Variação: {totals.totalVariacaoCxSobras > 0 ? `+${totals.totalVariacaoCxSobras}` : totals.totalVariacaoCxSobras} cx vs ontem
              </span>
            </div>
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>

          {/* SALDO LÍQUIDO SALVO */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                Saldo Líquido da Variação
              </span>
              <span className={`text-lg font-black mt-0.5 block ${totals.saldoLiquido < 0 ? 'text-red-700' : totals.saldoLiquido > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                {totals.saldoLiquido < 0 ? '-' : totals.saldoLiquido > 0 ? '+' : ''}R$ {Math.abs(totals.saldoLiquido).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-purple-700/80 font-semibold block mt-0.5">
                Impacto financeiro diário (Hoje vs Ontem)
              </span>
            </div>
            <ShieldAlert className="w-6 h-6 text-purple-500" />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-200">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Todos ({savedPopups.length})
            </button>
            <button
              onClick={() => setFilterType('falta')}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                filterType === 'falta'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Faltas ({totals.countFaltas})
            </button>
            <button
              onClick={() => setFilterType('sobra')}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition ${
                filterType === 'sobra'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Sobras ({totals.countSobras})
            </button>

            {/* Alternador de Layout: Tabela (Linha e Coluna - Padrão) vs Cards */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2.5 ml-1">
              <button
                onClick={() => setLayoutMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border transition ${
                  layoutMode === 'table'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
                title="Tabela: Visualização por Linha e Coluna (Código, Descrição, Variação, Impacto, Preço Tab 7, Ontem vs Hoje, Últimas 5 Diferenças)"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Linha e Coluna (Tabela)</span>
              </button>
              <button
                onClick={() => setLayoutMode('linear')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md border transition ${
                  layoutMode === 'linear'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
                title="Visualizar como cards"
              >
                <List className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid of Saved Pop-ups (Área de Captura do Print em JPG) */}
      <div ref={printAreaRef} className="w-full px-3 sm:px-5 py-4">
        {/* Cabeçalho do Relatório para o Print em JPG */}
        {filteredPopups.length > 0 && (
          <div className="mb-4 bg-white border-2 border-slate-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-200">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Relatório de Auditoria — Pop-ups Salvos</span>
                  <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                    {filteredPopups.length} {filteredPopups.length === 1 ? 'item' : 'itens'}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Variação de Ontem para Hoje e Impacto Financeiro calculado pelo Preço da Tabela 7
                </p>
              </div>
              <div className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Data: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Mini Cards de Resumo no Print */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Faltas Salvas ({totals.countFaltas})</span>
                  <span className="text-sm font-black text-red-900 block mt-0.5">
                    {totals.totalImpactoFaltas === 0 ? 'R$ 0,00' : `${totals.totalImpactoFaltas < 0 ? '-' : '+'}R$ ${Math.abs(totals.totalImpactoFaltas).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-[10px] text-red-700/80 font-semibold block">
                    Variação: {totals.totalVariacaoCxFaltas > 0 ? `+${totals.totalVariacaoCxFaltas}` : totals.totalVariacaoCxFaltas} cx
                  </span>
                </div>
                <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Sobras Salvas ({totals.countSobras})</span>
                  <span className="text-sm font-black text-emerald-900 block mt-0.5">
                    {totals.totalImpactoSobras === 0 ? 'R$ 0,00' : `${totals.totalImpactoSobras < 0 ? '-' : '+'}R$ ${Math.abs(totals.totalImpactoSobras).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className="text-[10px] text-emerald-700/80 font-semibold block">
                    Variação: {totals.totalVariacaoCxSobras > 0 ? `+${totals.totalVariacaoCxSobras}` : totals.totalVariacaoCxSobras} cx
                  </span>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Saldo Líquido da Variação</span>
                  <span className={`text-sm font-black block mt-0.5 ${totals.saldoLiquido < 0 ? 'text-red-700' : totals.saldoLiquido > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {totals.saldoLiquido < 0 ? '-' : totals.saldoLiquido > 0 ? '+' : ''}R$ {Math.abs(totals.saldoLiquido).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-purple-700/80 font-semibold block">
                    Impacto diário consolidado
                  </span>
                </div>
                <ShieldAlert className="w-5 h-5 text-purple-500 shrink-0" />
              </div>
            </div>
          </div>
        )}

        {/* Informação / Barra de Navegação */}
        {filteredPopups.length > 0 && (
          <div className="flex items-center justify-between mb-2.5 px-1 text-xs text-slate-600 font-semibold print:hidden">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              {layoutMode === 'table' ? (
                <span>Tabela por Linha e Coluna (<b>{filteredPopups.length}</b> produtos salvos):</span>
              ) : layoutMode === 'linear' ? (
                <span>Lista linear dos <b>{filteredPopups.length}</b> produtos salvos (um abaixo do outro):</span>
              ) : (
                <span>Cards lado a lado:</span>
              )}
            </div>
          </div>
        )}

        {filteredPopups.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-xs p-8 max-w-lg mx-auto">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Nenhum pop-up salvo no momento
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Para salvar um pop-up de auditoria, dê um <b>duplo clique</b> na célula de <b>QTDE</b> de qualquer produto na tabela de faltas ou sobras do Dashboard.
            </p>
            <button
              onClick={onNavigateToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir para o Dashboard</span>
            </button>
          </div>
        ) : layoutMode === 'table' ? (
          /* ============================================================== */
          /* VISUALIZAÇÃO POR LINHA E COLUNA (TABELA DE AUDITORIA)           */
          /* ============================================================== */
          <div className="w-full overflow-x-auto bg-white rounded-xl border-2 border-slate-200 shadow-sm">
            <table className="w-full text-center border-collapse min-w-[960px] lg:min-w-full table-fixed">
              <thead>
                <tr className="bg-[#FFC000] text-black border-b-2 border-amber-600 shadow-xs">
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-2 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '10%', minWidth: '95px', color: '#000000' }}
                  >
                    CÓDIGO DO PRODUTO
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-3 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '25%', minWidth: '170px', color: '#000000' }}
                  >
                    DESCRIÇÃO DO PRODUTO
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-2 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '8%', minWidth: '75px', color: '#000000' }}
                  >
                    VARIAÇÃO
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-2 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '11%', minWidth: '100px', color: '#000000' }}
                  >
                    IMPACTO
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-2 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '9%', minWidth: '85px', color: '#000000' }}
                  >
                    PREÇO TAB 7
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-3 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '16%', minWidth: '155px', color: '#000000' }}
                  >
                    ONTEM VS HOJE
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] border-r border-black/15 py-3 px-3 text-[11px] sm:text-xs md:text-[12.5px] leading-tight"
                    style={{ width: '16%', minWidth: '155px', color: '#000000' }}
                  >
                    ÚLTIMAS 5 DIFERENÇAS SALVAS
                  </th>
                  <th
                    className="font-black text-black uppercase tracking-wider text-center bg-[#FFC000] py-3 px-1 text-[11px] sm:text-xs md:text-[12.5px] leading-tight print:hidden"
                    style={{ width: '5%', minWidth: '60px', color: '#000000' }}
                  >
                    AÇÕES
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPopups.map((popup) => {
                  const v = getPopupVariationInfo(popup);
                  const isNegativeImpact = v.impactoFinanceiro < 0;
                  const isPositiveImpact = v.impactoFinanceiro > 0;

                  return (
                    <tr
                      key={popup.id}
                      id={`popup-card-${popup.id}`}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        popup.isFalta ? 'bg-red-50/25' : 'bg-emerald-50/25'
                      }`}
                    >
                      {/* 1. CÓDIGO DO PRODUTO */}
                      <td className="py-3.5 px-2 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="font-mono font-black text-xs sm:text-[13px] text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-300 shadow-2xs">
                            #{popup.code}
                          </span>
                          <span
                            className={`font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded uppercase tracking-wider shadow-2xs ${
                              popup.isFalta ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {popup.isFalta ? 'Falta' : 'Sobra'}
                          </span>
                        </div>
                      </td>

                      {/* 2. DESCRIÇÃO DO PRODUTO */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center text-center gap-1 min-w-0 overflow-hidden mx-auto">
                          <span className="font-black text-xs sm:text-[13.5px] text-slate-950 leading-snug break-words line-clamp-2 text-center">
                            {popup.desc}
                          </span>
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 font-mono font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{popup.savedAt}</span>
                            </span>
                            {popup.matched021101 && (
                              <span className="text-emerald-800 font-black bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 text-[9px] truncate">
                                ✓ {popup.matched021101.statusText}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. VARIAÇÃO */}
                      <td className="py-3.5 px-2 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`text-xs sm:text-sm md:text-base font-black ${
                              v.variacaoCx === 0
                                ? 'text-slate-600'
                                : popup.isFalta
                                ? v.variacaoCx > 0
                                  ? 'text-red-600'
                                  : 'text-emerald-600'
                                : v.variacaoCx > 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                            }`}
                          >
                            {v.variacaoCx > 0 ? `+${v.variacaoCx}` : v.variacaoCx} cx
                          </span>
                          <span
                            className={`text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 ${
                              popup.isFalta
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {popup.isFalta ? 'Faltando' : 'Sobrando'}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold tracking-tight">vs ontem</span>
                        </div>
                      </td>

                      {/* 4. IMPACTO */}
                      <td className="py-3.5 px-2 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`text-xs sm:text-sm md:text-base font-black truncate max-w-full ${
                              isNegativeImpact
                                ? 'text-red-700'
                                : isPositiveImpact
                                ? 'text-emerald-700'
                                : 'text-slate-700'
                            }`}
                          >
                            {v.impactoFinanceiro === 0
                              ? 'R$ 0,00'
                              : `${isNegativeImpact ? '-' : '+'}R$ ${Math.abs(v.impactoFinanceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold tracking-tight">impacto diário</span>
                        </div>
                      </td>

                      {/* 5. PREÇO TAB 7 */}
                      <td className="py-3.5 px-2 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs sm:text-[13px] font-black text-slate-950 bg-slate-100 px-2 py-1 rounded border border-slate-300 shadow-2xs truncate">
                            R$ {v.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">por caixa</span>
                        </div>
                      </td>

                      {/* 6. ONTEM VS HOJE */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-1 w-full min-w-0 overflow-hidden mx-auto max-w-[210px]">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span
                              className="font-black rounded border shadow-2xs text-[9px] px-2 py-0.5 truncate max-w-[120px] sm:max-w-none"
                              style={{
                                backgroundColor: popup.analysis.bg,
                                color: popup.analysis.color,
                                borderColor: popup.analysis.color + '40',
                              }}
                              title={popup.analysis.label}
                            >
                              {popup.analysis.label}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-700 font-bold whitespace-nowrap">
                              Hoje: <b className="text-slate-950 font-black">{v.hoje} cx</b>
                            </span>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[10.5px] bg-slate-50 px-2.5 py-1 rounded border border-slate-200 w-full text-center">
                            <span className="text-slate-600 truncate">Ontem: <b className="text-slate-900 font-black">{v.ontem} cx</b></span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-600 truncate">Saldo: <b className="text-slate-900 font-black">{popup.qtde} cx</b></span>
                          </div>
                        </div>
                      </td>

                      {/* 7. ÚLTIMAS 5 DIFERENÇAS SALVAS */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-1 w-full min-w-0 overflow-hidden mx-auto max-w-[220px]">
                          {popup.last5Days && (
                            <div className="flex items-center justify-center gap-2 text-[9.5px] font-black text-slate-600 mb-0.5">
                              <span className="uppercase tracking-wider">Histórico</span>
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300 text-slate-800 text-[10px] font-black">
                                Méd: {popup.last5Days.avg}
                              </span>
                            </div>
                          )}
                          {popup.last5Days?.days && (
                            <div className="grid grid-cols-5 gap-1 text-center w-full mx-auto">
                              {popup.last5Days.days.map((d, idx) => (
                                <div
                                  key={idx}
                                  className={`rounded p-1 border transition ${
                                    d.isToday
                                      ? 'bg-purple-100 border-2 border-purple-600 text-purple-950 font-black ring-1 ring-purple-300 shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-800 font-bold'
                                  }`}
                                >
                                  <span className="block text-[8px] text-slate-500 font-bold leading-tight truncate">
                                    {d.label}
                                  </span>
                                  <span className="block text-[10.5px] sm:text-xs font-black leading-tight mt-0.5 truncate">
                                    {d.qty}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 8. AÇÕES */}
                      <td className="py-3.5 px-1 text-center align-middle whitespace-nowrap print:hidden">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleExportSingleCardJpg(popup.id, popup.desc, popup.code)}
                            disabled={exportingCardId === popup.id}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-300 transition shadow-2xs"
                            title="Baixar print deste produto em JPG"
                          >
                            {exportingCardId === popup.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <Camera className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => onRemovePopup(popup.id)}
                            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-300 transition shadow-2xs"
                            title="Excluir este pop-up salvo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            ref={rowScrollRef}
            className={
              layoutMode === 'linear'
                ? 'flex flex-col gap-4 w-full'
                : layoutMode === 'fit'
                ? 'grid w-full gap-2 items-stretch'
                : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
            }
            style={
              layoutMode === 'fit'
                ? { gridTemplateColumns: `repeat(${Math.max(filteredPopups.length, 1)}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {filteredPopups.map((popup) => {
              const v = getPopupVariationInfo(popup);
              const isNegativeImpact = v.impactoFinanceiro < 0;
              const isPositiveImpact = v.impactoFinanceiro > 0;

              // RENDERIZAÇÃO LINEAR: Produtos um abaixo do outro com todas as informações expandidas
              if (layoutMode === 'linear') {
                return (
                  <div
                    key={popup.id}
                    id={`popup-card-${popup.id}`}
                    className={`w-full bg-white rounded-xl border-2 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col ${
                      popup.isFalta
                        ? 'border-red-200/90 hover:border-red-300'
                        : 'border-emerald-200/90 hover:border-emerald-300'
                    }`}
                  >
                    {/* Barra de destaque superior */}
                    <div className={`h-1.5 w-full ${popup.isFalta ? 'bg-red-500' : 'bg-emerald-500'}`} />

                    {/* Header: Código, Badge Falta/Sobra, Descrição, Confirmado, Timestamp e Ações */}
                    <div
                      className={`px-4 py-3 border-b-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                        popup.isFalta
                          ? 'bg-red-50/80 border-red-200/80'
                          : 'bg-emerald-50/80 border-emerald-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
                        <span className="font-mono font-bold text-xs text-slate-800 bg-white rounded border border-slate-300 shadow-2xs px-2 py-0.5">
                          #{popup.code}
                        </span>
                        <span
                          className={`font-extrabold text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider shadow-2xs ${
                            popup.isFalta ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {popup.isFalta ? 'Falta' : 'Sobra'}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900 tracking-tight leading-snug">
                          {popup.desc}
                        </h3>
                        {popup.matched021101 && (
                          <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-[10px] whitespace-nowrap">
                            ✓ {popup.matched021101.statusText}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{popup.savedAt}</span>
                        </span>

                        <button
                          onClick={() => handleExportSingleCardJpg(popup.id, popup.desc, popup.code)}
                          disabled={exportingCardId === popup.id}
                          className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition shadow-2xs"
                          title="Baixar print deste produto em JPG"
                        >
                          {exportingCardId === popup.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <Camera className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => onRemovePopup(popup.id)}
                          className="text-slate-500 hover:text-red-600 p-1.5 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 transition shadow-2xs"
                          title="Excluir este pop-up salvo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Corpo em 3 colunas lineares espaçosas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-3.5 bg-slate-50/40 items-stretch">
                      {/* Coluna 1: Variação & Impacto Financeiro (Preço Tab. 7) */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                        <div className="flex items-center justify-between font-extrabold text-[10px] text-slate-500 uppercase tracking-wide mb-2">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${popup.isFalta ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <span>Variação & Impacto</span>
                          </span>
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">
                            Tab. 7
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center py-1">
                          <div className="border-r border-slate-100 pr-1">
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-tight">Variação</span>
                            <span
                              className={`text-base font-black block mt-0.5 ${
                                v.variacaoCx === 0
                                  ? 'text-slate-600'
                                  : popup.isFalta
                                  ? v.variacaoCx > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                  : v.variacaoCx > 0
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {v.variacaoCx > 0 ? `+${v.variacaoCx}` : v.variacaoCx} cx
                            </span>
                            <span
                              className={`text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                                popup.isFalta ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {popup.isFalta ? 'Faltando' : 'Sobrando'}
                            </span>
                          </div>

                          <div className="border-r border-slate-100 px-1">
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-tight">Impacto</span>
                            <span
                              className={`text-base font-black block mt-0.5 ${
                                isNegativeImpact
                                  ? 'text-red-700'
                                  : isPositiveImpact
                                  ? 'text-emerald-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              {v.impactoFinanceiro === 0
                                ? 'R$ 0,00'
                                : `${isNegativeImpact ? '-' : '+'}R$ ${Math.abs(v.impactoFinanceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          </div>

                          <div className="pl-1">
                            <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-tight">Preço Tab. 7</span>
                            <span className="text-sm font-black text-slate-900 block mt-1">
                              R$ {v.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2: Comparativo Ontem vs Hoje */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                        <div className="flex items-center justify-between font-extrabold text-[10px] text-slate-500 uppercase tracking-wide mb-2">
                          <span>Ontem vs Hoje</span>
                          <span
                            className="font-bold rounded border shadow-2xs text-[10px] px-2 py-0.5"
                            style={{
                              backgroundColor: popup.analysis.bg,
                              color: popup.analysis.color,
                              borderColor: popup.analysis.color + '40',
                            }}
                          >
                            {popup.analysis.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold">Ontem:</span>
                            <span className="font-extrabold text-slate-900 text-sm">{v.ontem} cx</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold">Hoje:</span>
                            <span className="font-extrabold text-slate-900 text-sm">{v.hoje} cx</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100 text-xs mt-1">
                          <span className="font-medium text-[11px]">Saldo Hoje:</span>
                          <span className="font-extrabold text-slate-800 text-[11px]">
                            {popup.qtde} cx ({formatBRL(popup.valor)})
                          </span>
                        </div>
                      </div>

                      {/* Coluna 3: Histórico dos Últimos 5 Dias */}
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
                        <div className="flex items-center justify-between font-extrabold text-[10px] text-slate-500 uppercase tracking-wide mb-2">
                          <span>Últimos 5 Dias</span>
                          {popup.last5Days && (
                            <span className="font-bold text-slate-600 bg-slate-100 rounded border border-slate-200 text-[10px] px-2 py-0.5">
                              Méd: {popup.last5Days.avg}
                            </span>
                          )}
                        </div>

                        {popup.last5Days?.days && (
                          <div className="grid grid-cols-5 gap-1.5 text-center my-auto">
                            {popup.last5Days.days.map((d, idx) => (
                              <div
                                key={idx}
                                className={`rounded-lg border transition p-1.5 ${
                                  d.isToday
                                    ? 'bg-purple-50 border-purple-500 font-black text-purple-950 shadow-2xs ring-1 ring-purple-300'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 font-bold'
                                }`}
                              >
                                <span className="block text-slate-400 text-[9px] font-bold leading-tight">
                                  {d.label}
                                </span>
                                <span className="block font-black text-xs mt-0.5 leading-tight">
                                  {d.qty}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              const isCompact = (layoutMode === 'fit' && filteredPopups.length >= 4) || filteredPopups.length >= 6;

              return (
                <div
                  key={popup.id}
                  id={`popup-card-${popup.id}`}
                  className={`${
                    layoutMode === 'fit'
                      ? 'w-full min-w-0'
                      : 'w-full'
                  } bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col ${
                    popup.isFalta
                      ? 'border-red-200/90 hover:border-red-300'
                      : 'border-emerald-200/90 hover:border-emerald-300'
                  }`}
                >
                  {/* Barra de destaque superior bem marcada */}
                  <div className={`h-1.5 w-full ${popup.isFalta ? 'bg-red-500' : 'bg-emerald-500'}`} />

                  {/* Header card bem delineado */}
                  <div
                    className={`border-b-2 flex items-start justify-between ${
                      popup.isFalta
                        ? 'bg-red-50/80 border-red-200/80'
                        : 'bg-emerald-50/80 border-emerald-200/80'
                    } ${isCompact ? 'p-2' : 'p-3.5'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono font-bold text-slate-800 bg-white rounded border border-slate-300 shadow-2xs ${
                          isCompact ? 'text-[9px] px-1 py-0.5' : 'text-xs px-2 py-0.5'
                        }`}>
                          #{popup.code}
                        </span>
                        <span
                          className={`font-extrabold rounded uppercase tracking-wider shadow-2xs ${
                            isCompact ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2.5 py-0.5'
                          } ${
                            popup.isFalta
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {popup.isFalta ? 'Falta' : 'Sobra'}
                        </span>
                      </div>
                      <h3
                        className={`font-extrabold text-slate-900 line-clamp-2 leading-tight ${
                          isCompact ? 'text-[10px] mt-1 h-7' : 'text-xs mt-1.5'
                        }`}
                        title={popup.desc}
                      >
                        {popup.desc}
                      </h3>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0 ml-1">
                      {/* Botão de Print JPG Individual deste Card */}
                      <button
                        onClick={() => handleExportSingleCardJpg(popup.id, popup.desc, popup.code)}
                        disabled={exportingCardId === popup.id}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition"
                        title="Baixar print deste card em JPG"
                      >
                        {exportingCardId === popup.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onRemovePopup(popup.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition"
                        title="Excluir este pop-up salvo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* DESTAQUE PRINCIPAL: Variação e Impacto Financeiro da Variação de Ontem para Hoje */}
                  <div className={`border-b-2 border-slate-200 ${isCompact ? 'p-1.5 bg-slate-50/70' : 'p-3.5 bg-slate-50/50'}`}>
                    <div className={`font-extrabold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between ${
                      isCompact ? 'text-[8px]' : 'text-[10px]'
                    }`}>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${popup.isFalta ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        <span>Variação & Impacto</span>
                      </span>
                      <span className={`font-mono font-bold text-slate-700 bg-white rounded border border-slate-300 shadow-2xs ${
                        isCompact ? 'text-[8px] px-1 py-0.2' : 'text-[10px] px-2 py-0.5'
                      }`}>
                        Tab. 7
                      </span>
                    </div>

                    <div className={`bg-white rounded-lg border-2 border-slate-200 shadow-2xs ${isCompact ? 'p-1.5' : 'p-3'}`}>
                      {isCompact ? (
                        <>
                          <div className="grid grid-cols-2 gap-1 text-center border-b border-slate-100 pb-1 mb-1">
                            <div>
                              <span className="text-[7px] text-slate-500 font-extrabold block uppercase">Variação</span>
                              <span
                                className={`text-[11px] font-black block leading-tight ${
                                  v.variacaoCx === 0
                                    ? 'text-slate-600'
                                    : popup.isFalta
                                    ? v.variacaoCx > 0
                                      ? 'text-red-600'
                                      : 'text-emerald-600'
                                    : v.variacaoCx > 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {v.variacaoCx > 0 ? `+${v.variacaoCx}` : v.variacaoCx} cx
                              </span>
                            </div>
                            <div>
                              <span className="text-[7px] text-slate-500 font-extrabold block uppercase">Impacto</span>
                              <span
                                className={`text-[10px] font-black block leading-tight truncate ${
                                  isNegativeImpact
                                    ? 'text-red-700'
                                    : isPositiveImpact
                                    ? 'text-emerald-700'
                                    : 'text-slate-700'
                                }`}
                              >
                                {v.impactoFinanceiro === 0
                                  ? 'R$ 0'
                                  : `${isNegativeImpact ? '-' : '+'}R$ ${Math.abs(v.impactoFinanceiro).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                              </span>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="text-[7px] text-slate-400 font-bold block uppercase">Preço Tab. 7</span>
                            <span className="text-[9px] font-extrabold text-slate-900 block leading-tight">
                              R$ {v.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {/* Variação em Caixas */}
                          <div className="border-r border-slate-200 pr-1">
                            <span className="text-[10px] text-slate-500 font-extrabold block uppercase tracking-wide">
                              Variação
                            </span>
                            <span
                              className={`text-base font-black block mt-0.5 ${
                                v.variacaoCx === 0
                                  ? 'text-slate-600'
                                  : popup.isFalta
                                  ? v.variacaoCx > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                  : v.variacaoCx > 0
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {v.variacaoCx > 0 ? `+${v.variacaoCx}` : v.variacaoCx} cx
                            </span>
                            <span
                              className={`text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                                popup.isFalta ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {popup.isFalta ? 'Faltando' : 'Sobrando'}
                            </span>
                          </div>

                          {/* Impacto Financeiro da Variação */}
                          <div className="border-r border-slate-200 px-1">
                            <span className="text-[10px] text-slate-500 font-extrabold block uppercase tracking-wide">
                              Impacto (R$)
                            </span>
                            <span
                              className={`text-base font-black block mt-0.5 ${
                                isNegativeImpact
                                  ? 'text-red-700'
                                  : isPositiveImpact
                                  ? 'text-emerald-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              {v.impactoFinanceiro === 0
                                ? 'R$ 0,00'
                                : `${isNegativeImpact ? '-' : '+'}R$ ${Math.abs(v.impactoFinanceiro).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          </div>

                          {/* Preço Unitário por Caixa (Tabela 7) */}
                          <div className="pl-1">
                            <span className="text-[10px] text-slate-500 font-extrabold block uppercase tracking-wide">
                              Preço Tab. 7
                            </span>
                            <span className="text-xs font-black text-slate-900 block mt-1">
                              R$ {v.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comparativo Ontem vs Hoje detalhado */}
                  <div className={`border-b-2 border-slate-200 bg-white ${isCompact ? 'p-1.5 space-y-1' : 'p-3.5 space-y-2'}`}>
                    <div className={`font-extrabold text-slate-800 flex items-center justify-between ${
                      isCompact ? 'text-[9px]' : 'text-[11px]'
                    }`}>
                      <span>Ontem vs Hoje</span>
                      <span
                        className={`font-bold rounded border shadow-2xs whitespace-nowrap ${
                          isCompact ? 'text-[8px] px-1 py-0.2' : 'text-[10px] px-2.5 py-0.5'
                        }`}
                        style={{
                          backgroundColor: popup.analysis.bg,
                          color: popup.analysis.color,
                          borderColor: popup.analysis.color + '40',
                        }}
                      >
                        {popup.analysis.label}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 gap-1 bg-slate-50 rounded-lg border border-slate-200 ${
                      isCompact ? 'p-1' : 'p-2.5'
                    }`}>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-bold">Ontem:</span>
                        <span className={`font-extrabold text-slate-900 ${isCompact ? 'text-[10px]' : 'text-sm'}`}>{v.ontem} cx</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-slate-400 block font-bold">Hoje:</span>
                        <span className={`font-extrabold text-slate-900 ${isCompact ? 'text-[10px]' : 'text-sm'}`}>{v.hoje} cx</span>
                      </div>
                    </div>

                    {/* Referência do Saldo Total Acumulado */}
                    <div className={`flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200 truncate ${
                      isCompact ? 'text-[8px]' : 'text-[11px]'
                    }`}>
                      <span className="font-medium">Saldo Hoje:</span>
                      <span className="font-bold text-slate-800 truncate ml-1">
                        {popup.qtde} cx ({formatBRL(popup.valor)})
                      </span>
                    </div>
                  </div>

                  {/* Variação dos Últimos 5 Dias */}
                  {popup.last5Days && popup.last5Days.days && (
                    <div className={`border-b-2 border-slate-200 bg-white ${isCompact ? 'p-1.5' : 'p-3.5'}`}>
                      <div className={`flex items-center justify-between font-extrabold text-slate-800 mb-1 ${
                        isCompact ? 'text-[8px]' : 'text-[11px]'
                      }`}>
                        <span>Últimos 5 Dias</span>
                        <span className={`font-bold text-slate-600 bg-slate-100 rounded border border-slate-200 ${
                          isCompact ? 'text-[7px] px-1 py-0.2' : 'text-[10px] px-2 py-0.5'
                        }`}>
                          Méd: {popup.last5Days.avg}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-0.5 text-center">
                        {popup.last5Days.days.map((d, idx) => (
                          <div
                            key={idx}
                            className={`rounded border transition ${
                              isCompact ? 'p-0.5 text-[7px]' : 'p-1.5 text-[10px] border-2'
                            } ${
                              d.isToday
                                ? 'bg-purple-50 border-purple-500 font-black text-purple-950 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-800 font-bold'
                            }`}
                          >
                            <span className="block text-slate-400 font-bold leading-tight truncate">
                              {isCompact ? d.label.slice(0, 3) : d.label}
                            </span>
                            <span className={`block font-black leading-tight ${isCompact ? 'text-[8px] mt-0.5' : 'text-xs mt-0.5'}`}>
                              {d.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer timestamp */}
                  <div className={`bg-slate-50 text-slate-500 flex items-center justify-between mt-auto ${
                    isCompact ? 'p-1.5 text-[8px]' : 'p-2.5 text-[10px]'
                  }`}>
                    <span className="flex items-center gap-1 font-medium truncate">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{popup.savedAt}</span>
                    </span>
                    {popup.matched021101 && (
                      <span className="text-emerald-800 font-bold bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300 text-[8px] whitespace-nowrap">
                        {popup.matched021101.statusText}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
