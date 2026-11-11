import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { formatBRL, formatInteger, parseBRNumber } from '../utils/formatters';
import { 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  ArrowUpDown, 
  Search, 
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onEditInModal: (item: InventoryItem) => void;
  filter: string;
  setFilter: (f: any) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  autoCalculate: boolean;
  setAutoCalculate: (val: boolean) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onEditInModal,
  filter,
  setFilter,
  searchTerm,
  setSearchTerm,
  autoCalculate,
  setAutoCalculate,
}) => {
  // Inline edit state para célula específica
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof InventoryItem } | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const handleStartEdit = (item: InventoryItem, field: keyof InventoryItem) => {
    setEditingCell({ id: item.id, field });
    setTempValue(String(item[field] ?? ''));
  };

  const handleSaveEdit = (item: InventoryItem) => {
    if (!editingCell) return;
    const numVal = parseBRNumber(tempValue);
    
    const updated = {
      ...item,
      [editingCell.field]: numVal,
    };

    if (autoCalculate) {
      // Recalcular caixas se mudou unid
      if (editingCell.field === 'promaxUnid' && item.factorCx > 0) {
        updated.promaxCx = Math.floor(numVal / item.factorCx);
      }
      if (editingCell.field === 'invUnid' && item.factorCx > 0) {
        updated.invCx = Math.floor(numVal / item.factorCx);
      }

      // Recalcular diferenças
      updated.difUnid = (updated.invUnid + updated.sobras) - (updated.promaxUnid + updated.faltas);
      updated.difCx = updated.invCx - updated.promaxCx;
    }

    onUpdateItem(updated);
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.cod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.descricao.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'with-diff') {
      return it.difCx !== 0 || it.difUnid !== 0;
    }
    if (filter === 'no-diff') {
      return it.difCx === 0 && it.difUnid === 0;
    }
    if (filter === 'with-adjustments') {
      return it.pnc > 0 || it.sobras > 0 || it.faltas > 0 || it.repack > 0;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-900/60">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código ou descrição..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Quick filter pills */}
          <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-800 p-1 rounded-md text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded transition ${
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setFilter('with-diff')}
              className={`px-2.5 py-1 rounded transition ${
                filter === 'with-diff'
                  ? 'bg-rose-500 text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Com Diferenças
            </button>
            <button
              onClick={() => setFilter('with-adjustments')}
              className={`px-2.5 py-1 rounded transition ${
                filter === 'with-adjustments'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Com Ajustes (PNC)
            </button>
            <button
              onClick={() => setFilter('no-diff')}
              className={`px-2.5 py-1 rounded transition ${
                filter === 'no-diff'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Conciliados
            </button>
          </div>

          {/* Auto Calculate Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 ml-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCalculate}
              onChange={(e) => setAutoCalculate(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-400 border-zinc-300 dark:border-zinc-700 h-3.5 w-3.5"
            />
            <span>Cálculo automático</span>
          </label>
        </div>
      </div>

      {/* Main Table without manual boxed inputs */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] sm:text-xs">
          <thead>
            {/* Linha 1 do Cabeçalho - Amarelo Promax */}
            <tr className="bg-[#F2A900] text-zinc-950 font-bold border-b border-amber-600">
              <th rowSpan={2} className="px-3 py-2 text-center border-r border-amber-500/80 whitespace-nowrap">
                COD
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left border-r border-amber-500/80 whitespace-nowrap min-w-[240px]">
                DESCRIÇÃO PRODUTO
              </th>
              <th rowSpan={2} className="px-2 py-2 text-center border-r border-amber-500/80 whitespace-nowrap">
                TIPO
              </th>
              
              {/* DISPONIVEL PROMAX */}
              <th colSpan={3} className="px-3 py-1.5 text-center border-r border-amber-500/80 tracking-wide uppercase">
                DISPONIVEL PROMAX
              </th>

              {/* INVENTARIO */}
              <th colSpan={3} className="px-3 py-1.5 text-center border-r border-amber-500/80 tracking-wide uppercase">
                INVENTARIO
              </th>

              {/* AJUSTES */}
              <th colSpan={4} className="px-3 py-1.5 text-center border-r border-amber-500/80 tracking-wide uppercase">
                AJUSTES
              </th>

              {/* DIFERENÇAS */}
              <th colSpan={2} className="px-3 py-1.5 text-center border-r border-amber-500/80 tracking-wide uppercase">
                DIFERENÇAS
              </th>

              <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap">
                AÇÕES
              </th>
            </tr>

            {/* Linha 2 do Cabeçalho - Subcolunas */}
            <tr className="bg-[#E5A000] text-zinc-950 font-bold border-b border-amber-600 text-[10px] sm:text-[11px]">
              {/* Disponivel Promax subcolunas */}
              <th className="px-2 py-1 text-right border-r border-amber-600/70">UNID</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">CX</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">VALOR R$</th>

              {/* Inventário subcolunas */}
              <th className="px-2 py-1 text-right border-r border-amber-600/70">UNID</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">CX</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">VALOR R$</th>

              {/* Ajustes subcolunas */}
              <th className="px-2 py-1 text-right border-r border-amber-600/70">SOBRAS</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">PNC</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">FALTAS</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">REPACK</th>

              {/* Diferenças subcolunas */}
              <th className="px-2 py-1 text-right border-r border-amber-600/70">DIF UNID</th>
              <th className="px-2 py-1 text-right border-r border-amber-600/70">DIF CX</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-sans">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum produto encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const hasDiff = item.difCx !== 0 || item.difUnid !== 0;
                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-950/20 ${
                      isEven ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/80 dark:bg-zinc-800/40'
                    }`}
                  >
                    {/* COD */}
                    <td className="px-3 py-2 text-center font-mono font-medium text-zinc-800 dark:text-zinc-200 border-r border-zinc-200 dark:border-zinc-800">
                      {item.cod}
                    </td>

                    {/* DESCRIÇÃO PRODUTO */}
                    <td className="px-3 py-2 text-left font-medium text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
                      {item.descricao}
                    </td>

                    {/* TIPO */}
                    <td className="px-2 py-2 text-center text-zinc-500 lowercase border-r border-zinc-200 dark:border-zinc-800">
                      {item.tipo}
                    </td>

                    {/* DISPONIVEL PROMAX - UNID (SEM BLOCO MANUAL) */}
                    <td 
                      onClick={() => handleStartEdit(item, 'promaxUnid')}
                      className="px-2 py-2 text-right font-mono text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-amber-100/40 dark:hover:bg-amber-900/30 transition-colors"
                      title="Clique para editar valor"
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'promaxUnid' ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-16 text-right px-1 py-0.5 text-xs bg-amber-50 dark:bg-zinc-800 border-b-2 border-amber-500 outline-none font-mono font-bold"
                        />
                      ) : (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {formatInteger(item.promaxUnid)}
                        </span>
                      )}
                    </td>

                    {/* DISPONIVEL PROMAX - CX */}
                    <td className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800">
                      {formatInteger(item.promaxCx)}
                    </td>

                    {/* DISPONIVEL PROMAX - VALOR R$ */}
                    <td className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
                      {formatBRL(item.promaxValor)}
                    </td>

                    {/* INVENTARIO - UNID (SEM BLOCO MANUAL) */}
                    <td 
                      onClick={() => handleStartEdit(item, 'invUnid')}
                      className="px-2 py-2 text-right font-mono border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-amber-100/40 dark:hover:bg-amber-900/30 transition-colors"
                      title="Clique para editar valor contado no inventário"
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'invUnid' ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-16 text-right px-1 py-0.5 text-xs bg-amber-50 dark:bg-zinc-800 border-b-2 border-amber-500 outline-none font-mono font-bold"
                        />
                      ) : (
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatInteger(item.invUnid)}
                        </span>
                      )}
                    </td>

                    {/* INVENTARIO - CX */}
                    <td className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800">
                      {formatInteger(item.invCx)}
                    </td>

                    {/* INVENTARIO - VALOR R$ */}
                    <td className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
                      {formatBRL(item.invValor)}
                    </td>

                    {/* AJUSTES - SOBRAS */}
                    <td 
                      onClick={() => handleStartEdit(item, 'sobras')}
                      className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'sobras' ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-12 text-right px-1 py-0.5 text-xs bg-amber-50 dark:bg-zinc-800 border-b border-amber-500 outline-none font-mono"
                        />
                      ) : (
                        formatInteger(item.sobras)
                      )}
                    </td>

                    {/* AJUSTES - PNC (Produto Não Conforme) */}
                    <td 
                      onClick={() => handleStartEdit(item, 'pnc')}
                      className={`px-2 py-2 text-right font-mono border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                        item.pnc > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'pnc' ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-12 text-right px-1 py-0.5 text-xs bg-amber-50 dark:bg-zinc-800 border-b border-amber-500 outline-none font-mono"
                        />
                      ) : (
                        formatInteger(item.pnc)
                      )}
                    </td>

                    {/* AJUSTES - FALTAS */}
                    <td 
                      onClick={() => handleStartEdit(item, 'faltas')}
                      className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'faltas' ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-12 text-right px-1 py-0.5 text-xs bg-amber-50 dark:bg-zinc-800 border-b border-amber-500 outline-none font-mono"
                        />
                      ) : (
                        formatInteger(item.faltas)
                      )}
                    </td>

                    {/* AJUSTES - REPACK */}
                    <td 
                      onClick={() => handleStartEdit(item, 'repack')}
                      className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {editingCell?.id === item.id && editingCell?.field === 'repack' ? (
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onBlur={() => handleSaveEdit(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-12 text-right px-1 py-0.5 text-xs bg-amber-50 dark:bg-zinc-800 border-b border-amber-500 outline-none font-mono"
                        />
                      ) : (
                        formatInteger(item.repack)
                      )}
                    </td>

                    {/* DIFERENÇAS - DIF UNID */}
                    <td className={`px-2 py-2 text-right font-mono border-r border-zinc-200 dark:border-zinc-800 font-semibold ${
                      item.difUnid < 0 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : item.difUnid > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {formatInteger(item.difUnid)}
                    </td>

                    {/* DIFERENÇAS - DIF CX */}
                    <td className={`px-2 py-2 text-right font-mono border-r border-zinc-200 dark:border-zinc-800 font-bold ${
                      item.difCx < 0 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : item.difCx > 0 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {formatInteger(item.difCx)}
                    </td>

                    {/* AÇÕES */}
                    <td className="px-2 py-1.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onEditInModal(item)}
                          className="p-1 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer"
                          title="Editar todos os campos"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition cursor-pointer"
                          title="Excluir item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Rodapé da tabela com Totais */}
          {filteredItems.length > 0 && (
            <tfoot>
              <tr className="bg-zinc-100 dark:bg-zinc-800/90 font-bold text-zinc-900 dark:text-zinc-100 border-t-2 border-zinc-300 dark:border-zinc-700 text-[11px]">
                <td colSpan={3} className="px-3 py-2.5 text-right uppercase tracking-wider border-r border-zinc-300 dark:border-zinc-700">
                  Totais ({filteredItems.length} itens):
                </td>
                
                {/* Total Promax */}
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.promaxUnid, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.promaxCx, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                  {formatBRL(filteredItems.reduce((acc, it) => acc + it.promaxValor, 0))}
                </td>

                {/* Total Inventário */}
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.invUnid, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.invCx, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700 whitespace-nowrap">
                  {formatBRL(filteredItems.reduce((acc, it) => acc + it.invValor, 0))}
                </td>

                {/* Total Ajustes */}
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.sobras, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400 border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.pnc, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.faltas, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.repack, 0))}
                </td>

                {/* Total Diferenças */}
                <td className="px-2 py-2.5 text-right font-mono text-rose-600 dark:text-rose-400 border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.difUnid, 0))}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-rose-600 dark:text-rose-400 border-r border-zinc-300 dark:border-zinc-700">
                  {formatInteger(filteredItems.reduce((acc, it) => acc + it.difCx, 0))}
                </td>

                <td className="px-2 py-2.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      
      {/* Footer hint */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Sem blocos manuais: exibição limpa e contínua no padrão tabular do Promax.</span>
        </div>
        <div className="text-zinc-400">
          Dica: Clique em qualquer número para editar ou utilize o ícone de lápis para edição completa.
        </div>
      </div>
    </div>
  );
};
