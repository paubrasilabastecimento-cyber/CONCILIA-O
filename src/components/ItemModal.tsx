import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types/inventory';
import { X, Check } from 'lucide-react';
import { parseBRNumber } from '../utils/formatters';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  initialItem?: InventoryItem | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    cod: '',
    descricao: '',
    tipo: 'cx',
    factorCx: 12,
    promaxUnid: 0,
    promaxCx: 0,
    promaxValor: 0,
    invUnid: 0,
    invCx: 0,
    invValor: 0,
    sobras: 0,
    pnc: 0,
    faltas: 0,
    repack: 0,
    difUnid: 0,
    difCx: 0,
  });

  useEffect(() => {
    if (initialItem) {
      setFormData(initialItem);
    } else {
      setFormData({
        id: Math.random().toString(36).substring(2, 9),
        cod: '',
        descricao: '',
        tipo: 'cx',
        factorCx: 12,
        promaxUnid: 0,
        promaxCx: 0,
        promaxValor: 0,
        invUnid: 0,
        invCx: 0,
        invValor: 0,
        sobras: 0,
        pnc: 0,
        faltas: 0,
        repack: 0,
        difUnid: 0,
        difCx: 0,
      });
    }
  }, [initialItem, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof InventoryItem, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-cálculo opcional de caixas
      if (field === 'promaxUnid' && next.factorCx && next.factorCx > 0) {
        next.promaxCx = Math.floor(Number(value) / next.factorCx);
      }
      if (field === 'invUnid' && next.factorCx && next.factorCx > 0) {
        next.invCx = Math.floor(Number(value) / next.factorCx);
      }

      // Auto cálculo de diferenças
      const pUnid = Number(next.promaxUnid || 0);
      const iUnid = Number(next.invUnid || 0);
      const sobras = Number(next.sobras || 0);
      const faltas = Number(next.faltas || 0);
      next.difUnid = (iUnid + sobras) - (pUnid + faltas);

      const pCx = Number(next.promaxCx || 0);
      const iCx = Number(next.invCx || 0);
      next.difCx = iCx - pCx;

      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao) return;

    const itemToSave: InventoryItem = {
      id: formData.id || Math.random().toString(36).substring(2, 9),
      cod: formData.cod || '',
      descricao: formData.descricao.toUpperCase(),
      tipo: formData.tipo || 'cx',
      factorCx: Number(formData.factorCx || 1),
      promaxUnid: Number(formData.promaxUnid || 0),
      promaxCx: Number(formData.promaxCx || 0),
      promaxValor: Number(formData.promaxValor || 0),
      invUnid: Number(formData.invUnid || 0),
      invCx: Number(formData.invCx || 0),
      invValor: Number(formData.invValor || 0),
      sobras: Number(formData.sobras || 0),
      pnc: Number(formData.pnc || 0),
      faltas: Number(formData.faltas || 0),
      repack: Number(formData.repack || 0),
      difUnid: Number(formData.difUnid || 0),
      difCx: Number(formData.difCx || 0),
    };

    onSave(itemToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {initialItem ? 'Editar Produto do Inventário' : 'Novo Produto'}
            </h3>
            <p className="text-xs text-zinc-500">
              Preencha os valores para atualizar os saldos Promax e contagem física.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Código (COD)
              </label>
              <input
                type="text"
                required
                value={formData.cod || ''}
                onChange={(e) => handleChange('cod', e.target.value)}
                placeholder="Ex: 988"
                className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Descrição do Produto
              </label>
              <input
                type="text"
                required
                value={formData.descricao || ''}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Ex: BRAHMA CHOPP 600ML"
                className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={formData.tipo || 'cx'}
                onChange={(e) => handleChange('tipo', e.target.value)}
                placeholder="cx"
                className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-amber-500 text-center"
              />
            </div>
          </div>

          {/* Seção 1: Promax */}
          <div className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 rounded-lg space-y-3">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
              Disponível Promax (Sistema)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Unidades (UNID)
                </label>
                <input
                  type="number"
                  value={formData.promaxUnid ?? 0}
                  onChange={(e) => handleChange('promaxUnid', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Caixas (CX)
                </label>
                <input
                  type="number"
                  value={formData.promaxCx ?? 0}
                  onChange={(e) => handleChange('promaxCx', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Valor R$
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.promaxValor ?? 0}
                  onChange={(e) => handleChange('promaxValor', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Inventário Físico */}
          <div className="border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 p-3.5 rounded-lg space-y-3">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide">
              Inventário Físico (Contagem)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Unidades (UNID)
                </label>
                <input
                  type="number"
                  value={formData.invUnid ?? 0}
                  onChange={(e) => handleChange('invUnid', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Caixas (CX)
                </label>
                <input
                  type="number"
                  value={formData.invCx ?? 0}
                  onChange={(e) => handleChange('invCx', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Valor R$
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.invValor ?? 0}
                  onChange={(e) => handleChange('invValor', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Ajustes */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-lg space-y-3">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wide">
              Ajustes de Estoque
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Sobras
                </label>
                <input
                  type="number"
                  value={formData.sobras ?? 0}
                  onChange={(e) => handleChange('sobras', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  PNC (Avarias)
                </label>
                <input
                  type="number"
                  value={formData.pnc ?? 0}
                  onChange={(e) => handleChange('pnc', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Faltas
                </label>
                <input
                  type="number"
                  value={formData.faltas ?? 0}
                  onChange={(e) => handleChange('faltas', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Repack
                </label>
                <input
                  type="number"
                  value={formData.repack ?? 0}
                  onChange={(e) => handleChange('repack', Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md font-mono text-right"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
