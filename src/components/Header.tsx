import React from 'react';
import { 
  FileSpreadsheet, 
  ShoppingCart, 
  Download, 
  Plus, 
  Calendar, 
  Building2,
  RotateCcw
} from 'lucide-react';
import { TABELA_07_INFO } from '../data/tabela07Data';

interface HeaderProps {
  totalCartItems: number;
  onOpenCart: () => void;
  onOpenImportExport: () => void;
  onOpenAddModal: () => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCartItems,
  onOpenCart,
  onOpenImportExport,
  onOpenAddModal,
  onResetData,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Table Badge */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase bg-blue-100 text-blue-800 border border-blue-200">
                  {TABELA_07_INFO.nomeTabela}
                </span>
                <span className="hidden sm:inline-flex items-center text-xs text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Vigência: {TABELA_07_INFO.vigencia}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
                Consulta e Gestão de Preços
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onResetData}
              title="Restaurar dados originais da Tabela 07"
              className="p-2 sm:px-3 sm:py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Restaurar</span>
            </button>

            <button
              onClick={onOpenImportExport}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Exportar / Importar</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Novo Item</span>
            </button>

            {/* Cart / Order Simulator button */}
            <button
              onClick={onOpenCart}
              className="relative px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Simular Pedido</span>
              <span className="sm:hidden">Pedido</span>
              {totalCartItems > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold bg-amber-400 text-amber-950 rounded-full shadow-xs">
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
