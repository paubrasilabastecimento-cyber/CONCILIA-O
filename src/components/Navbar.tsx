import React from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Plus, 
  RotateCcw, 
  Upload, 
  Boxes,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  onAddItem: () => void;
  onImport: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onAddItem,
  onImport,
  onExportCSV,
  onPrint,
  onReset,
}) => {
  return (
    <header className="bg-zinc-900 border-b border-zinc-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-black shadow-inner">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white leading-tight">
                Controle de Inventário Promax
              </h1>
              <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                Pau Brasil
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Conferência de Estoque Físico vs. Sistema Promax
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-md text-xs transition shadow-sm cursor-pointer"
            title="Adicionar novo produto ao inventário"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Produto</span>
          </button>

          <button
            onClick={onImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-md text-xs border border-zinc-700 transition cursor-pointer"
            title="Importar ou colar planilha do Promax"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-md text-xs border border-zinc-700 transition cursor-pointer"
            title="Exportar para Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-md text-xs border border-zinc-700 transition cursor-pointer"
            title="Imprimir relatório da conferência"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">Imprimir</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition cursor-pointer"
            title="Restaurar dados originais"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
