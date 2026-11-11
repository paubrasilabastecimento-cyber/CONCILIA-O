import React from 'react';
import { 
  Plus, 
  Info, 
  Check, 
  Tag, 
  Percent, 
  AlertCircle,
  Package
} from 'lucide-react';
import { ProdutoTabela07 } from '../types/tabela';
import { ModoVisualizacao } from './TabelaFilters';

interface TabelaGridProps {
  produtos: ProdutoTabela07[];
  modoVisao: ModoVisualizacao;
  onSelectProduto: (produto: ProdutoTabela07) => void;
  onAddToCart: (produto: ProdutoTabela07, qtd?: number) => void;
  cartItemIds: Set<string>;
}

export const TabelaGrid: React.FC<TabelaGridProps> = ({
  produtos,
  modoVisao,
  onSelectProduto,
  onAddToCart,
  cartItemIds,
}) => {
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  if (produtos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Nenhum produto encontrado</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Não localizamos nenhum item na Tabela 07 com os filtros aplicados. Tente ajustar o termo de busca ou limpar os filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-24">Código</th>
              <th className="py-3 px-4 min-w-[280px]">Descrição da Mercadoria</th>
              <th className="py-3 px-4 w-28">Embalagem</th>
              
              {modoVisao === 'fiscal' ? (
                <>
                  <th className="py-3 px-4 text-right">Valor Tabela</th>
                  <th className="py-3 px-4 text-center">ICMS</th>
                  <th className="py-3 px-4 text-center">ICMS ST</th>
                  <th className="py-3 px-4 text-center">FCP</th>
                  <th className="py-3 px-4">Regra Comercial</th>
                </>
              ) : modoVisao === 'compacto' ? (
                <>
                  <th className="py-3 px-4 text-right">Valor Tabela</th>
                  <th className="py-3 px-4 text-right">Valor Mínimo</th>
                  <th className="py-3 px-4 text-center">Desc. Máx</th>
                </>
              ) : (
                <>
                  <th className="py-3 px-4 text-right">Valor Tabela</th>
                  <th className="py-3 px-4 text-right">Valor Mínimo</th>
                  <th className="py-3 px-4 text-center">Desc. Máx</th>
                  <th className="py-3 px-4 text-right">Sugerido Venda</th>
                  <th className="py-3 px-4">Regra</th>
                </>
              )}
              
              <th className="py-3 px-4 text-center w-28">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {produtos.map((produto) => {
              const descontoMax = ((produto.valorTabela - produto.valorMinimo) / produto.valorTabela) * 100;
              const precoPorUnidade = produto.fatorEmbalagem > 1 
                ? produto.valorTabela / produto.fatorEmbalagem 
                : null;
              const isInCart = cartItemIds.has(produto.codigo);

              return (
                <tr 
                  key={produto.codigo}
                  className="hover:bg-blue-50/40 transition-colors group"
                >
                  {/* Código */}
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-700">
                    {produto.codigo}
                  </td>

                  {/* Descrição & Categoria */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <button
                        onClick={() => onSelectProduto(produto)}
                        className="text-left font-medium text-slate-900 group-hover:text-blue-600 transition-colors hover:underline text-sm leading-tight"
                      >
                        {produto.descricao}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-medium">
                          {produto.categoria}
                        </span>
                        {precoPorUnidade && (
                          <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            ~{formatMoney(precoPorUnidade)}/un
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Embalagem */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {produto.unidadeVenda} {produto.fatorEmbalagem > 1 ? `(${produto.fatorEmbalagem})` : ''}
                    </span>
                  </td>

                  {/* Columns based on View Mode */}
                  {modoVisao === 'fiscal' ? (
                    <>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatMoney(produto.valorTabela)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-600">
                        {produto.aliquotaIcms.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-600">
                        {produto.aliquotaSt ? `${produto.aliquotaSt.toFixed(1)}%` : 'Isento'}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-medium text-slate-600">
                        {produto.aliquotaFcp ? `${produto.aliquotaFcp.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          produto.regraComercial.includes('Com Etiqueta')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-50 text-slate-600'
                        }`}>
                          {produto.regraComercial}
                        </span>
                      </td>
                    </>
                  ) : modoVisao === 'compacto' ? (
                    <>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {formatMoney(produto.valorTabela)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                        {formatMoney(produto.valorMinimo)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs font-semibold text-amber-600">
                        {descontoMax.toFixed(1)}%
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Valor Tabela */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatMoney(produto.valorTabela)}
                      </td>

                      {/* Valor Mínimo */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                        {formatMoney(produto.valorMinimo)}
                      </td>

                      {/* Desconto Máx Permitido */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {descontoMax.toFixed(1)}%
                        </span>
                      </td>

                      {/* Preço Sugerido Venda */}
                      <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                        {formatMoney(produto.precoSugeridoVenda)}
                      </td>

                      {/* Regra */}
                      <td className="py-3.5 px-4 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          produto.regraComercial.includes('Com Etiqueta')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold'
                            : 'bg-slate-50 text-slate-600'
                        }`}>
                          {produto.regraComercial}
                        </span>
                      </td>
                    </>
                  )}

                  {/* Ações */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => onSelectProduto(produto)}
                        title="Ver detalhes do item"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onAddToCart(produto)}
                        title={isInCart ? 'Adicionar mais ao pedido' : 'Adicionar ao pedido'}
                        className={`p-1.5 rounded transition-all flex items-center justify-center ${
                          isInCart
                            ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200'
                        }`}
                      >
                        {isInCart ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Summary info */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Tabela 07 (Folha):</span>
          <span>Preços sujeitos a alteração conforme vigência e política da distribuidora.</span>
        </div>
        <div>
          <span>Valores em Real Brasileiro (R$)</span>
        </div>
      </div>
    </div>
  );
};
