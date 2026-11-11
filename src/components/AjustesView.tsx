import React, { useState, useEffect } from 'react';
import { AjustesData, CalculatedProduct } from '../data/types';
import { Modal } from './Modal';

interface AjustesViewProps {
  ajustes: AjustesData;
  calculatedMap: Record<number, CalculatedProduct>;
  onUpdateAjustes: (newAjustes: AjustesData) => void;
}

type BlockKey = 'av' | 'so' | 'rp' | 'fm';

const BL: Record<BlockKey, string[]> = {
  av: ['DATA', 'Cod', 'Desc', 'Qtde (UN)', 'Status'],
  so: ['Cod', 'Desc', 'Qtde (UN)', 'Data', 'Mapa', 'Motorista', 'Cod Cliente', 'Fantasia', 'Status', 'Obs'],
  rp: ['Cod', 'Desc', 'Qtde (UN)', 'Status'],
  fm: ['Cod', 'Desc', 'Qtde (UN)', 'Data'],
};

const TT: Record<BlockKey, string> = {
  av: 'AVARIAS',
  so: 'SOBRAS NO ESTOQUE',
  rp: 'REPACK',
  fm: 'FALTAS MAPEADAS',
};

const ST: Partial<Record<BlockKey, number>> = {
  av: 4,
  so: 8,
  rp: 3,
};

const NU: Record<BlockKey, number[]> = {
  av: [1, 3],
  so: [0, 2],
  rp: [0, 2],
  fm: [0, 2],
};

const CD: Record<BlockKey, number> = {
  av: 1,
  so: 0,
  rp: 0,
  fm: 0,
};

const DS: Record<BlockKey, number> = {
  av: 2,
  so: 1,
  rp: 1,
  fm: 1,
};

