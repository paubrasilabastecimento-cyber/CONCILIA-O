import React, { useState } from 'react';
import { X, Upload, Check } from 'lucide-react';
import { Modal } from './Modal';

export interface SimpleImportData {
  data: string;
  cod: string;
  quantidade: number;
}

interface SimpleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: SimpleImportData[]) => void;
}

export const SimpleImportModal: React.FC<SimpleImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [pasteData, setPasteData] = useState('');

  const handleProcessImport = () => {
    if (!pasteData.trim()) return;

    const lines = pasteData.trim().split('\n');
    const parsed: SimpleImportData[] = [];

    for (const line of lines) {
      // O Excel ao copiar usa TAB como separador
      const parts = line.split('\t').map(p => p.trim());

      if (parts.length >= 3) {
        parsed.push({
          data: parts[0], // Data
          cod: parts[1],   // Código
          quantidade: parseFloat(parts[2].replace(',', '.')) || 0, // Quantidade
        });
      }
    }

    if (parsed.length > 0) {
      onImport(parsed);
      setPasteData('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Importar Dados (Data; Cod; Qtd)"
      onConfirm={handleProcessImport}
      onCancel={onClose}
      message={
        <div className="space-y-4">
          <p className="text-xs text-zinc-600">Cole os dados no formato: <code className="bg-zinc-100 px-1 rounded">Data; Cod; Qtd</code></p>
          <textarea
            rows={8}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Ex: 20/10/2026; 12345; 10"
            className="w-full p-2 border border-zinc-300 rounded text-xs font-mono"
          />
        </div>
      }
    />
  );
};
