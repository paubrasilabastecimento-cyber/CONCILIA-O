import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Printer, 
  Share2, 
  FileText,
  Percent,
  Plus,
  Minus
} from 'lucide-react';
import { ItemPedido } from '../types/tabela';
import { TABELA_07_INFO } from '../data/tabela07Data';

interface OrderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemPedido[];
  onUpdateQuantity: (codigo: string, quantidade: number) => void;
  onUpdatePreco: (codigo: string, novoPreco: number) => void;
  onRemoveItem: (codigo: string) => void;
  onClearOrder: () => void;
}

export const OrderDrawer: React.FC<OrderDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onUpdatePreco,
  onRemoveItem,
  onClearOrder,
}) => {
  const [nomeCliente, setNomeCliente] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('À Vista / PIX');
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const totalBruto = items.reduce(
    (acc, it) => acc + it.produto.valorTabela * it.quantidade,
    0
  );

  const totalLiquido = items.reduce(
    (acc, it) => acc + it.precoUnitarioAplicado * it.quantidade,
    0
  );

  const totalDesconto = totalBruto - totalLiquido;
  const descontoGeralPct = totalBruto > 0 ? (totalDesconto / totalBruto) * 100 : 0;

  const itensAbaixoDoMinimo = items.filter(
    (it) => it.precoUnitarioAplicado < it.produto.valorMinimo
  );

  const copiarPedidoWhatsApp = () => {
    let msg = `*ORÇAMENTO - TABELA 07 (FOLHA)*\n`;
    msg += `Data/Vigência: ${TABELA_07_INFO.vigencia}\n`;
    if (nomeCliente) msg += `Cliente: ${nomeCliente}\n`;
    msg += `Condição: ${condicaoPagamento}\n`;
    msg += `------------------------------------\n`;

    items.forEach((it, idx) => {
      msg += `${idx + 1}. [${it.produto.codigo}] ${it.produto.descricao}\n`;
      msg += `   ${it.quantidade}x ${it.produto.unidadeVenda} @ ${formatMoney(it.precoUnitarioAplicado)} = ${formatMoney(it.precoUnitarioAplicado * it.quantidade)}\n`;
    });

    msg += `------------------------------------\n`;
    msg += `*Total Bruto:* ${formatMoney(totalBruto)}\n`;
    if (totalDesconto > 0) {
      msg += `*Desconto Total:* ${formatMoney(totalDesconto)} (${descontoGeralPct.toFixed(1)}%)\n`;
    }
    msg += `*TOTAL LÍQUIDO:* ${formatMoney(totalLiquido)}\n`;
    msg += `------------------------------------\n`;
    msg += `_Valores calculados com base na Tabela 07 Padrão._`;

    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500 text-white uppercase">
                Tabela 07
              </span>
              <span className="text-xs text-slate-300">Simulador de Pedido</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Pedido de Venda / Orçamento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Condition inputs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Nome do Cliente / Razão Social:</label>
            <input
              type="text"
              placeholder="Ex: Bar do João / Mercado Central"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-500 font-medium mb-1">Condição de Pagamento:</label>
            <select
              value={condicaoPagamento}
              onChange={(e) => setCondicaoPagamento(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="À Vista / PIX">À Vista / PIX (Preço Tabela 07)</option>
              <option value="Boleto 7 Dias">Boleto 7 Dias</option>
              <option value="Boleto 14/21/28 Dias">Boleto 14/21/28 Dias</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
            </select>
          </div>
        </div>

        {/* Minimum price warning alert if applicable */}
        {itensAbaixoDoMinimo.length > 0 && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">
                Atenção: {itensAbaixoDoMinimo.length} item(ns) abaixo do valor mínimo da Tabela 07!
              </p>
              <p className="text-rose-700 mt-0.5">
                Vendas com preços inferiores ao mínimo exigem liberação ou alçada de gerência comercial.
              </p>
            </div>
          </div>
        )}

        {/* Order Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Nenhum produto adicionado ao pedido</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Clique no botão &quot;+&quot; ao lado de qualquer item na Tabela 07 para incluir neste orçamento.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isAbaixoDoMinimo = item.precoUnitarioAplicado < item.produto.valorMinimo;
              const subtotalItem = item.precoUnitarioAplicado * item.quantidade;

              return (
                <div
                  key={item.produto.codigo}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isAbaixoDoMinimo 
                      ? 'bg-rose-50/40 border-rose-200' 
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        #{item.produto.codigo}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1">
                        {item.produto.descricao}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tabela: {formatMoney(item.produto.valorTabela)} | Mínimo: {formatMoney(item.produto.valorMinimo)}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.produto.codigo)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity & Negotiated Unit Price Controls */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {/* Quantity controls */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[11px]">Qtd ({item.produto.unidadeVenda}):</span>
                      <div className="flex items-center border border-slate-200 rounded-md bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.produto.codigo, item.quantidade - 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-semibold text-slate-900 min-w-6 text-center">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.produto.codigo, item.quantidade + 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Unit Price Input */}
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 text-[11px]">Preço Un:</span>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-1.5 flex items-center text-[10px] text-slate-400">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.10"
                          value={item.precoUnitarioAplicado}
                          onChange={(e) =>
                            onUpdatePreco(item.produto.codigo, parseFloat(e.target.value) || 0)
                          }
                          className={`w-20 pl-6 pr-1.5 py-1 text-xs font-bold rounded-md border text-right focus:outline-none ${
                            isAbaixoDoMinimo
                              ? 'border-rose-400 text-rose-700 bg-rose-50'
                              : 'border-slate-200 text-slate-900 bg-slate-50'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Subtotal Item */}
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase">Subtotal</span>
                      <span className="font-bold text-slate-900">
                        {formatMoney(subtotalItem)}
                      </span>
                    </div>
                  </div>

                  {isAbaixoDoMinimo && (
                    <div className="mt-2 text-[11px] text-rose-700 font-medium">
                      ⚠️ Preço negociado abaixo do valor mínimo da Tabela 07 ({formatMoney(item.produto.valorMinimo)}).
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer with Calculations & Actions */}
        {items.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Price totals breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Bruto (Preço Cheio):</span>
                <span>{formatMoney(totalBruto)}</span>
              </div>
              {totalDesconto > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Desconto Total ({descontoGeralPct.toFixed(1)}%):</span>
                  <span>-{formatMoney(totalDesconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Líquido do Pedido:</span>
                <span className="text-lg text-blue-700">{formatMoney(totalLiquido)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={copiarPedidoWhatsApp}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                {copiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado p/ WhatsApp!' : 'Copiar p/ WhatsApp'}
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir Pedido
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onClearOrder}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Pedido
              </button>
              <button
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Continuar Consultando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