export const AjustesView: React.FC<AjustesViewProps> = ({
  ajustes,
  calculatedMap,
  onUpdateAjustes,
}) => {
  const [isImportAvModalOpen, setIsImportAvModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [replaceExistingAv, setReplaceExistingAv] = useState(false);
  const [pasteAvText, setPasteAvText] = useState('');
  const [importAvDate, setImportAvDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const handleCellChange = (b: BlockKey, rowIdx: number, colIdx: number, valueStr: string) => {
    const copy = { ...ajustes };
    const rows = [...copy[b]].map((r) => [...r]);
    let val: string | number = valueStr;

    if (NU[b].includes(colIdx)) {
      val = Number(valueStr) || 0;
    }

    rows[rowIdx][colIdx] = val;

    if (colIdx === CD[b]) {
      const codeNum = Number(val);
      if (calculatedMap[codeNum]) {
        rows[rowIdx][DS[b]] = calculatedMap[codeNum].d;
      }
    }

    copy[b] = rows;
    onUpdateAjustes(copy);
  };

  const handleAddRow = (b: BlockKey) => {
    const copy = { ...ajustes };
    const n = BL[b].length;
    const newRow: (string | number)[] = Array(n).fill('');

    NU[b].forEach((j) => {
      newRow[j] = 0;
    });

    const statusCol = ST[b];
    if (statusCol !== undefined) {
      newRow[statusCol] = 'Pendente';
    }

    if (b === 'av') {
      newRow[0] = new Date().toISOString().slice(0, 10);
    } else if (b === 'fm') {
      newRow[3] = new Date().toISOString().slice(0, 10);
    }

    copy[b] = [...copy[b], newRow];
    onUpdateAjustes(copy);
  };

  const handleDeleteRow = (b: BlockKey, rowIdx: number) => {
    const copy = { ...ajustes };
    const rows = [...copy[b]];
    rows.splice(rowIdx, 1);
    copy[b] = rows;
    onUpdateAjustes(copy);
  };

  const handleConfirmClearAvarias = () => {
    const copy = { ...ajustes };
    copy.av = [];
    onUpdateAjustes(copy);
    setIsClearConfirmOpen(false);
    setToastMsg('✓ Todas as avarias foram apagadas com sucesso.');
  };

  const handleProcessAvImport = () => {
    if (!pasteAvText.trim()) return;
    const lines = pasteAvText.replace(/\r/g, '').split('\n');
    const newRows: (string | number)[][] = [];
    const today = importAvDate || new Date().toISOString().slice(0, 10);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Ignorar tags XML, metadados de arquivos compactados e cabeçalhos corrompidos
      if (
        line.includes('<') || 
        line.includes('>') || 
        line.includes('PK') || 
        line.includes('xmlns') || 
        line.includes('metadata') || 
        line.includes('workbook')
      ) {
        continue;
      }

      // Separador: tabulação (\t), ponto-e-vírgula (;), vírgula (,) ou espaços
      let parts = line.split('\t').map((p) => p.trim());
      if (parts.length < 2) {
        parts = line.split(';').map((p) => p.trim());
      }
      if (parts.length < 2) {
        parts = line.split(',').map((p) => p.trim());
      }
      if (parts.length < 2) {
        parts = line.split(/\s+/).map((p) => p.trim());
      }

      if (parts.length < 2) {
        continue;
      }

      // Ignorar linha de cabeçalho
      const col0 = parts[0].toLowerCase();
      const col1 = parts[1].toLowerCase();
      if (col0.includes('cod') || col0.includes('prod') || col1.includes('qtd') || col1.includes('quant')) {
        continue;
      }

      let date = today;
      let codStr = '';
      let qtde = 0;

      // Se houver 3 colunas e a 1ª for data (ex: 20/10/2026, 503, 3)
      if (parts.length >= 3 && (parts[0].includes('/') || (parts[0].includes('-') && parts[0].length >= 8))) {
        date = parts[0];
        codStr = parts[1];
        qtde = Number(parts[2].replace(/\./g, '').replace(',', '.')) || 0;
      } else {
        // Padrão solicitado: 1ª coluna = Código, 2ª coluna = Quantidade
        codStr = parts[0];
        qtde = Number(parts[1].replace(/\./g, '').replace(',', '.')) || 0;
      }

      const codNum = Number(String(codStr).replace(/\D/g, '')) || 0;
      
      // Validação: código numérico positivo
      if (codNum <= 0 || isNaN(codNum)) {
        continue;
      }

      // Preenchimento automático da descrição
      const desc = calculatedMap[codNum]?.d || `PRODUTO ${codNum}`;

      // Linha adicionada: [DATA, Cod, Desc, Qtde (UN), Status]
      newRows.push([date, codNum, desc, qtde, 'Pendente']);
    }

    if (newRows.length > 0) {
      const copy = { ...ajustes };
      if (replaceExistingAv) {
        copy.av = newRows;
      } else {
        copy.av = [...copy.av, ...newRows];
      }
      onUpdateAjustes(copy);
      setPasteAvText('');
      setIsImportAvModalOpen(false);
      setToastMsg(`✓ ${newRows.length} avarias importadas com sucesso!`);
    } else {
      setToastMsg('⚠️ Nenhum código e quantidade válidos encontrados no texto colado.');
    }
  };

  const handleExportAvarias = () => {
    const data = ajustes.av.map((r) => r.join(';')).join('\n');
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avarias_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const blockKeys: BlockKey[] = ['av', 'so', 'rp', 'fm'];

  return (
    <section>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 999999,
            background: toastMsg.startsWith('⚠️') ? '#92400E' : '#15803D',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            fontSize: '13px',
            fontWeight: 'bold',
          }}
        >
          {toastMsg}
        </div>
      )}

      <div className="blks">
        {blockKeys.map((b) => (
          <div key={b} className="blk">
            <h3>{TT[b]}</h3>
            
            {/* Controles específicos para Avarias */}
            {b === 'av' ? (
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                <button 
                  type="button"
                  className="text-[12px] bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold transition shadow-xs cursor-pointer"
                  onClick={() => setIsClearConfirmOpen(true)}
                  title="Apagar todas as avarias cadastradas"
                >
                  🗑️ Apagar Avarias
                </button>
                <button 
                  type="button"
                  className="text-[12px] bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded font-bold transition shadow-xs cursor-pointer"
                  onClick={() => setIsImportAvModalOpen(true)}
                  title="Importar avarias copiadas do Excel (Código e Quantidade)"
                >
                  📋 Importar (Copiar e Colar)
                </button>
                <button 
                  type="button"
                  className="text-[12px] bg-zinc-700 hover:bg-zinc-800 text-white px-3 py-1.5 rounded font-medium transition shadow-xs cursor-pointer"
                  onClick={handleExportAvarias}
                  title="Exportar dados atuais de avarias"
                >
                  📥 Exportar Avarias
                </button>
                <span className="text-[11px] text-zinc-500 ml-2">
                  Total: <b>{ajustes.av.length}</b> avarias registradas
                </span>
              </div>
            ) : (
              <div className="flex gap-2 mb-2">
                <button 
                  type="button"
                  className="text-[10px] bg-zinc-200 px-2 py-1 rounded cursor-pointer" 
                  onClick={() => {
                    const data = ajustes[b].map((r) => r.join(';')).join('\n');
                    const blob = new Blob([data], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${TT[b].toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                  }}
                >
                  Exportar CSV
                </button>
                <button 
                  type="button"
                  className="text-[10px] bg-zinc-200 px-2 py-1 rounded cursor-pointer" 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (re) => {
                        const text = re.target?.result as string;
                        const rows = text
                          .split('\n')
                          .filter((l) => l.trim())
                          .map((l) =>
                            l
                              .split(';')
                              .map((c, i) =>
                                NU[b].includes(i) ? Number(c) || 0 : c
                              )
                          );
                        const copy = { ...ajustes };
                        copy[b] = [...copy[b], ...rows];
                        onUpdateAjustes(copy);
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                >
                  Importar CSV
                </button>
              </div>
            )}

            <div className="bs">
              <table>
                <thead>
                  <tr>
                    {BL[b].map((header, hIdx) => (
                      <th key={hIdx}>{header}</th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ajustes[b].map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cellValue, cIdx) => {
                        const isStatus = cIdx === ST[b];
                        const isDesc = cIdx === DS[b];

                        if (isStatus) {
                          return (
                            <td key={cIdx}>
                              <select
                                className="ed"
                                value={String(cellValue)}
                                onChange={(e) =>
                                  handleCellChange(b, rIdx, cIdx, e.target.value)
                                }
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Baixado">Baixado</option>
                              </select>
                            </td>
                          );
                        }

                        return (
                          <td key={cIdx}>
                            <input
                              className="ed"
                              size={isDesc ? 34 : undefined}
                              defaultValue={String(cellValue)}
                              key={`${b}-${rIdx}-${cIdx}-${cellValue}`}
                              onBlur={(e) =>
                                handleCellChange(b, rIdx, cIdx, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                            />
                          </td>
                        );
                      })}
                      <td
                        className="x-btn"
                        onClick={() => handleDeleteRow(b, rIdx)}
                        title="Remover linha"
                      >
                        ✕
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="ad-btn" onClick={() => handleAddRow(b)}>
              + linha
            </button>
          </div>
        ))}
      </div>

      {/* Modal de Confirmação para Apagar Avarias (Sem usar window.confirm que falha em iframes) */}
      <Modal
        isOpen={isClearConfirmOpen}
        title="Apagar Todas as Avarias"
        confirmLabel="Sim, Apagar Tudo"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmClearAvarias}
        onCancel={() => setIsClearConfirmOpen(false)}
        message={
          <div className="space-y-2">
            <p className="text-sm text-zinc-800">
              Deseja realmente <b>apagar todas as {ajustes.av.length} avarias</b> cadastradas na tabela?
            </p>
            <p className="text-xs text-red-600 font-semibold">
              Esta ação removerá todas as linhas de avarias atuais para que você possa importar uma nova lista limpa.
            </p>
          </div>
        }
      />

      {/* Modal de Importação por Copiar e Colar para Avarias */}
      <Modal
        isOpen={isImportAvModalOpen}
        title="Importar Avarias (Copiar e Colar)"
        confirmLabel="Confirmar Importação"
        cancelLabel="Cancelar"
        onConfirm={handleProcessAvImport}
        onCancel={() => setIsImportAvModalOpen(false)}
        message={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 bg-amber-50 p-2.5 rounded border border-amber-200">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-zinc-700">Data dos lançamentos:</label>
                <input
                  type="date"
                  value={importAvDate}
                  onChange={(e) => setImportAvDate(e.target.value)}
                  className="border border-zinc-300 rounded px-2 py-1 text-xs bg-white"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExistingAv}
                  onChange={(e) => setReplaceExistingAv(e.target.checked)}
                  className="rounded text-amber-600"
                />
                Substituir avarias existentes
              </label>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              Copie do Excel as duas colunas: <b>1ª Coluna = Código</b> e <b>2ª Coluna = Quantidade</b> e cole abaixo:
            </p>

            <textarea
              rows={9}
              value={pasteAvText}
              onChange={(e) => setPasteAvText(e.target.value)}
              placeholder={"503\t3\n504\t3\n9084\t3\n9085\t2\n9276\t2"}
              className="w-full p-2.5 border border-zinc-300 rounded text-xs font-mono bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-amber-500"
            />

            <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded border border-zinc-200">
              💡 A <b>Descrição</b> do produto é preenchida automaticamente pelo código e o <b>Status</b> é gravado como <b>Pendente</b>.
            </div>
          </div>
        }
      />
    </section>
  );
};
