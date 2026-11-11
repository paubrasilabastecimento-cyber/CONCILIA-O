import React from 'react';
import { 
  Boxes, 
  Layers, 
  Percent, 
  Tag, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';
import { ProdutoTabela07 } from '../types/tabela';

interface StatsBarProps {
  produtos: ProdutoTabela07[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ produtos }) => {
  const totalProdutos = produtos.length;
  
  const categoriasUnicas = Array.from(new Set(produtos.map((p) => p.categoria))).length;

  const precoMedio = totalProdutos > 0 
    ? produtos.reduce((acc, p) => acc + p.valorTabela, 0) / totalProdutos 
    : 0;

  const descontoMedioPercentual = totalProdutos > 0
    ? produtos.reduce((acc, p) => {
        const desc = ((p.valorTabela - p.valorMinimo) / p.valorTabela) * 100;
        return acc + desc;
      }, 0) / totalProdutos
    : 0;

  const itensComEtiqueta = produtos.filter((p) => p.regraComercial.includes('Com Etiqueta')).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-6">
      {/* Total Produtos */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
        <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
          <Boxes className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Itens na Tabela 07</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{totalProdutos}</span>
            <span className="text-xs text-slate-400">produtos</span>
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categorias</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{categoriasUnicas}</span>
            <span className="text-xs text-slate-400">segmentos</span>
          </div>
        </div>
      </div>

      {/* Preço Médio Tabela */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
        <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Preço Médio Tabela</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoMedio)}
            </span>
          </div>
        </div>
      </div>

      {/* Desconto Médio Permitido */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
          <Percent className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Flexibilidade / Margem</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">{descontoMedioPercentual.toFixed(1)}%</span>
            <span className="text-xs text-slate-400">desc. máx médio</span>
          </div>
        </div>
      </div>
    </div>
  );
};
