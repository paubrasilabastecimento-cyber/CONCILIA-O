import React from 'react';
import { InventoryItem } from '../types/inventory';
import { formatBRL, formatInteger } from '../utils/formatters';
import { 
  Boxes, 
  DollarSign, 
  AlertTriangle, 
  Layers, 
  TrendingDown, 
  CheckCircle2 
} from 'lucide-react';

interface MetricsCardsProps {
  items: InventoryItem[];
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ items }) => {
  const totalPromaxValor = items.reduce((acc, it) => acc + (it.promaxValor || 0), 0);
  const totalInvValor = items.reduce((acc, it) => acc + (it.invValor || 0), 0);
  const totalPromaxCx = items.reduce((acc, it) => acc + (it.promaxCx || 0), 0);
  const totalInvCx = items.reduce((acc, it) => acc + (it.invCx || 0), 0);
  
  const totalPnc = items.reduce((acc, it) => acc + (it.pnc || 0), 0);
  const totalDifCx = items.reduce((acc, it) => acc + (it.difCx || 0), 0);
  
  const itemsComDiferenca = items.filter(it => it.difCx !== 0 || it.difUnid !== 0).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Total de Itens */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
          <span className="text-xs font-medium">Total de Produtos</span>
          <Boxes className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {items.length} <span className="text-xs font-normal text-zinc-500">itens</span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
          {itemsComDiferenca > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {itemsComDiferenca} com divergência
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% conciliado
            </span>
          )}
        </div>
      </div>

      {/* Disponível Promax R$ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
          <span className="text-xs font-medium">Disponível Promax</span>
          <DollarSign className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
          R$ {formatBRL(totalPromaxValor)}
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          {formatInteger(totalPromaxCx)} cx no sistema
        </div>
      </div>

      {/* Inventário Físico R$ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
          <span className="text-xs font-medium">Inventário Físico</span>
          <Layers className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
          R$ {formatBRL(totalInvValor)}
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          {formatInteger(totalInvCx)} cx contadas
        </div>
      </div>

      {/* Quebras / PNC */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
          <span className="text-xs font-medium">Ajustes / PNC</span>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
          {formatInteger(totalPnc)} <span className="text-xs font-normal text-zinc-500">un</span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          Avarias e não conformes
        </div>
      </div>

      {/* Balanço / Diferença Caixas */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-xs col-span-2 md:col-span-1">
        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
          <span className="text-xs font-medium">Diferença Total</span>
          <TrendingDown className={`w-4 h-4 ${totalDifCx < 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
        </div>
        <div className={`text-xl font-bold ${totalDifCx < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {formatInteger(totalDifCx)} <span className="text-xs font-normal text-zinc-500">cx</span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          Diferença Promax vs Físico
        </div>
      </div>
    </div>
  );
};
