import React, { useState, useMemo } from 'react';
import { RawData, CalculatedProduct, ResRow } from '../data/types';
import { N, Rt, RenderMoney, formatBRL } from '../utils/formatters';
import { 
  X, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Boxes,
  DollarSign
} from 'lucide-react';

export interface AuditItem {
  c: number;
  d: string;
  t: string;
  tipoItem: 'falta' | 'sobra';
  status: 'laranja' | 'vermelho';
  diffCx: number; // divergência absoluta em caixas

  // Dia anterior
  ontemQtde: number;
  ontemValor: number;

  // Hoje
  hojeQtde: number;
  hojeValor: number;

  // Variação
  deltaQtde: number; // hojeQtde - ontemQtde
  deltaValor: number; // hojeValor - ontemValor
  direcao: 'aumentou' | 'diminuiu' | 'estavel';

  // Decomposição de Preço e Estoque
  precoCx: number;
  precoUnid: number;
  fatorCx: number;
  
  promaxUnid: number;
  promaxCx: number;
  promaxValor: number;

  invUnid: number;
  invCx: number;
  invValor: number;
  contagemBaseUnid: number;

  // Ajustes
  pncAvarias: number;
  sobrasAjuste: number;
  repack: number;
  faltasMapeadas: number;

  // Texto explicativo do diagnóstico
  diagnostico: string;
}

interface AnaliseDivergenciasModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RawData;
  calculated: CalculatedProduct[];
  initialFilter?: 'all' | 'vermelho' | 'laranja';
  initialCode?: number | null;
}

