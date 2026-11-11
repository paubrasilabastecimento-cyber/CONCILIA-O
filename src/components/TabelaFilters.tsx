import React from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  X,
  FileSpreadsheet
} from 'lucide-react';

export type ModoVisualizacao = 'comercial' | 'fiscal' | 'compacto';
export type CriterioOrdenacao = 'codigo-asc' | 'nome-asc' | 'preco-desc' | 'preco-asc' | 'desconto-desc';

interface TabelaFiltersProps {
  busca: string;
  onBuscaChange: (val: string) => void;
  categoriaSelecionada: string;
  onCategoriaChange: (cat: string) => void;
  categorias: string[];
  modoVisao: ModoVisualizacao;
  onModoVisaoChange: (modo: ModoVisualizacao) => void;
  ordenacao: CriterioOrdenacao;
  onOrdenacaoChange: (ord: CriterioOrdenacao) => void;
  unidadeSelecionada: string;
  onUnidadeChange: (und: string) => void;
  regraSelecionada: string;
  onRegraChange: (regra: string) => void;
  totalFiltrados: number;
  totalGeral: number;
  onLimparFiltros: () => void;
}

export const TabelaFilters: React.FC<TabelaFiltersProps> = ({
  busca,
  onBuscaChange,
  categoriaSelecionada,
  onCategoriaChange,
  categorias,
  modoVisao,
  onModoVisaoChange,
  ordenacao,
  onOrdenacaoChange,
  unidadeSelecionada,
  onUnidadeChange,
  regraSelecionada,
  onRegraChange,
  totalFiltrados,
  totalGeral,
  onLimparFiltros,
}) => {
  const unidades = ['Todas', 'CX', 'PACK', 'FD', 'UN'];
  const regras = [
    { label: 'Todas as Regras', value: 'Todas' },
    { label: 'Não cumulativo c/ etiqueta', value: 'Não cumulativo' },
    { label: 'Com Etiqueta', value: 'Com Etiqueta' },
  ];

  const temFiltroAtivo = busca !== '' || categoriaSelecionada !== 'Todas' || unidadeSelecionada !== 'Todas' || regraSelecionada !== 'Todas';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 mb-6">
      {/* Top search & View mode selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar por código (ex: 12053), descrição (ex: Brahma, Coca, Heineken, Vodka)..."
            className="block w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {busca && (
            <button
              onClick={() => onBuscaChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode & Sorter */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* View mode toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => onModoVisaoChange('comercial')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                modoVisao === 'comercial'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Comercial
            </button>
            <button
              type="button"
              onClick={() => onModoVisaoChange('fiscal')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                modoVisao === 'fiscal'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Visão Fiscal (ICMS/ST)
            </button>
            <button
              type="button"
              onClick={() => onModoVisaoChange('compacto')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                modoVisao === 'compacto'
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compacto
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={ordenacao}
              onChange={(e) => onOrdenacaoChange(e.target.value as CriterioOrdenacao)}
              className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="codigo-asc">Código (Crescente)</option>
              <option value="nome-asc">Descrição (A-Z)</option>
              <option value="preco-desc">Preço Tabela (Maior &gt; Menor)</option>
              <option value="preco-asc">Preço Tabela (Menor &gt; Maior)</option>
              <option value="desconto-desc">Maior Margem de Desconto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories quick pill bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mr-1">
          Categoria:
        </span>
        {categorias.map((cat) => {
          const isSelected = categoriaSelecionada === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoriaChange(cat)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Secondary filter chips (Unidade, Regra, Status de contagem) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          {/* Packaging Unit Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Embalagem:</span>
            <div className="inline-flex gap-1">
              {unidades.map((und) => (
                <button
                  key={und}
                  onClick={() => onUnidadeChange(und)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    unidadeSelecionada === und
                      ? 'bg-blue-100 text-blue-800 font-bold border border-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {und}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Regra Comercial:</span>
            <select
              value={regraSelecionada}
              onChange={(e) => onRegraChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
            >
              {regras.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter & Clear */}
        <div className="flex items-center space-x-3">
          <span className="text-slate-500">
            Exibindo <strong className="text-slate-900">{totalFiltrados}</strong> de {totalGeral} itens
          </span>

          {temFiltroAtivo && (
            <button
              onClick={onLimparFiltros}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
