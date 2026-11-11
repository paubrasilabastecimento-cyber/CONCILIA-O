import React, { useState, useMemo } from 'react';
import { CalculatedProduct, RecontagemItem } from '../data/types';
import { Search, Trash2, ArrowLeft, Printer, FileDown, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { generateRecontagemPDF, printDirectSheet } from '../utils/printPdf';

interface RecontagemViewProps {
  recontagens: RecontagemItem[];
  calculatedProducts: CalculatedProduct[];
  onUpdateRecontagem?: (item: RecontagemItem, desc?: string) => void;
  onDeleteRecontagem: (id: string) => void;
  onClearAjustados?: () => void;
  onClearAll: () => void;
  onAplicarAoEstoque?: (item: RecontagemItem) => void;
  onNavigateToDashboard: () => void;
}

export const RecontagemView: React.FC<RecontagemViewProps> = ({
  recontagens,
  onDeleteRecontagem,
  onClearAll,
  onNavigateToDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintSuccessModal, setShowPrintSuccessModal] = useState(false);
  const [showConfirmDeleteAllModal, setShowConfirmDeleteAllModal] = useState(false);
  const [targetItemForDelete, setTargetItemForDelete] = useState<RecontagemItem | null>(null);

  const handleOpenDeleteModal = (item?: RecontagemItem) => {
    setTargetItemForDelete(item || null);
    setShowConfirmDeleteAllModal(true);
  };

  const handleConfirmDeleteAll = () => {
    onClearAll();
    setShowConfirmDeleteAllModal(false);
    setTargetItemForDelete(null);
  };

  const handleConfirmDeleteSingle = () => {
    if (targetItemForDelete) {
      onDeleteRecontagem(targetItemForDelete.id);
    }
    setShowConfirmDeleteAllModal(false);
    setTargetItemForDelete(null);
  };

  const filteredList = useMemo(() => {
    return recontagens.filter((item) => {
      return (
        item.cod.toString().includes(searchTerm) ||
        item.desc.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [recontagens, searchTerm]);

  /**
   * Dispara a impressão da folha:
   * 1. Gera e faz o download imediato do PDF oficial formatado em A4
   * 2. Tenta disparar a impressão pelo navegador (iframe ou window.print)
   * 3. Exibe modal de confirmação com opções de impressão e download adicional
   */
  const handlePrint = () => {
    if (recontagens.length === 0) return;

    // 1. Gera e baixa o PDF oficial formatado (garante funcionamento mesmo em iframe restrito)
    generateRecontagemPDF(recontagens);

    // 2. Tenta acionar a caixa de diálogo de impressão nativa do navegador
    printDirectSheet(recontagens);

    // 3. Exibe o aviso de sucesso e instruções para o usuário
    setShowPrintSuccessModal(true);
  };

  const handleDownloadOnlyPDF = () => {
    if (recontagens.length === 0) return;
    generateRecontagemPDF(recontagens);
  };

  return (
    <div className="w-full bg-white min-h-screen pb-16 font-sans">
      {/* CABEÇALHO EXCLUSIVO PARA IMPRESSÃO NATIVA DO NAVEGADOR (A4) */}
      <div className="hidden print:block mb-4 border-b-2 border-black pb-2 text-black">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wider text-black">
              ESTOQUE OFICIAL GUARABIRA - FOLHA DE RECONTAGEM
            </h1>
            <p className="text-xs text-zinc-600">
              Relação de Itens para Conferência Física de Estoque
            </p>
          </div>
          <div className="text-right text-xs">
            <div>
              <b>Data:</b> {new Date().toLocaleDateString('pt-BR')}
            </div>
            <div>
              <b>Hora:</b>{' '}
              {new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>
              <b>Total de Itens:</b> {recontagens.length}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA SUPERIOR DE INFORMAÇÕES E BOTÃO DE IMPRIMIR */}
      <div className="px-6 py-3.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-zinc-800 border border-zinc-300 rounded hover:bg-zinc-200 transition shadow-xs cursor-pointer"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft size={13} />
            <span>Dashboard</span>
          </button>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <span>RECONTAGEM DE ITENS</span>
              <span className="text-xs font-normal text-zinc-500">
                ({recontagens.length} {recontagens.length === 1 ? 'item' : 'itens'})
              </span>
            </h1>
            <p className="text-[11px] text-zinc-600">
              Itens enviados pelo duplo clique no código (COD) do Dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BOTÃO PRINCIPAL: IMPRIMIR FOLHA */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={recontagens.length === 0}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded transition shadow-xs cursor-pointer border ${
              recontagens.length === 0
                ? 'bg-zinc-200 text-zinc-400 border-zinc-300 cursor-not-allowed'
                : 'bg-[#FFC000] text-black hover:bg-[#e6ad00] border-amber-600'
            }`}
            title="Imprimir Folha de Recontagem Física (Gera PDF e abre impressão)"
          >
            <Printer size={15} />
            <span>IMPRIMIR FOLHA</span>
          </button>

          {/* BOTÃO COMPLEMENTAR: BAIXAR PDF */}
          {recontagens.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadOnlyPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-zinc-800 text-amber-300 rounded hover:bg-zinc-700 transition shadow-xs cursor-pointer border border-zinc-900"
              title="Baixar arquivo PDF da folha pronto para impressão"
            >
              <FileDown size={14} />
              <span>BAIXAR PDF</span>
            </button>
          )}

          {/* BOTÃO EXCLUIR TODA A CONTAGEM */}
          {recontagens.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenDeleteModal()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded transition shadow-xs cursor-pointer border border-rose-700"
              title="Excluir toda a contagem de uma vez"
            >
              <Trash2 size={14} />
              <span>EXCLUIR TODA A CONTAGEM</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTRO E BUSCA */}
      <div className="border-b border-zinc-200 bg-zinc-50 py-3 px-6 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-300 rounded w-80 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="text-[11px] text-zinc-600 flex items-center gap-1.5 flex-wrap">
            <span>💡 Clique no botão</span>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal()}
              className="font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={11} /> EXCLUIR
            </button>
            <span>para excluir toda a contagem de uma vez.</span>
          </div>
        </div>
      </div>

      {/* TABELA CENTRALIZADA: CÓDIGO E DESCRIÇÃO */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {recontagens.length === 0 ? (
          <div className="border border-dashed border-zinc-300 rounded-lg p-12 text-center bg-zinc-50 print:hidden">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="text-sm font-bold text-zinc-800">
              Nenhum item na folha de recontagem
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              Dê <b>dois cliques no código (COD)</b> de qualquer produto no Dashboard para adicioná-lo aqui.
            </p>
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="mt-4 px-4 py-2 text-xs font-bold bg-[#FFC000] text-zinc-950 rounded hover:bg-[#e6ad00] transition shadow-xs cursor-pointer"
            >
              Ir para o Dashboard
            </button>
          </div>
        ) : (
          <div className="border border-zinc-300 rounded shadow-xs overflow-hidden bg-white">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-[#FFC000] text-black text-[12px] font-bold">
                <tr>
                  <th className="p-2.5 w-14 text-center border-r border-amber-600/30">
                    #
                  </th>
                  <th className="p-2.5 w-28 text-center border-r border-amber-600/30">
                    CÓDIGO
                  </th>
                  <th className="p-2.5 text-center">
                    DESCRIÇÃO DO PRODUTO
                  </th>
                  <th className="p-2.5 w-24 text-center print:hidden border-l border-amber-600/30">
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal()}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                      title="Excluir toda a contagem de uma vez"
                    >
                      <Trash2 size={12} />
                      <span>EXCLUIR</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-zinc-500">
                      Nenhum item encontrado com o termo pesquisado.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      {/* # (CENTRALIZADO) */}
                      <td className="p-2.5 text-center text-zinc-400 font-mono text-[11px] border-r border-zinc-100">
                        {index + 1}
                      </td>

                      {/* CÓDIGO (CENTRALIZADO) */}
                      <td className="p-2.5 text-center font-mono font-bold border-r border-zinc-100">
                        <span className="bg-zinc-800 text-[#FFC000] px-3 py-1 rounded text-[11px] inline-block tracking-wider">
                          {item.cod}
                        </span>
                      </td>

                      {/* DESCRIÇÃO DO PRODUTO (CENTRALIZADO) */}
                      <td className="p-2.5 text-center font-semibold text-zinc-900 text-[12px]">
                        {item.desc}
                      </td>

                      {/* BOTÃO EXCLUIR (EXCLUI TODA A CONTAGEM DE UMA VEZ) */}
                      <td className="p-2.5 text-center print:hidden border-l border-zinc-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteModal(item);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                          title="Excluir toda a contagem de uma vez"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ASSINATURAS PARA A FOLHA IMPRESSA NATIVA */}
        {recontagens.length > 0 && (
          <div className="hidden print:grid grid-cols-2 gap-12 mt-16 pt-8 text-xs text-center border-t border-zinc-400 text-black">
            <div>
              <div className="border-t-2 border-black pt-1 font-bold text-black">
                Conferente Responsável
              </div>
              <div className="text-[10px] text-zinc-600">
                Nome, Matrícula e Assinatura
              </div>
            </div>
            <div>
              <div className="border-t-2 border-black pt-1 font-bold text-black">
                Supervisor / Auditor de Estoque
              </div>
              <div className="text-[10px] text-zinc-600">
                Visto e Validação
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO E OPÇÕES DE IMPRESSÃO */}
      {showPrintSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border-2 border-[#FFC000] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#FFC000] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-black text-sm">
                <Printer size={18} />
                <span>IMPRESSÃO DA FOLHA DE RECONTAGEM</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintSuccessModal(false)}
                className="text-black hover:bg-black/10 rounded p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 text-zinc-800 text-xs space-y-3">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold">
                    Folha gerada com sucesso!
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-800">
                    O arquivo PDF oficial (A4) foi baixado diretamente no seu dispositivo com todos os {recontagens.length} itens formatados para contagem física.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded text-[11px] text-zinc-700 space-y-1.5">
                <p>
                  <b>Como imprimir:</b>
                </p>
                <p>
                  1. Abra o arquivo PDF baixado (<b>folha_recontagem_guarabira.pdf</b>).
                </p>
                <p>
                  2. Pressione <b>Ctrl + P</b> (ou ícone de impressora) para imprimir em qualquer impressora do armazém.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    generateRecontagemPDF(recontagens);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-900 text-amber-400 font-bold rounded hover:bg-zinc-800 transition cursor-pointer"
                >
                  <FileDown size={14} />
                  <span>Baixar Arquivo PDF Novamente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    printDirectSheet(recontagens);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#FFC000] text-black font-bold rounded hover:bg-[#e6ad00] transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Tentar Impressão Direta pelo Navegador</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintSuccessModal(false)}
                  className="w-full py-1.5 text-zinc-500 hover:text-zinc-800 text-center text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR TODA A CONTAGEM */}
      {showConfirmDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border-2 border-rose-500 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-600 px-4 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Trash2 size={18} />
                <span>EXCLUIR TODA A CONTAGEM</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDeleteAllModal(false);
                  setTargetItemForDelete(null);
                }}
                className="text-white hover:bg-white/20 rounded p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 text-zinc-800 text-xs space-y-4">
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={22} />
                <div>
                  <p className="font-bold text-sm text-rose-900">
                    Atenção: Exclusão total da contagem
                  </p>
                  <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                    Deseja excluir toda a contagem? Esta ação removerá{' '}
                    <b>todos os {recontagens.length} produtos</b> da folha de recontagem de uma vez só.
                  </p>
                </div>
              </div>

              {targetItemForDelete && (
                <div className="bg-zinc-50 border border-zinc-200 p-2.5 rounded text-[11px] text-zinc-600">
                  Item selecionado: <span className="font-mono font-bold text-zinc-900">{targetItemForDelete.cod}</span> - {targetItemForDelete.desc}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteAll}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded shadow-xs transition cursor-pointer text-xs"
                >
                  <Trash2 size={15} />
                  <span>SIM, EXCLUIR TODA A CONTAGEM ({recontagens.length} ITENS)</span>
                </button>

                {targetItemForDelete && (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSingle}
                    className="w-full py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded transition cursor-pointer text-[11px] border border-zinc-300"
                  >
                    Excluir apenas o item {targetItemForDelete.cod}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDeleteAllModal(false);
                    setTargetItemForDelete(null);
                  }}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-800 text-center text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
