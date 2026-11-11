import React, { useState, useMemo } from 'react';
import { RawData, CalculatedProduct, DashboardSnapshot } from '../data/types';
import { calculateProducts } from '../utils/calc';
import { formatBRL } from '../utils/formatters';
import { TrendingDown, TrendingUp, CheckCircle2, Scale, ArrowRight, Copy, Check } from 'lucide-react';

interface AnaliseViewProps {
  data: RawData;
  calculated: CalculatedProduct[];
  snapshots: DashboardSnapshot[];
}

export const AnaliseView: React.FC<AnaliseViewProps> = ({ data, calculated, snapshots }) => {
  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => b.timestamp - a.timestamp);
  }, [snapshots]);

  // Default: Before = 2nd most recent (index 1), After = most recent (index 0)
  const [beforeId, setBeforeId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>('');

  React.useEffect(() => {
    if (sortedSnapshots.length >= 2) {
      if (!beforeId || !sortedSnapshots.some(s => s.id === beforeId)) {
        setBeforeId(sortedSnapshots[1].id);
      }
      if (!afterId || !sortedSnapshots.some(s => s.id === afterId)) {
        setAfterId(sortedSnapshots[0].id);
      }
    } else if (sortedSnapshots.length === 1) {
      if (!beforeId || !sortedSnapshots.some(s => s.id === beforeId)) {
        setBeforeId(sortedSnapshots[0].id);
      }
      if (!afterId || !sortedSnapshots.some(s => s.id === afterId)) {
        setAfterId(sortedSnapshots[0].id);
      }
    }
  }, [sortedSnapshots, beforeId, afterId]);

  const [copied, setCopied] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'piorou' | 'melhorou' | 'sanado'>('all');

  const beforeSnapshot = useMemo(() => sortedSnapshots.find(s => s.id === beforeId) || sortedSnapshots[1] || sortedSnapshots[0], [sortedSnapshots, beforeId]);
  const afterSnapshot = useMemo(() => sortedSnapshots.find(s => s.id === afterId) || sortedSnapshots[0], [sortedSnapshots, afterId]);

  // Calculate products for before snapshot
  const beforeCalculated = useMemo(() => {
    if (!beforeSnapshot) return calculated;
    const snapData: RawData = {
      ...data,
      ec: beforeSnapshot.ec,
      res: beforeSnapshot.res || data.res,
    };
    return calculateProducts(snapData).C;
  }, [beforeSnapshot, data, calculated]);

  // Calculate products for after snapshot
  const afterCalculated = useMemo(() => {
    if (!afterSnapshot) return calculated;
    const snapData: RawData = {
      ...data,
      ec: afterSnapshot.ec,
      res: afterSnapshot.res || data.res,
    };
    return calculateProducts(snapData).C;
  }, [afterSnapshot, data, calculated]);

  // Analysis comparison product by product
  const comparison = useMemo(() => {
    const mapBefore = new Map<number, CalculatedProduct>();
    beforeCalculated.forEach(p => mapBefore.set(p.c, p));

    const mapAfter = new Map<number, CalculatedProduct>();
    afterCalculated.forEach(p => mapAfter.set(p.c, p));

    const allCodes = new Set([...mapBefore.keys(), ...mapAfter.keys()]);
    const items: Array<{
      c: number;
      d: string;
      t: string;
      caixaAntes: number; // R
      caixaDepois: number; // R
      deltaCaixas: number; // depois - antes
      valorAntes: number; // S
      valorDepois: number; // S
      deltaValores: number; // depois - antes
      status: 'piorou' | 'melhorou' | 'sanado' | 'neutro';
    }> = [];

    allCodes.forEach(code => {
      const b = mapBefore.get(code);
      const a = mapAfter.get(code);
      const desc = a?.d || b?.d || `Produto ${code}`;
      const tipo = a?.t || b?.t || 'cx';

      const caixaAntes = b ? b.R : 0;
      const caixaDepois = a ? a.R : 0;
      const deltaCaixas = caixaDepois - caixaAntes;

      const valorAntes = b ? b.S : 0;
      const valorDepois = a ? a.S : 0;
      const deltaValores = valorDepois - valorAntes;

      let status: 'piorou' | 'melhorou' | 'sanado' | 'neutro' = 'neutro';

      const hadDivergenceBefore = caixaAntes !== 0;
      const hasDivergenceAfter = caixaDepois !== 0;

      if (hadDivergenceBefore && !hasDivergenceAfter) {
        status = 'sanado';
      } else if (Math.abs(caixaDepois) < Math.abs(caixaAntes)) {
        status = 'melhorou';
      } else if (Math.abs(caixaDepois) > Math.abs(caixaAntes)) {
        status = 'piorou';
      } else if (deltaValores < 0 && caixaDepois < 0) {
        status = 'melhorou';
      } else if (deltaValores > 0 && caixaDepois < 0) {
        status = 'piorou';
      }

      items.push({
        c: code,
        d: desc,
        t: tipo,
        caixaAntes,
        caixaDepois,
        deltaCaixas,
        valorAntes,
        valorDepois,
        deltaValores,
        status,
      });
    });

    return items;
  }, [beforeCalculated, afterCalculated]);

  // Summary metrics
  const metrics = useMemo(() => {
    let pioraramCount = 0;
    let melhoraramCount = 0;
    let sanadosCount = 0;

    let deltaCaixasTotal = 0;
    let deltaValoresTotal = 0;
    let caixasPiorou = 0;
    let caixasMelhorou = 0;
    let valoresPiorou = 0;
    let valoresMelhorou = 0;

    comparison.forEach(item => {
      deltaCaixasTotal += item.deltaCaixas;
      deltaValoresTotal += item.deltaValores;

      if (item.status === 'piorou') {
        pioraramCount++;
        caixasPiorou += item.deltaCaixas;
        valoresPiorou += item.deltaValores;
      } else if (item.status === 'melhorou') {
        melhoraramCount++;
        caixasMelhorou += item.deltaCaixas;
        valoresMelhorou += item.deltaValores;
      } else if (item.status === 'sanado') {
        sanadosCount++;
        caixasMelhorou += item.deltaCaixas;
        valoresMelhorou += item.deltaValores;
      }
    });

    return {
      pioraramCount,
      melhoraramCount,
      sanadosCount,
      deltaCaixasTotal,
      deltaValoresTotal,
      caixasPiorou,
      caixasMelhorou,
      valoresPiorou,
      valoresMelhorou,
    };
  }, [comparison]);

  const filteredItems = useMemo(() => {
    if (filterStatus === 'all') return comparison;
    return comparison.filter(i => i.status === filterStatus);
  }, [comparison, filterStatus]);

  const handleCopyResumo = () => {
    const text = [
      `ANÁLISE DE CONCILIAÇÕES (${beforeSnapshot?.date ? beforeSnapshot.date.split('-').reverse().join('/') : 'Antes'} -> ${afterSnapshot?.date ? afterSnapshot.date.split('-').reverse().join('/') : 'Depois'})`,
      `Pioraram: ${metrics.pioraramCount} itens`,
      `Melhoraram: ${metrics.melhoraramCount} itens`,
      `Sanados: ${metrics.sanadosCount} itens`,
      `Variação Total em Caixas: ${metrics.deltaCaixasTotal > 0 ? '+' : ''}${metrics.deltaCaixasTotal} cx`,
      `Variação Total em Valores: ${formatBRL(metrics.deltaValoresTotal)}`,
      ``,
      `--- ITENS COM MAIOR ALTERAÇÃO ---`,
      ...comparison
        .filter(i => i.status !== 'neutro')
        .slice(0, 20)
        .map(i => `${i.c} - ${i.d}: Caixas ${i.caixaAntes} -> ${i.caixaDepois} (${i.deltaCaixas >= 0 ? '+' : ''}${i.deltaCaixas}cx) | Valor: ${formatBRL(i.valorAntes)} -> ${formatBRL(i.valorDepois)} (${formatBRL(i.deltaValores)}) [${i.status.toUpperCase()}]`)
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-6 bg-zinc-50 min-h-screen">
      <div className="flex justify-between items-end mb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Análise de Conciliações</h1>
          <div className="text-zinc-600 mt-1">Comparativo detalhado de caixas e valores entre os fechamentos selecionados</div>
        </div>
        <button 
          onClick={handleCopyResumo}
          className="flex items-center gap-2 bg-white border border-zinc-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          <span>{copied ? 'Copiado!' : 'Copiar resumo'}</span>
        </button>
      </div>

      {/* Seletores de Snapshot */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 mb-6 flex flex-wrap items-center gap-6 shadow-sm">
        <div className="flex flex-col gap-2 text-sm flex-1 min-w-[220px]">
          <label className="font-semibold text-zinc-500 uppercase text-xs">REFERÊNCIA (ANTES)</label>
          <select 
            className="border border-zinc-300 rounded-lg p-2.5 bg-zinc-50 font-medium"
            value={beforeId}
            onChange={(e) => setBeforeId(e.target.value)}
          >
            {sortedSnapshots.map(s => (
              <option key={s.id} value={s.id}>
                {s.date.split('-').reverse().join('/')} · {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center pt-5">
          <ArrowRight className="text-zinc-400" size={20} />
        </div>

        <div className="flex flex-col gap-2 text-sm flex-1 min-w-[220px]">
          <label className="font-semibold text-zinc-500 uppercase text-xs">COMPARAR COM (DEPOIS)</label>
          <select 
            className="border border-zinc-300 rounded-lg p-2.5 bg-zinc-50 font-medium"
            value={afterId}
            onChange={(e) => setAfterId(e.target.value)}
          >
            {sortedSnapshots.map(s => (
              <option key={s.id} value={s.id}>
                {s.date.split('-').reverse().join('/')} · {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs text-zinc-500 bg-zinc-100 px-3 py-2 rounded-lg border border-zinc-200">
          Analisando de <b className="text-zinc-800">{beforeSnapshot?.date ? beforeSnapshot.date.split('-').reverse().join('/') : 'N/A'}</b> para <b className="text-zinc-800">{afterSnapshot?.date ? afterSnapshot.date.split('-').reverse().join('/') : 'N/A'}</b>
        </div>
      </div>

      {/* Cards de Resumo (Pioraram, Melhoraram, Sanados, Saldo Líquido em Caixas e Valores) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          onClick={() => setFilterStatus(filterStatus === 'piorou' ? 'all' : 'piorou')}
          className={`bg-white p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${filterStatus === 'piorou' ? 'border-rose-500 ring-2 ring-rose-200' : 'border-zinc-200 hover:border-zinc-300'}`}
        >
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-rose-600 uppercase">Pioraram</div>
            <TrendingDown size={16} className="text-rose-600" />
          </div>
          <div className="text-3xl font-bold text-rose-700 mt-2">{metrics.pioraramCount} <span className="text-xs font-normal text-zinc-500">itens</span></div>
          <div className="mt-2 text-xs text-zinc-600 flex flex-col gap-0.5 pt-2 border-t border-zinc-100">
            <div>Caixas: <strong className="text-rose-700">{metrics.caixasPiorou} cx</strong></div>
            <div>Valor: <strong className="text-rose-700">{formatBRL(metrics.valoresPiorou)}</strong></div>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus(filterStatus === 'melhorou' ? 'all' : 'melhorou')}
          className={`bg-white p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${filterStatus === 'melhorou' ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-zinc-200 hover:border-zinc-300'}`}
        >
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-emerald-600 uppercase">Melhoraram</div>
            <TrendingUp size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-emerald-700 mt-2">{metrics.melhoraramCount} <span className="text-xs font-normal text-zinc-500">itens</span></div>
          <div className="mt-2 text-xs text-zinc-600 flex flex-col gap-0.5 pt-2 border-t border-zinc-100">
            <div>Caixas: <strong className="text-emerald-700">{metrics.caixasMelhorou} cx</strong></div>
            <div>Valor: <strong className="text-emerald-700">{formatBRL(metrics.valoresMelhorou)}</strong></div>
          </div>
        </div>

        <div 
          onClick={() => setFilterStatus(filterStatus === 'sanado' ? 'all' : 'sanado')}
          className={`bg-white p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${filterStatus === 'sanado' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200 hover:border-zinc-300'}`}
        >
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-blue-600 uppercase">Sanados (Zerados)</div>
            <CheckCircle2 size={16} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-blue-700 mt-2">{metrics.sanadosCount} <span className="text-xs font-normal text-zinc-500">itens</span></div>
          <div className="mt-2 text-xs text-zinc-600 flex flex-col gap-0.5 pt-2 border-t border-zinc-100">
            <div>Divergências eliminadas</div>
            <div>Totalmente regularizados</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="text-xs font-semibold text-zinc-600 uppercase">Saldo Líquido</div>
            <Scale size={16} className="text-zinc-600" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${metrics.deltaValoresTotal <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatBRL(metrics.deltaValoresTotal)}
          </div>
          <div className="mt-2 text-xs text-zinc-600 flex flex-col gap-0.5 pt-2 border-t border-zinc-100">
            <div>Variação Caixas: <strong className={metrics.deltaCaixasTotal <= 0 ? 'text-emerald-700' : 'text-rose-700'}>{metrics.deltaCaixasTotal > 0 ? `+${metrics.deltaCaixasTotal}` : metrics.deltaCaixasTotal} cx</strong></div>
            <div>{filterStatus !== 'all' ? `Filtro ativo: ${filterStatus}` : 'Todos os produtos analisados'}</div>
          </div>
        </div>
      </div>

      {/* Tabela detalhada produto a produto */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
          <div className="font-bold text-sm text-zinc-800">
            Detalhamento Produto a Produto ({filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'})
          </div>
          {filterStatus !== 'all' && (
            <button 
              onClick={() => setFilterStatus('all')}
              className="text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-3 py-1 rounded-md font-medium transition-colors"
            >
              Limpar Filtro ({filterStatus})
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-100 text-zinc-700 sticky top-0 z-10 font-semibold border-b border-zinc-200">
              <tr>
                <th className="p-3">Cód.</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-center">Caixas (Antes)</th>
                <th className="p-3 text-center">Caixas (Depois)</th>
                <th className="p-3 text-center">Δ Caixas</th>
                <th className="p-3 text-right">Valor (Antes)</th>
                <th className="p-3 text-right">Valor (Depois)</th>
                <th className="p-3 text-right">Δ Valor</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-500">
                    Nenhum produto encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isPositiveDelta = item.deltaValores > 0;
                  const isNegativeDelta = item.deltaValores < 0;

                  return (
                    <tr key={item.c} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-zinc-900">{item.c}</td>
                      <td className="p-3 font-medium text-zinc-800 max-w-xs truncate" title={item.d}>{item.d}</td>
                      <td className="p-3 text-center font-mono text-zinc-600">{item.caixaAntes} cx</td>
                      <td className="p-3 text-center font-mono text-zinc-800 font-bold">{item.caixaDepois} cx</td>
                      <td className={`p-3 text-center font-mono font-bold ${item.deltaCaixas === 0 ? 'text-zinc-500' : item.deltaCaixas < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.deltaCaixas > 0 ? `+${item.deltaCaixas}` : item.deltaCaixas} cx
                      </td>
                      <td className="p-3 text-right font-mono text-zinc-600">{formatBRL(item.valorAntes)}</td>
                      <td className="p-3 text-right font-mono text-zinc-800 font-bold">{formatBRL(item.valorDepois)}</td>
                      <td className={`p-3 text-right font-mono font-bold ${isPositiveDelta ? 'text-rose-600' : isNegativeDelta ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        {isPositiveDelta ? `+${formatBRL(item.deltaValores)}` : formatBRL(item.valorAntes === item.valorDepois ? 0 : item.deltaValores)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.status === 'sanado' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'melhorou' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'piorou' ? 'bg-rose-100 text-rose-800' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