export const AnaliseDivergenciasModal: React.FC<AnaliseDivergenciasModalProps> = ({
  isOpen,
  onClose,
  data,
  calculated,
  initialFilter = 'all',
  initialCode = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'vermelho' | 'laranja' | 'falta_aumentou' | 'falta_diminuiu' | 'sobra_aumentou' | 'sobra_diminuiu' | 'todas_divergencias'
  >(initialFilter);
  const [expandedItem, setExpandedItem] = useState<number | null>(initialCode);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter);
    }
  }, [initialFilter]);

  React.useEffect(() => {
    if (initialCode) {
      setExpandedItem(initialCode);
      setSearchTerm('');
    }
  }, [initialCode]);

  // Mapeamentos
  const diaMap = useMemo(() => {
    const map: Record<number, { eq: number; gq: number }> = {};
    data.dia.forEach(([cod, eq, gq]) => {
      map[cod] = { eq, gq };
    });
    return map;
  }, [data.dia]);

  const resMap = useMemo(() => {
    const map: Record<number, ResRow> = {};
    data.res.forEach((r) => {
      map[r[0]] = r;
    });
    return map;
  }, [data.res]);

  const calculatedMap = useMemo(() => {
    const map: Record<number, CalculatedProduct> = {};
    calculated.forEach((r) => {
      map[r.c] = r;
    });
    return map;
  }, [calculated]);

  // Construção de todos os itens com auditoria minuciosa
  const auditItems = useMemo<AuditItem[]>(() => {
    const list: AuditItem[] = [];

    calculated.forEach((r) => {
      const code = r.c;
      const prevEntry = diaMap[code];
      const prevDiff = prevEntry ? prevEntry.eq : 0;
      const res = resMap[code];

      // r.R é a diferença atual em caixas (K - H)
      // Se r.R < 0 é Falta | Se r.R > 0 é Sobra
      const currentDiff = r.R;

      // 1. ANÁLISE DE FALTAS (quando há falta hoje ou havia falta ontem)
      if (currentDiff < 0 || prevDiff < 0) {
        const hojeFalta = Math.abs(currentDiff < 0 ? currentDiff : 0);
        const ontemFalta = Math.abs(prevDiff < 0 ? prevDiff : 0);
        const diff = Math.abs(hojeFalta - ontemFalta);

        // Apenas Laranja (2 a 3 cx) e Vermelho (>= 4 cx)
        if (diff >= 2) {
          const status = diff >= 4 ? 'vermelho' : 'laranja';
          const deltaQtde = hojeFalta - ontemFalta;
          const precoCx = r.U || 0;
          const precoUnid = r.W || 0;
          const fatorCx = r.V || 1;

          const hojeValor = hojeFalta * precoCx;
          const ontemValor = ontemFalta * precoCx;
          const deltaValor = hojeValor - ontemValor;

          const direcao = deltaQtde > 0 ? 'aumentou' : deltaQtde < 0 ? 'diminuiu' : 'estavel';

          // Monta o diagnóstico detalhado de onde veio cada real
          let diagnostico = '';
          if (direcao === 'aumentou') {
            diagnostico = `A falta aumentou em +${deltaQtde} caixas de ontem para hoje (+R$ ${formatBRL(deltaValor)}). Cada 1 caixa deste produto custa R$ ${formatBRL(precoCx)} (R$ ${formatBRL(precoUnid)} por unidade). Essa divergência foi gerada pela diferença entre o saldo no Promax (${r.H} cx / ${r.G} un) e a contagem física (${r.K} cx / ${r.J} un).`;
          } else {
            diagnostico = `A falta reduziu em ${Math.abs(deltaQtde)} caixas de ontem para hoje (-R$ ${formatBRL(Math.abs(deltaValor))}), gerando recuperação financeira no estoque. Cada 1 caixa custa R$ ${formatBRL(precoCx)}.`;
          }

          if (r.N > 0) {
            diagnostico += ` Existem ${r.N} unidades registradas em Avarias/PNC (R$ ${formatBRL(r.N * precoUnid)}).`;
          }
          if (r.M > 0) {
            diagnostico += ` Existem ${r.M} unidades em Sobras compensadas.`;
          }

          list.push({
            c: code,
            d: r.d,
            t: r.t,
            tipoItem: 'falta',
            status,
            diffCx: diff,
            ontemQtde: ontemFalta,
            ontemValor,
            hojeQtde: hojeFalta,
            hojeValor,
            deltaQtde,
            deltaValor,
            direcao,
            precoCx,
            precoUnid,
            fatorCx,
            promaxUnid: r.G,
            promaxCx: r.H,
            promaxValor: r.I,
            invUnid: r.J,
            invCx: r.K,
            invValor: r.L,
            contagemBaseUnid: res ? res[7] : 0,
            pncAvarias: r.N,
            sobrasAjuste: r.M,
            repack: r.P,
            faltasMapeadas: r.O,
            diagnostico,
          });
        }
      }

      // 2. ANÁLISE DE SOBRAS (quando há sobra hoje ou havia sobra ontem)
      if (currentDiff > 0 || prevDiff > 0) {
        const hojeSobra = Math.max(0, currentDiff);
        const ontemSobra = Math.max(0, prevDiff);
        const diff = Math.abs(hojeSobra - ontemSobra);

        // Apenas Laranja (2 a 3 cx) e Vermelho (>= 4 cx)
        if (diff >= 2) {
          const status = diff >= 4 ? 'vermelho' : 'laranja';
          const deltaQtde = hojeSobra - ontemSobra;
          const precoCx = r.U || 0;
          const precoUnid = r.W || 0;
          const fatorCx = r.V || 1;

          const hojeValor = hojeSobra * precoCx;
          const ontemValor = ontemSobra * precoCx;
          const deltaValor = hojeValor - ontemValor;

          const direcao = deltaQtde > 0 ? 'aumentou' : deltaQtde < 0 ? 'diminuiu' : 'estavel';

          let diagnostico = '';
          if (direcao === 'aumentou') {
            diagnostico = `A sobra aumentou em +${deltaQtde} caixas (+R$ ${formatBRL(deltaValor)}). Cada 1 caixa custa R$ ${formatBRL(precoCx)} (R$ ${formatBRL(precoUnid)} por unidade). Há mais estoque físico contado no armazém (${r.K} cx) do que o registrado no sistema Promax (${r.H} cx).`;
          } else {
            diagnostico = `A sobra reduziu em ${Math.abs(deltaQtde)} caixas (-R$ ${formatBRL(Math.abs(deltaValor))}), aproximando o físico do sistema Promax.`;
          }

          list.push({
            c: code,
            d: r.d,
            t: r.t,
            tipoItem: 'sobra',
            status,
            diffCx: diff,
            ontemQtde: ontemSobra,
            ontemValor,
            hojeQtde: hojeSobra,
            hojeValor,
            deltaQtde,
            deltaValor,
            direcao,
            precoCx,
            precoUnid,
            fatorCx,
            promaxUnid: r.G,
            promaxCx: r.H,
            promaxValor: r.I,
            invUnid: r.J,
            invCx: r.K,
            invValor: r.L,
            contagemBaseUnid: res ? res[7] : 0,
            pncAvarias: r.N,
            sobrasAjuste: r.M,
            repack: r.P,
            faltasMapeadas: r.O,
            diagnostico,
          });
        }
      }
    });

    // Ordena pelos de maior divergência em valor financeiro absoluto
    return list.sort((a, b) => Math.abs(b.deltaValor) - Math.abs(a.deltaValor));
  }, [calculated, diaMap, resMap]);

  // Estatísticas de auditoria
  const stats = useMemo(() => {
    const totalItens = auditItems.length;
    const vermelhos = auditItems.filter((it) => it.status === 'vermelho').length;
    const laranjas = auditItems.filter((it) => it.status === 'laranja').length;

    const faltasAumentaram = auditItems.filter((it) => it.tipoItem === 'falta' && it.direcao === 'aumentou');
    const faltasDiminuiram = auditItems.filter((it) => it.tipoItem === 'falta' && it.direcao === 'diminuiu');

    const sobrasAumentaram = auditItems.filter((it) => it.tipoItem === 'sobra' && it.direcao === 'aumentou');
    const sobrasDiminuiram = auditItems.filter((it) => it.tipoItem === 'sobra' && it.direcao === 'diminuiu');

    const totalDeltaValorFaltas = auditItems
      .filter((it) => it.tipoItem === 'falta')
      .reduce((acc, it) => acc + it.deltaValor, 0);

    const totalDeltaValorSobras = auditItems
      .filter((it) => it.tipoItem === 'sobra')
      .reduce((acc, it) => acc + it.deltaValor, 0);

    return {
      totalItens,
      vermelhos,
      laranjas,
      faltasAumentaramCount: faltasAumentaram.length,
      faltasDiminuiramCount: faltasDiminuiram.length,
      sobrasAumentaramCount: sobrasAumentaram.length,
      sobrasDiminuiramCount: sobrasDiminuiram.length,
      totalDeltaValorFaltas,
      totalDeltaValorSobras,
    };
  }, [auditItems]);

  // Filtro
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return auditItems.filter((item) => {
      if (q && !(item.c + ' ' + item.d).toLowerCase().includes(q)) return false;

      if (filterType === 'vermelho' && item.status !== 'vermelho') return false;
      if (filterType === 'laranja' && item.status !== 'laranja') return false;
      if (filterType === 'falta_aumentou' && !(item.tipoItem === 'falta' && item.direcao === 'aumentou')) return false;
      if (filterType === 'falta_diminuiu' && !(item.tipoItem === 'falta' && item.direcao === 'diminuiu')) return false;
      if (filterType === 'sobra_aumentou' && !(item.tipoItem === 'sobra' && item.direcao === 'aumentou')) return false;
      if (filterType === 'sobra_diminuiu' && !(item.tipoItem === 'sobra' && item.direcao === 'diminuiu')) return false;

      return true;
    });
  }, [auditItems, searchTerm, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-black">
              🔍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  Auditoria Minuciosa de Divergências: Laranjas & Vermelhos
                </h3>
                <span className="text-[11px] font-semibold bg-amber-400 text-zinc-950 px-2 py-0.5 rounded-full">
                  Dia Anterior vs Hoje
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Rastreabilidade exata de quantidade e valor R$ de onde veio cada real de divergência
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo Financeiro da Divergência */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <div className="text-zinc-500 text-[11px] font-medium">Total de Itens com Divergência</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-0.5">
              <span>{stats.totalItens} itens</span>
              <span className="text-xs font-normal text-zinc-500">
                (🔴 {stats.vermelhos} | 🟠 {stats.laranjas})
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <div className="text-zinc-500 text-[11px] font-medium">Faltas que Aumentaram</div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-4 h-4" />
              <span>{stats.faltasAumentaramCount} produtos</span>
            </div>
            <div className="text-[10px] text-zinc-500">
              Variação: +R$ {formatBRL(stats.totalDeltaValorFaltas > 0 ? stats.totalDeltaValorFaltas : 0)}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <div className="text-zinc-500 text-[11px] font-medium">Faltas que Diminuíram (Melhorou)</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingDown className="w-4 h-4" />
              <span>{stats.faltasDiminuiramCount} produtos</span>
            </div>
            <div className="text-[10px] text-zinc-500">Recuperação de saldo físico</div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            <div className="text-zinc-500 text-[11px] font-medium">Sobras em Divergência</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
              <Boxes className="w-4 h-4" />
              <span>{stats.sobrasAumentaramCount + stats.sobrasDiminuiramCount} produtos</span>
            </div>
            <div className="text-[10px] text-zinc-500">
              {stats.sobrasAumentaramCount} aumentaram | {stats.sobrasDiminuiramCount} reduziram
            </div>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-zinc-900">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[11px] font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded transition ${
                filterType === 'all'
                  ? 'bg-zinc-900 text-white font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              Todos ({auditItems.length})
            </button>
            <button
              onClick={() => setFilterType('vermelho')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'vermelho'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>🔴</span>
              <span>Críticos ≥ 4 cx ({stats.vermelhos})</span>
            </button>
            <button
              onClick={() => setFilterType('laranja')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'laranja'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>🟠</span>
              <span>Alertas 2 a 3 cx ({stats.laranjas})</span>
            </button>
            <button
              onClick={() => setFilterType('falta_aumentou')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'falta_aumentou'
                  ? 'bg-rose-700 text-white font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <span>📈 Falta Aumentou ({stats.faltasAumentaramCount})</span>
            </button>
            <button
              onClick={() => setFilterType('falta_diminuiu')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'falta_diminuiu'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <span>📉 Falta Diminuiu ({stats.faltasDiminuiramCount})</span>
            </button>
            <button
              onClick={() => setFilterType('sobra_aumentou')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'sobra_aumentou'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <span>📈 Sobra Aumentou ({stats.sobrasAumentaramCount})</span>
            </button>
            <button
              onClick={() => setFilterType('sobra_diminuiu')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                filterType === 'sobra_diminuiu'
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <span>📉 Sobra Diminuiu ({stats.sobrasDiminuiramCount})</span>
            </button>
            <button
              onClick={() => {
                const lines = [
                  `=== AUDITORIA DE DIVERGÊNCIAS: FALTAS E SOBRAS ===`,
                  `Itens auditados: ${filtered.length}`,
                  '',
                  ...filtered.map((item) =>
                    `• COD ${item.c} - ${item.d} (${item.tipoItem.toUpperCase()} ${item.status.toUpperCase()})
  - Ontem: ${item.ontemQtde} cx (R$ ${formatBRL(item.ontemValor)})
  - Hoje: ${item.hojeQtde} cx (R$ ${formatBRL(item.hojeValor)})
  - Variação: ${item.deltaQtde > 0 ? '+' : ''}${item.deltaQtde} cx (${item.direcao.toUpperCase()}) | ${item.deltaValor > 0 ? '+' : ''}R$ ${formatBRL(item.deltaValor)}
  - Diagnóstico: ${item.diagnostico}`
                  ),
                ];
                navigator.clipboard.writeText(lines.join('\n\n'));
                setCopyFeedback('Relatório copiado!');
                setTimeout(() => setCopyFeedback(null), 3000);
              }}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold transition flex items-center gap-1 ml-auto"
              title="Copiar relatório completo da auditoria para a área de transferência"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{copyFeedback || 'Copiar Relatório'}</span>
            </button>
          </div>
        </div>

        {/* Tabela de Auditoria Minuciosa */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Nenhum item divergente encontrado com os filtros selecionados.
            </div>
          ) : (
            filtered.map((it) => {
              const isExpanded = expandedItem === it.c;
              const isFalta = it.tipoItem === 'falta';

              return (
                <div
                  key={`${it.c}-${it.tipoItem}`}
                  className={`border rounded-lg transition-all ${
                    it.status === 'vermelho'
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                      : 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20'
                  }`}
                >
                  {/* Linha Principal do Item */}
                  <div
                    onClick={() => setExpandedItem(isExpanded ? null : it.c)}
                    className="p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-white/60 transition"
                  >
                    {/* Identificação do Produto */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-2 py-1 rounded font-mono font-bold text-xs ${
                          it.status === 'vermelho'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-zinc-950'
                        }`}
                      >
                        {it.c}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <span>{it.d}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">({it.t})</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isFalta
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {isFalta ? 'FALTA' : 'SOBRA'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-3 mt-0.5">
                          <span>Preço Cx: <b>R$ {formatBRL(it.precoCx)}</b></span>
                          <span>•</span>
                          <span>Preço Un: <b>R$ {formatBRL(it.precoUnid)}</b></span>
                          <span>•</span>
                          <span>Fator: <b>{it.fatorCx} un/cx</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Comparativo: Ontem vs Hoje vs Diferença */}
                    <div className="flex items-center gap-6 text-xs w-full md:w-auto justify-between md:justify-end">
                      {/* Ontem */}
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400 font-medium">DIA ANTERIOR</div>
                        <div className="font-bold font-mono text-zinc-700 dark:text-zinc-300">
                          {N(it.ontemQtde)} cx
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          R$ {formatBRL(it.ontemValor)}
                        </div>
                      </div>

                      <div className="text-zinc-300">→</div>

                      {/* Hoje */}
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400 font-medium">HOJE (ATUAL)</div>
                        <div className="font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {N(it.hojeQtde)} cx
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          R$ {formatBRL(it.hojeValor)}
                        </div>
                      </div>

                      {/* Variação de um dia para o outro */}
                      <div
                        className={`text-right px-2.5 py-1 rounded-md border ${
                          it.status === 'vermelho'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                          {it.direcao === 'aumentou' ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-rose-600" />
                              <span>{isFalta ? 'Falta Aumentou' : 'Sobra Aumentou'}</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 text-emerald-600" />
                              <span>{isFalta ? 'Falta Diminuiu' : 'Sobra Diminuiu'}</span>
                            </>
                          )}
                        </div>
                        <div className="font-black font-mono text-sm">
                          {it.deltaQtde > 0 ? `+${it.deltaQtde}` : it.deltaQtde} cx
                        </div>
                        <div className="text-[11px] font-bold font-mono">
                          {it.deltaValor > 0 ? `+R$ ${formatBRL(it.deltaValor)}` : `R$ ${formatBRL(it.deltaValor)}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Decomposição Minuciosa Expansível: De onde veio cada real */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-white dark:bg-zinc-800/90 border-t border-zinc-200 dark:border-zinc-700/80 rounded-b-lg space-y-3 text-xs">
                      {/* Explicação Textual Clara */}
                      <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md text-amber-950 dark:text-amber-200 leading-relaxed text-[11.5px]">
                        <b>🔎 De onde veio a divergência de {it.deltaValor > 0 ? `+R$ ${formatBRL(it.deltaValor)}` : `R$ ${formatBRL(it.deltaValor)}`}?</b>
                        <p className="mt-1">{it.diagnostico}</p>
                      </div>

                      {/* Decomposição do Cálculo Matemático */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Fórmula e Preços */}
                        <div className="border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                          <span className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                            1. Fator & Valor Unitário
                          </span>
                          <div className="space-y-1 text-[11px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Preço da Caixa:</span>
                              <span className="font-bold">R$ {formatBRL(it.precoCx)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Fator de Conversão:</span>
                              <span>{it.fatorCx} un/cx</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Preço por Unidade:</span>
                              <span className="font-bold text-amber-600">R$ {formatBRL(it.precoUnid)}</span>
                            </div>
                            <div className="pt-1 border-t border-zinc-200 text-[10px] text-zinc-500">
                              Cálculo exato: <b>{Math.abs(it.deltaQtde)} cx × R$ {formatBRL(it.precoCx)} = R$ {formatBRL(Math.abs(it.deltaValor))}</b>
                            </div>
                          </div>
                        </div>

                        {/* Sistema Promax vs Físico */}
                        <div className="border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                          <span className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                            2. Estoque no Sistema vs Físico
                          </span>
                          <div className="space-y-1 text-[11px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Disponível Promax:</span>
                              <span>{it.promaxUnid} un (<b>{it.promaxCx} cx</b>)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Valor Promax:</span>
                              <span>R$ {formatBRL(it.promaxValor)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Inventário Físico:</span>
                              <span className="font-bold">{it.invUnid} un (<b>{it.invCx} cx</b>)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Valor Inventário:</span>
                              <span>R$ {formatBRL(it.invValor)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ajustes Registrados */}
                        <div className="border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                          <span className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                            3. Impacto dos Ajustes
                          </span>
                          <div className="space-y-1 text-[11px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Contagem Base Depósito:</span>
                              <span>{it.contagemBaseUnid} un</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Avarias / PNC (+):</span>
                              <span className={it.pncAvarias > 0 ? 'text-amber-600 font-bold' : ''}>
                                {it.pncAvarias} un
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Sobras Compensadas (-):</span>
                              <span>{it.sobrasAjuste} un</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Repack / Faltas (+):</span>
                              <span>{it.repack + it.faltasMapeadas} un</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Dica e Ação */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Exibindo <b>{filtered.length}</b> itens com divergência em caixas e reais auditados minuciosamente.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-md transition text-xs"
          >
            Fechar Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};
