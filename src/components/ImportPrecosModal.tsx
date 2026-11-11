import React, { useState, useRef, useMemo } from 'react';
import { readFileToText } from '../utils/importer020502';
import { processTabelaPrecos, ImportPrecosResult } from '../utils/importerPrecos';
import { RawData } from '../data/types';
import { formatBRL } from '../utils/formatters';

interface ImportPrecosModalProps {
  isOpen: boolean;
  currentData: RawData;
  onClose: () => void;
  onConfirmImport: (content: string, fileName: string) => void;
}

export const ImportPrecosModal: React.FC<ImportPrecosModalProps> = ({
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

  // Pré-visualização instantânea dos dados de preços
  const parsePreview = useMemo<ImportPrecosResult | null>(() => {
    if (!rawActiveContent || !rawActiveContent.trim()) return null;
    try {
      const fileName = selectedFileName || 'Texto Colado de Preços';
      return processTabelaPrecos(rawActiveContent, fileName, currentData);
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
        setErrorMessage('Selecione uma planilha ou arquivo de preços primeiro.');
        return;
      }
      onConfirmImport(fileContent, selectedFileName);
      onClose();
    } else {
      if (!pastedText.trim()) {
        setErrorMessage('Cole os códigos e preços na caixa abaixo.');
        return;
      }
      onConfirmImport(pastedText, 'Tabela de Preços (Colada)');
      onClose();
    }
  };

  const linesCount = (activeTab === 'file' ? fileContent : pastedText)
    ?.split('\n')
    .filter((l) => l.trim()).length || 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #ddd',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #166534, #14532D)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #4ADE80',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💰</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                Importar Tabela de Preços (Tabela 7)
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#BBF7D0' }}>
                Aba Estoque Central → Atualiza e recalcula toda a plataforma
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            background: '#f1f1f1',
            borderBottom: '1px solid #ddd',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('file');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              background: activeTab === 'file' ? '#fff' : 'transparent',
              fontWeight: activeTab === 'file' ? 'bold' : 'normal',
              color: activeTab === 'file' ? '#166534' : '#666',
              borderBottom: activeTab === 'file' ? '3px solid #166534' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            📁 Planilha de Preços (.xlsx, .xls, .csv, .txt)
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              background: activeTab === 'paste' ? '#fff' : 'transparent',
              fontWeight: activeTab === 'paste' ? 'bold' : 'normal',
              color: activeTab === 'paste' ? '#166534' : '#666',
              borderBottom: activeTab === 'paste' ? '3px solid #166534' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            📋 Colar Código e Preço
          </button>
        </div>

        {/* Body content */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {errorMessage && (
            <div
              style={{
                background: '#FDE8E8',
                color: '#9C0006',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '14px',
                fontSize: '12.5px',
                border: '1px solid #F8B4B4',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

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
                  border: isDragging ? '2px dashed #166534' : '2px dashed #94A3B8',
                  borderRadius: '8px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: isDragging ? '#F0FDF4' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.tsv,.inf,.xlsx,.xls,text/plain"
                  hidden
                  onChange={handleFileChange}
                />
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📑</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>
                  {loading
                    ? 'Lendo arquivo de preços...'
                    : selectedFileName
                    ? `Arquivo Selecionado: ${selectedFileName}`
                    : 'Clique para escolher ou arraste a Tabela de Preços (Tabela 7) aqui'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px' }}>
                  Formatos aceitos: Excel (.xlsx, .xls), CSV, TSV e TXT
                </div>
              </div>

              {selectedFileName && !loading && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#F0FDF4',
                    borderRadius: '6px',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '13px' }}>
                      ✓ {selectedFileName}
                    </span>
                    <div style={{ fontSize: '11px', color: '#555' }}>
                      {linesCount} linhas detectadas no arquivo
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    style={{
                      background: '#fff',
                      border: '1px solid #ccc',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Trocar arquivo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#555' }}>
                Cole abaixo o código do produto e o preço (separados por tabulação, ponto-e-vírgula ou vírgula):
              </p>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Codigo	Preco&#10;9067	28,95&#10;988	52,22&#10;503	19,45"
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              {pastedText.trim() && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  {linesCount} linhas coladas
                </div>
              )}
            </div>
          )}

          {/* Resultado da leitura prévia do arquivo */}
          {parsePreview && parsePreview.success && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: '#F0FDF4',
                borderRadius: '6px',
                border: '1px solid #BBF7D0',
                fontSize: '12.5px',
                color: '#166534',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✅</span>
                <span>{parsePreview.matchedCount} produtos reconhecidos na base oficial!</span>
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.4' }}>
                • Os preços das embalagens serão atualizados imediatamente.<br />
                • <b>Recálculo Automático:</b> Resumo, Grade, Estoque Central e os rankings e totais do Dashboard serão recalculados com a nova tabela.<br />
                {parsePreview.sampleUpdates && parsePreview.sampleUpdates.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '11px', background: '#fff', padding: '6px 10px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Amostra de alterações:</div>
                    {parsePreview.sampleUpdates.slice(0, 3).map((s, idx) => (
                      <div key={idx} style={{ color: '#334155' }}>
                        • <b>Cód {s.code}</b> ({s.desc}): R$ {formatBRL(s.oldPreco)} → <b>R$ {formatBRL(s.newPreco)}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {parsePreview && !parsePreview.success && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                background: '#FEF2F2',
                borderRadius: '6px',
                border: '1px solid #FECACA',
                fontSize: '12px',
                color: '#991B1B',
              }}
            >
              ⚠️ {parsePreview.message}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            background: '#f8f9fa',
            padding: '14px 20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              background: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#333',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={loading || (parsePreview ? !parsePreview.success : false)}
            style={{
              padding: '8px 22px',
              border: 'none',
              background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: '6px',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: '13px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💰</span>
            <span>Atualizar Preços e Recalcular</span>
          </button>
        </div>
      </div>
    </div>
  );
};
