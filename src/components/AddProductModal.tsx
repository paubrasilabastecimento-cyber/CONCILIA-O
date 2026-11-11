import React, { useState } from 'react';
import { X, Plus, Package } from 'lucide-react';
import { ProdutoTabela07 } from '../types/tabela';
import { TABELA_07_INFO } from '../data/tabela07Data';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduto: (produto: ProdutoTabela07) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduto,
}) => {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<ProdutoTabela07['categoria']>('Cervejas');
  const [unidadeVenda, setUnidadeVenda] = useState<ProdutoTabela07['unidadeVenda']>('CX');
  const [fatorEmbalagem, setFatorEmbalagem] = useState(12);
  const [valorTabela, setValorTabela] = useState('');
  const [valorMinimo, setValorMinimo] = useState('');
  const [precoSugeridoVenda, setPrecoSugeridoVenda] = useState('');
  const [aliquotaIcms, setAliquotaIcms] = useState('20.0');
  const [aliquotaSt, setAliquotaSt] = useState('5.5');
  const [regraComercial, setRegraComercial] = useState('Não cumulativo com etiqueta');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !descricao || !valorTabela) return;

    const vt = parseFloat(valorTabela) || 0;
    const vm = valorMinimo ? parseFloat(valorMinimo) : vt * 0.95;
    const ps = precoSugeridoVenda ? parseFloat(precoSugeridoVenda) : vt * 1.25;

    const novoItem: ProdutoTabela07 = {
      tabela: TABELA_07_INFO.nomeTabela,
      dataVigencia: TABELA_07_INFO.vigencia,
      codigoGrupo: '01103 BEBIDAS',
      codigo: codigo.trim(),
      descricao: descricao.trim().toUpperCase(),
      categoria,
      tipoMercadoria: 'Produto',
      unidadeVenda,
      fatorEmbalagem,
      valorTabela: vt,
      valorMinimo: vm,
      precoSugeridoVenda: ps,
      aliquotaIcms: parseFloat(aliquotaIcms) || 20.0,
      aliquotaSt: parseFloat(aliquotaSt) || 5.5,
      aliquotaFcp: 2.0,
      regraComercial,
      status: 'Ativo',
    };

    onAddProduto(novoItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Adicionar Produto na Tabela 07</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Código Mercadoria *</label>
              <input
                type="text"
                required
                placeholder="Ex: 12150"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cervejas">Cervejas</option>
                <option value="Refrigerantes">Refrigerantes</option>
                <option value="Destilados & Whiskies">Destilados & Whiskies</option>
                <option value="Energéticos">Energéticos</option>
                <option value="Águas & Sucos">Águas & Sucos</option>
                <option value="Vinhos & Espumantes">Vinhos & Espumantes</option>
                <option value="Aperitivos">Aperitivos</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Descrição Completa *</label>
            <input
              type="text"
              required
              placeholder="Ex: CERVEJA DEVASSA 350ML PACK C/12"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Unidade Venda</label>
              <select
                value={unidadeVenda}
                onChange={(e) => setUnidadeVenda(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CX">CX (Caixa)</option>
                <option value="PACK">PACK</option>
                <option value="FD">FD (Fardo)</option>
                <option value="UN">UN (Unidade)</option>
                <option value="GF">GF (Garrafa)</option>
                <option value="LT">LT (Lata)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Fator Embalagem (Qtd)</label>
              <input
                type="number"
                min="1"
                value={fatorEmbalagem}
                onChange={(e) => setFatorEmbalagem(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Valor Tabela (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={valorTabela}
                onChange={(e) => {
                  const val = e.target.value;
                  setValorTabela(val);
                  if (val && !valorMinimo) {
                    setValorMinimo((parseFloat(val) * 0.95).toFixed(2));
                  }
                  if (val && !precoSugeridoVenda) {
                    setPrecoSugeridoVenda((parseFloat(val) * 1.25).toFixed(2));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Valor Mínimo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorMinimo}
                onChange={(e) => setValorMinimo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Sugerido Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={precoSugeridoVenda}
                onChange={(e) => setPrecoSugeridoVenda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Alíquota ICMS (%)</label>
              <input
                type="number"
                step="0.1"
                value={aliquotaIcms}
                onChange={(e) => setAliquotaIcms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Regra Comercial</label>
              <select
                value={regraComercial}
                onChange={(e) => setRegraComercial(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Não cumulativo com etiqueta">Não cumulativo com etiqueta</option>
                <option value="Com Etiqueta">Com Etiqueta</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Salvar na Tabela 07
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
