import React, { useState, useRef, useMemo } from 'react';
import { readFileToText } from '../utils/importer020502';
import { process020304, Import020304Result } from '../utils/importer020304';
import { RawData } from '../data/types';
import { N } from '../utils/formatters';
import {
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Boxes,
} from 'lucide-react';

interface Import020304ModalProps {
  isOpen: boolean;
  currentData: RawData;
  onClose: () => void;
  onConfirmImport: (content: string, fileName: string) => void;
}

export const Import020304Modal: React.FC<Import020304ModalProps> = ({
  isOpen,
  currentData,
  onClose,
  onConfirmImport,
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawActiveContent = activeTab === 'file' ? fileContent : pastedText;

  // Pré-visualização instantânea dos dados da 02.03.04
  const parsePreview = useMemo<Import020304Result | null>(() => {
    if (!rawActiveContent || !rawActiveContent.trim()) return null;
    try {
      const fileName = selectedFileName || 'Texto Colado 02.03.04';
      return process020304(rawActiveContent, fileName, currentData);
    } catch {
      return null;
    }
  }, [rawActiveContent, selectedFileName, currentData]);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { text, fileName } = await readFileToText(file);
      setSelectedFileName(fileName);
      setFileContent(text);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao ler arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleExecuteImport = () => {
    if (activeTab === 'file') {
      if (!fileContent || !selectedFileName) {
        setErrorMessage('Selecione uma planilha ou arquivo 02.03.04 primeiro.');
        return;
      }
      onConfirmImport(fileContent, selectedFileName);
      onClose();
    } else {
      if (!pastedText.trim()) {
        setErrorMessage('Cole o texto do relatório 02.03.04 na caixa abaixo.');
        return;
      }
      onConfirmImport(pastedText, 'Texto Colado 02.03.04');
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #475569',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #1e1b4b, #1e293b)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                Importar Relatório 02.03.04 (Saldo de Estoque)
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Alimenta a coluna <b>Saldo</b> da Grade para confrontar com a Grade e calcular a <b>Dif Grade</b>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs de Seleção: Arquivo vs Colar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #334155',
            backgroundColor: '#0f172a',
            padding: '0 16px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('file');
              setErrorMessage(null);
            }}
            style={{
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'file' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'file' ? '#c084fc' : '#64748b',
              cursor: 'pointer',
            }}
          >
            <Upload size={15} />
            Carregar Arquivo (Excel / TXT / CSV)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('paste');
              setErrorMessage(null);
            }}
            style={{
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'paste' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'paste' ? '#c084fc' : '#64748b',
              cursor: 'pointer',
            }}
          >
            <ClipboardPaste size={15} />
            Colar Texto (Copiar do Promax / Excel)
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'file' ? (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #a855f7' : '2px dashed #475569',
                  borderRadius: '10px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: isDragging ? 'rgba(168, 85, 247, 0.08)' : '#0f172a',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.tsv,text/plain"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#1e1b4b',
                    color: '#c084fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Upload size={24} />
                </div>
                <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600 }}>
                  {loading ? 'Lendo arquivo...' : 'Clique para selecionar ou arraste o arquivo aqui'}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  Suporta arquivos Excel (<b>.xlsx</b>, <b>.xls</b>), <b>.txt</b> e <b>.csv</b> do relatório 02.03.04
                </p>

                {selectedFileName && (
                  <div
                    style={{
                      marginTop: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      backgroundColor: '#1e1b4b',
                      border: '1px solid #7c3aed',
                      color: '#ddd6fe',
                      fontSize: '12px',
                    }}
                  >
                    <FileText size={14} />
                    <span>{selectedFileName}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#94a3b8' }}>
                Copie as linhas com os códigos e saldos diretamente do Excel ou do Promax e cole abaixo:
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui o conteúdo do relatório 02.03.04...&#10;Exemplo:&#10;Código	Descrição	Saldo&#10;10255	SKOL PILSEN 350ML	150&#10;5040	BRAHMA DUPLO MALTE	80"
                style={{
                  width: '100%',
                  height: '170px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#f8fafc',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pré-visualização dos Itens Reconhecidos */}
          {parsePreview && (
            <div
              style={{
                marginTop: '16px',
                borderRadius: '8px',
                border: parsePreview.success ? '1px solid #7c3aed' : '1px solid #f59e0b',
                backgroundColor: parsePreview.success ? 'rgba(124, 58, 237, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {parsePreview.success ? (
                    <CheckCircle2 size={16} color="#a855f7" />
                  ) : (
                    <AlertTriangle size={16} color="#f59e0b" />
                  )}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: parsePreview.success ? '#d8b4fe' : '#fcd34d',
                    }}
                  >
                    {parsePreview.success
                      ? `✓ ${parsePreview.matchedCount} produtos identificados com Saldo`
                      : parsePreview.message || 'Nenhum produto identificado'}
                  </span>
                </div>
                {parsePreview.success && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: '#7c3aed',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    Pronto para subir no Saldo
                  </span>
                )}
              </div>

              {parsePreview.previewItems && parsePreview.previewItems.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginBottom: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Amostra dos primeiros produtos a atualizar na coluna Saldo:
                  </div>
                  <div
                    style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      borderRadius: '4px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                    }}
                  >
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '4px 8px' }}>Código</th>
                          <th style={{ padding: '4px 8px' }}>Descrição</th>
                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Saldo (cx)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsePreview.previewItems.map((item, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderTop: '1px solid #1e293b',
                              color: '#cbd5e1',
                            }}
                          >
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {item.code}
                            </td>
                            <td style={{ padding: '4px 8px' }}>{item.desc}</td>
                            <td
                              style={{
                                padding: '4px 8px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                color: item.saldo > 0 ? '#38bdf8' : item.saldo < 0 ? '#f87171' : '#94a3b8',
                              }}
                            >
                              {N(item.saldo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nota informativa */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '6px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              fontSize: '11.5px',
              color: '#94a3b8',
              lineHeight: '1.5',
            }}
          >
            💡 <b>Como funciona:</b> Ao confirmar, os valores do relatório 02.03.04 preenchem a coluna <b>Saldo</b> da Grade. O sistema então confronta <b>Grade vs Saldo</b> para apurar a <b>Dif Grade</b>.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: '#0f172a',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: 'transparent',
              color: '#cbd5e1',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={!parsePreview || !parsePreview.success}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: parsePreview && parsePreview.success ? '#7c3aed' : '#475569',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: parsePreview && parsePreview.success ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: parsePreview && parsePreview.success ? '0 4px 12px rgba(124, 58, 237, 0.4)' : 'none',
            }}
          >
            <Boxes size={15} />
            <span>Confirmar e Subir para o Saldo ({parsePreview?.matchedCount || 0} itens)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
