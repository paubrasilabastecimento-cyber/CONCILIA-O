import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  ShieldCheck, 
  TrendingUp, 
  ShoppingCart, 
  Building2, 
  Calculator,
  Percent,
  Check
} from 'lucide-react';
import { ProdutoTabela07 } from '../types/tabela';

interface ProductDetailModalProps {
  produto: ProdutoTabela07 | null;
  onClose: () => void;
  onAddToCart: (produto: ProdutoTabela07, qtd: number) => void;
  isInCart: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  produto,
  onClose,
  onAddToCart,
  isInCart,
}) => {
  if (!produto) return null;

  const [quantidade, setQuantidade] = useState<number>(1);
  const [precoRevendaLojista, setPrecoRevendaLojista] = useState<number>(
    produto.precoSugeridoVenda
  );

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const descontoMaximoReais = produto.valorTabela - produto.valorMinimo;
  const descontoMaximoPct = (descontoMaximoReais / produto.valorTabela) * 100;

  const precoPorUnidadeTabela = produto.fatorEmbalagem > 1 
    ? produto.valorTabela / produto.fatorEmbalagem 
    : produto.valorTabela;

  const precoPorUnidadeMinimo = produto.fatorEmbalagem > 1 
    ? produto.valorMinimo / produto.fatorEmbalagem 
    : produto.valorMinimo;

  const lucroLojista = precoRevendaLojista - produto.valorTabela;
  const margemLojistaPct = produto.valorTabela > 0 
    ? (lucroLojista / precoRevendaLojista) * 100 
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500 text-white uppercase tracking-wider">
                {produto.tabela}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Cód: #{produto.codigo}
              </span>
              <span className="text-xs text-slate-400">
                Grupo: {produto.codigoGrupo}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5 leading-snug">
              {produto.descricao}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Preço Tabela (Cheio)
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatMoney(produto.valorTabela)}
              </div>
              <span className="text-xs text-slate-500">
                {formatMoney(precoPorUnidadeTabela)} / unidade
              </span>
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Preço Mínimo
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  -{descontoMaximoPct.toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {formatMoney(produto.valorMinimo)}
              </div>
              <span className="text-xs text-emerald-800">
                Mín: {formatMoney(precoPorUnidadeMinimo)} / un
              </span>
            </div>

            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Sugerido Venda (PDV)
              </span>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {formatMoney(produto.precoSugeridoVenda)}
              </div>
              <span className="text-xs text-blue-700">
                Margem bruta estimada
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Embalagem</span>
              <strong className="text-slate-800 text-sm">
                {produto.unidadeVenda} ({produto.fatorEmbalagem} un)
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Categoria</span>
              <strong className="text-slate-800 text-sm">{produto.categoria}</strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Regra Comercial</span>
              <strong className="text-slate-800 text-sm">{produto.regraComercial}</strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Vigência</span>
              <strong className="text-slate-800 text-sm">{produto.dataVigencia}</strong>
            </div>
          </div>

          {/* Tax / Tributary Information */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Tributação & Fiscal
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">Alíquota ICMS:</span>
                <span className="font-bold text-slate-900">{produto.aliquotaIcms.toFixed(1)}%</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">ICMS ST:</span>
                <span className="font-bold text-slate-900">
                  {produto.aliquotaSt ? `${produto.aliquotaSt.toFixed(1)}%` : 'Isento'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block">FCP (Combate à Pobreza):</span>
                <span className="font-bold text-slate-900">
                  {produto.aliquotaFcp ? `${produto.aliquotaFcp.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Retail Margin Simulator for Buyer / Sales rep */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Simulador de Margem do Lojista / Cliente
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="text-[11px] text-slate-500 block mb-1">
                  Preço de Venda Praticado no PDV (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={precoRevendaLojista}
                  onChange={(e) => setPrecoRevendaLojista(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-white p-3 rounded-lg border border-indigo-100 flex items-center space-x-4 w-full sm:w-auto">
                <div>
                  <span className="text-[11px] text-slate-500 block">Lucro Bruto/emb</span>
                  <span className={`text-sm font-bold ${lucroLojista >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatMoney(lucroLojista)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Margem Comercial</span>
                  <span className={`text-sm font-bold ${margemLojistaPct >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                    {margemLojistaPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Add to Order */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-600">Quantidade:</span>
            <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-sm font-bold"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center text-xs font-semibold py-1 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + 1)}
                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 text-sm font-bold"
              >
                +
              </button>
            </div>
            <span className="text-xs text-slate-500">
              Total: {formatMoney(produto.valorTabela * quantidade)}
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                onAddToCart(produto, quantidade);
                onClose();
              }}
              className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              Adicionar ao Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
