import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { X, Upload, FileText, Check } from 'lucide-react';
import { parseBRNumber } from '../utils/formatters';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newItems: InventoryItem[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [pasteData, setPasteData] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);

  if (!isOpen) return null;

  const handleProcessImport = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.trim().split('\n');
    const parsed: InventoryItem[] = [];

    for (const line of lines) {
      // Divide por tab ou ponto-e-vírgula ou vírgula
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
        ? line.split(';')
        : line.split(',');

      if (parts.length >= 2) {
        const cod = parts[0]?.trim() || '';
        const descricao = parts[1]?.trim().toUpperCase() || '';
        const tipo = parts[2]?.trim() || 'cx';
        
        const promaxUnid = parseBRNumber(parts[3] || '0');
        const promaxCx = parseBRNumber(parts[4] || '0');
        const promaxValor = parseBRNumber(parts[5] || '0');

        const invUnid = parseBRNumber(parts[6] || '0');
        const invCx = parseBRNumber(parts[7] || '0');
        const invValor = parseBRNumber(parts[8] || '0');

        const sobras = parseBRNumber(parts[9] || '0');
        const pnc = parseBRNumber(parts[10] || '0');
        const faltas = parseBRNumber(parts[11] || '0');
        const repack = parseBRNumber(parts[12] || '0');

        const difUnid = parts[13] ? parseBRNumber(parts[13]) : (invUnid + sobras) - (promaxUnid + faltas);
        const difCx = parts[14] ? parseBRNumber(parts[14]) : invCx - promaxCx;

        if (descricao && !descricao.includes('DESCRIÇÃO')) {
          parsed.push({
            id: Math.random().toString(36).substring(2, 9),
            cod,
            descricao,
            tipo,
            factorCx: 12,
            promaxUnid,
            promaxCx,
            promaxValor,
            invUnid,
            invCx,
            invValor,
            sobras,
            pnc,
            faltas,
            repack,
            difUnid,
            difCx,
          });
        }
      }
    }

    if (parsed.length > 0) {
      onImport(parsed);
      setPasteData('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-xl w-full">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Importar Dados do Promax / Excel
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Copie as linhas da sua planilha do Excel ou relatório Promax e cole abaixo. 
            As colunas esperadas são:
            <br />
            <code className="text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-400 mt-1 inline-block">
              COD | DESCRIÇÃO | TIPO | PROMAX UNID | PROMAX CX | VALOR | INV UNID | INV CX | INV VALOR | ...
            </code>
          </p>

          <textarea
            rows={8}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Cole aqui os dados separados por tabulação ou vírgula..."
            className="w-full p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100"
          ></textarea>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 border-zinc-300 h-3.5 w-3.5"
              />
              Substituir lista existente
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={!pasteData.trim()}
                className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Importar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
