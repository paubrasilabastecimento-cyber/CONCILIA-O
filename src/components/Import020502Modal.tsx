import React, { useState, useRef, useMemo, useEffect } from 'react';
import { readFileToText, process020502 } from '../utils/importer020502';
import { RawData } from '../data/types';

interface Import020502ModalProps {
  isOpen: boolean;
  currentData: RawData;
  targetTab?: 'dashboard' | 'ec' | 'grade';
  onClose: () => void;
  onConfirmImport: (
    content: string,
    fileName: string,
    targetTab: 'dashboard' | 'ec' | 'grade',
    autoSaveDailySnapshot?: boolean
  ) => void;
}

export const Import020502Modal: React.FC<Import020502ModalProps> = ({
  isOpen,
  currentData,
  targetTab = 'dashboard',
  onClose,
  onConfirmImport,
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [selectedTargetTab, setSelectedTargetTab] = useState<'dashboard' | 'ec' | 'grade'>(targetTab);
  const [autoSaveDailySnapshot, setAutoSaveDailySnapshot] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedTargetTab(targetTab);
    }
  }, [isOpen, targetTab]);

  const rawActiveContent = activeTab === 'file' ? fileContent : pastedText;

  // Pré-visualização instantânea dos dados do arquivo
  const parsePreview = useMemo(() => {
    if (!rawActiveContent || !rawActiveContent.trim()) return null;
    try {
      const fileName = selectedFileName || 'Texto Colado';
      const res = process020502(rawActiveContent, fileName, currentData, selectedTargetTab);
      return res;
    } catch {
      return null;
    }
  }, [rawActiveContent, selectedFileName, currentData, selectedTargetTab]);

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
        setErrorMessage('Selecione uma planilha ou arquivo 02.05.02 primeiro.');
        return;
      }
      onConfirmImport(fileContent, selectedFileName, selectedTargetTab, autoSaveDailySnapshot);
      onClose();
    } else {
      if (!pastedText.trim()) {
        setErrorMessage('Cole o texto do relatório 02.05.02 na caixa abaixo.');
        return;
      }
      onConfirmImport(pastedText, 'Dados Colados do Promax', selectedTargetTab, autoSaveDailySnapshot);
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
            background: 'linear-gradient(135deg, #111, #222)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #FFC000',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📥</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#FFC000' }}>
                Importar Relatório 02.05.02
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#ccc' }}>
                Destino: <b>{selectedTargetTab === 'dashboard' ? '📊 DASHBOARD' : selectedTargetTab === 'ec' ? '🏬 ESTOQUE CENTRAL' : '📋 GRADE'}</b> (Aba 100% independente)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#bbb',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Banner de Fluxo Centralizado */}
        <div style={{ background: '#FFFBEB', padding: '10px 18px', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🏬</span>
          <div style={{ fontSize: '11.5px', color: '#92400E', lineHeight: '1.4' }}>
            <b>Fluxo Centralizado:</b> A importação atualiza primeiro a aba <b>ESTOQUE CENTRAL</b> com todas as linhas brutas e, em seguida, atualiza e recalcula <b>toda a plataforma</b> (Resumo, Grade e Dashboard).
          </div>
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
              color: activeTab === 'file' ? '#000' : '#666',
              borderBottom: activeTab === 'file' ? '3px solid #FFB800' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            📁 Planilha / Arquivo (.xlsx, .xls, .txt, .csv)
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
              color: activeTab === 'paste' ? '#000' : '#666',
              borderBottom: activeTab === 'paste' ? '3px solid #FFB800' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            📋 Colar Dados do Promax
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
                  border: isDragging ? '2px dashed #FFB800' : '2px dashed #bbb',
                  borderRadius: '8px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: isDragging ? '#FFFDF0' : '#fafafa',
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
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>
                  {loading
                    ? 'Lendo arquivo...'
                    : selectedFileName
                    ? `Arquivo Selecionado: ${selectedFileName}`
                    : 'Clique para escolher ou arraste a planilha / arquivo do 02.05.02 aqui'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#777', marginTop: '6px' }}>
                  Compatível com Excel (.xlsx, .xls), CSV, TXT e relatórios do Promax
                </div>
              </div>

              {selectedFileName && !loading && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#E8F5E9',
                    borderRadius: '6px',
                    border: '1px solid #C8E6C9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#2E7D32', fontSize: '13px' }}>
                      ✓ {selectedFileName}
                    </span>
                    <div style={{ fontSize: '11px', color: '#555' }}>
                      {linesCount} linhas de texto detectadas
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
                Cole abaixo as linhas do relatório 02.05.02 (separadas por ponto e vírgula ou tabulação):
              </p>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Armazem;Deposito;...;Produto;Descricao;...;Qtd Estoque;Qtd Contagem..."
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
                <span>Dados Prontos para Atualizar ({parsePreview.totalParsed} produtos identificados)</span>
              </div>
              <div style={{ fontSize: '12px', color: '#374151' }}>
                {selectedTargetTab === 'grade' ? (
                  <>
                    • <b>Atualização Exclusiva da GRADE:</b> A <b>Coluna L (Disponível Fiscal)</b> atualizará diretamente os <b>{parsePreview.bodyRows?.length || 0} produtos</b> da Grade.<br />
                    • 🛡️ <b>Abas Protegidas:</b> Seu <b>Resumo, Dashboard e Estoque Central</b> permanecerão 100% intactos com suas contagens e diferenças originais.
                  </>
                ) : (
                  <>
                    • A <b>Coluna L (Disponível Fiscal)</b> atualizará diretamente a <b>GRADE</b> para todos os <b>{parsePreview.bodyRows?.length || 0} produtos</b>.<br />
                    • <b>{parsePreview.matchedCount}</b> produtos serão sincronizados na base e no <b>RESUMO</b>.<br />
                    • A conciliação e os rankings do <b>DASHBOARD</b> serão recalculados imediatamente.
                  </>
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

          {/* Opção para Salvar Automaticamente como Fechamento Histórico do Dia (Apenas quando não for exclusivo da Grade) */}
          {selectedTargetTab !== 'grade' && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 12px',
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <input
                type="checkbox"
                id="autoSaveDailyCheck"
                checked={autoSaveDailySnapshot}
                onChange={(e) => setAutoSaveDailySnapshot(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label
                htmlFor="autoSaveDailyCheck"
                style={{ fontSize: '12px', color: '#166534', cursor: 'pointer', fontWeight: 600 }}
              >
                💾 Salvar automaticamente esta importação como o <b>Fechamento / 02.05.02 do dia de hoje ({new Date().toLocaleDateString('pt-BR')})</b>
              </label>
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
              background: 'linear-gradient(180deg, #FFD34D 0%, #FFB800 100%)',
              color: '#000',
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
            <span>📥</span>
            <span>Atualizar Plataforma Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
