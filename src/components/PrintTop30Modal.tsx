import React, { useRef, useState } from 'react';
import { X, Printer, Download, Camera, Check } from 'lucide-react';
import { toJpeg } from 'html-to-image';

export interface PrintTopItem {
  rank?: number;
  c: number;
  d: string;
  qtde?: number;
  R?: number;
  valor?: number;
  S?: number;
  peso?: number;
  analysis?: any;
}

interface PrintTop30ModalProps {
  isOpen: boolean;
  onClose: () => void;
  faltas: PrintTopItem[];
  sobras: PrintTopItem[];
  totalFaltas: number;
  totalSobras: number;
  saldoFinal: number;
  colorScaleF?: (val: number) => string;
  colorScaleS?: (val: number) => string;
  dateLabel?: string;
}

export const PrintTop30Modal: React.FC<PrintTop30ModalProps> = ({
  isOpen,
  onClose,
  faltas,
  sobras,
  totalFaltas,
  totalSobras,
  saldoFinal,
  colorScaleF,
  colorScaleS,
  dateLabel,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const dateText = now.toLocaleDateString('pt-BR');
  const timeText = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  const handleExportJpg = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toJpeg(reportRef.current, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `TOP_30_FALTAS_E_SOBRAS_${dateText.replace(/\//g, '-')}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar print JPG:', err);
      alert('Erro ao gerar imagem JPG. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!reportRef.current) return;
    try {
      const dataUrl = await toJpeg(reportRef.current, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard write error:', e);
      // Fallback: faz o download
      handleExportJpg();
    }
  };

  // Prepara exatamente 30 itens para cada lado
  const top30Faltas: PrintTopItem[] = faltas.slice(0, 30);
  while (top30Faltas.length < 30) {
    top30Faltas.push({ c: 0, d: '-', qtde: 0, valor: 0, peso: 0 });
  }

  const top30Sobras: PrintTopItem[] = sobras.slice(0, 30);
  while (top30Sobras.length < 30) {
    top30Sobras.push({ c: 0, d: '-', qtde: 0, valor: 0, peso: 0 });
  }

  const getPesoBg = (peso: number, isFalta: boolean) => {
    if (colorScaleF && isFalta) return colorScaleF(peso);
    if (colorScaleS && !isFalta) return colorScaleS(peso);
    if (peso >= 0.20) return '#86efac';
    if (peso >= 0.10) return '#a7f3d0';
    if (peso >= 0.04) return '#bbf7d0';
    if (peso > 0) return '#dcfce7';
    return '#ffffff';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl max-w-[1440px] w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none">
        
        {/* BARRA SUPERIOR DE AÇÕES (PRINT: HIDDEN) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#007A4D] flex items-center justify-center text-white shadow-sm">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>ESTOQUE OFICIAL GUARABIRA • TOP 30 FALTAS &amp; TOP 30 SOBRAS</span>
                <span className="text-[10px] bg-[#FFC000] text-black font-extrabold px-1.5 py-0.5 rounded">
                  MODELO OFICIAL
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                Formato exato para exportação em imagem JPG e compartilhamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJpg}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#007A4D] hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-md transition cursor-pointer disabled:opacity-50"
              title="Baixar imagem JPG idêntica ao modelo oficial"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Gerando Imagem...' : 'BAIXAR PRINT JPG'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-md border border-slate-700 transition cursor-pointer"
              title="Copiar imagem para colar diretamente no WhatsApp / Teams"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Camera className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Imagem'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFC000] hover:bg-amber-400 text-black font-bold text-xs rounded-md shadow-sm transition cursor-pointer"
              title="Imprimir relatório executivo"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA CAPTURADA PARA O PRINT JPG (100% IDÊNTICA AO PRINT OFICIAL) */}
        <div className="p-4 overflow-auto flex-1 bg-[#F1F5F9] flex justify-center">
          <div
            ref={reportRef}
            id="print-top30-container"
            style={{
              width: '1360px',
              minWidth: '1360px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1.5px solid #CBD5E1',
              padding: '12px 14px 14px 14px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              fontFamily: '"Segoe UI", "Century Gothic", Arial, sans-serif',
              boxSizing: 'border-box',
            }}
          >
            {/* CABEÇALHO AMARELO OFICIAL */}
            <div
              style={{
                background: '#FFC000',
                borderRadius: '6px',
                height: '40px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                border: '1px solid #D9A300',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    color: '#000000',
                    fontSize: '15px',
                    fontWeight: 900,
                    letterSpacing: '0.2px',
                    fontFamily: '"Segoe UI", Arial, sans-serif',
                  }}
                >
                  ESTOQUE OFICIAL GUARABIRA
                </span>

                <span
                  style={{
                    background: '#000000',
                    color: '#FFC000',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.3px',
                  }}
                >
                  TOP 30 FALTAS &amp; TOP 30 SOBRAS
                </span>
              </div>

              <div
                style={{
                  color: '#000000',
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: '"Segoe UI", Arial, sans-serif',
                }}
              >
                {dateLabel ? (
                  <span>{dateLabel} • Data: {dateText} • Hora: {timeText}</span>
                ) : (
                  <span>Data: {dateText} • Hora: {timeText}</span>
                )}
              </div>
            </div>

            {/* GRID PRINCIPAL: 2 TABELAS + PAINEL LATERAL DE TOTAIS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 185px',
                gap: '12px',
                alignItems: 'start',
              }}
            >
              {/* TABELA: RANKING DE FALTAS (TOP 30) */}
              <div
                style={{
                  border: '1.5px solid #333333',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                {/* TÍTULO AMARELO */}
                <div
                  style={{
                    background: '#FFC000',
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: 800,
                    textAlign: 'center',
                    padding: '5px 0',
                    borderBottom: '1.5px solid #333333',
                    letterSpacing: '0.3px',
                  }}
                >
                  RANKING DE FALTAS (TOP 30)
                </div>

                {/* TABELA DE FALTAS */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    fontSize: '10.5px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#000000',
                        color: '#FFFFFF',
                        height: '24px',
                        fontWeight: 800,
                        fontSize: '10px',
                      }}
                    >
                      <th style={{ width: '26px', textAlign: 'center', borderRight: '1px solid #333' }}>#</th>
                      <th style={{ width: '48px', textAlign: 'center', borderRight: '1px solid #333' }}>COD</th>
                      <th style={{ textAlign: 'center', borderRight: '1px solid #333', padding: '0 4px' }}>DESCRIÇÃO</th>
                      <th style={{ width: '44px', textAlign: 'center', borderRight: '1px solid #333' }}>QTDE</th>
                      <th style={{ width: '82px', textAlign: 'center', borderRight: '1px solid #333' }}>VALOR R$</th>
                      <th style={{ width: '40px', textAlign: 'center' }}>PESO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top30Faltas.map((item, idx) => {
                      const rank = idx + 1;
                      const q = item.qtde !== undefined ? item.qtde : item.R !== undefined ? Math.abs(item.R) : 0;
                      const v = item.valor !== undefined ? Math.abs(item.valor) : item.S !== undefined ? Math.abs(item.S) : 0;
                      const p = item.peso || 0;

                      // Status analysis
                      const statusBg = item.analysis?.bg || '#C6EFCE';
                      const statusColor = item.analysis?.color || '#006100';

                      return (
                        <tr
                          key={`f-${item.c}-${idx}`}
                          style={{
                            height: '19px',
                            borderBottom: '1px solid #E5E7EB',
                            background: '#FFFFFF',
                          }}
                        >
                          {/* # COLUNA RANKING (VERDE CLARO) */}
                          <td
                            style={{
                              textAlign: 'center',
                              background: '#C6EFCE',
                              color: '#006100',
                              fontWeight: 800,
                              fontSize: '10px',
                              borderRight: '1px solid #D1D5DB',
                              padding: '1px 0',
                            }}
                          >
                            {rank}
                          </td>

                          {/* COD */}
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 800,
                              color: '#000000',
                              fontSize: '10px',
                              borderRight: '1px solid #E5E7EB',
                              fontFamily: 'Consolas, monospace',
                              padding: '1px 0',
                            }}
                          >
                            {item.c || ''}
                          </td>

                          {/* DESCRIÇÃO */}
                          <td
                            style={{
                              padding: '0 5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 600,
                              color: '#111827',
                              fontSize: '9.8px',
                              borderRight: '1px solid #E5E7EB',
                            }}
                            title={item.d}
                          >
                            {item.d}
                          </td>

                          {/* QTDE COM STATUS */}
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '10px',
                              background: q > 0 ? statusBg : 'transparent',
                              color: q > 0 ? statusColor : '#888888',
                              borderRight: '1px solid #E5E7EB',
                              padding: '1px 0',
                            }}
                          >
                            {q > 0 ? q : ''}
                          </td>

                          {/* VALOR R$ (FORMATO INTEIRO COM SEPARADOR DE MILHAR) */}
                          <td
                            style={{
                              borderRight: '1px solid #E5E7EB',
                              padding: '0 4px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                fontSize: '10px',
                              }}
                            >
                              <span style={{ color: '#4B5563', fontSize: '9px' }}>R$</span>
                              <span style={{ fontWeight: 600, color: '#111827' }}>
                                {v > 0 ? Math.round(v).toLocaleString('pt-BR') : ''}
                              </span>
                            </div>
                          </td>

                          {/* PESO (%) COM INTENSIDADE VERDE */}
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '9.5px',
                              background: p > 0 ? getPesoBg(p, true) : '#FFFFFF',
                              color: '#000000',
                              padding: '1px 0',
                            }}
                          >
                            {p > 0 ? `${Math.round(p * 100)}%` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TABELA: RANKING DE SOBRAS (TOP 30) */}
              <div
                style={{
                  border: '1.5px solid #333333',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#FFFFFF',
                }}
              >
                {/* TÍTULO AMARELO */}
                <div
                  style={{
                    background: '#FFC000',
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: 800,
                    textAlign: 'center',
                    padding: '5px 0',
                    borderBottom: '1.5px solid #333333',
                    letterSpacing: '0.3px',
                  }}
                >
                  RANKING DE SOBRAS (TOP 30)
                </div>

                {/* TABELA DE SOBRAS */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    fontSize: '10.5px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#000000',
                        color: '#FFFFFF',
                        height: '24px',
                        fontWeight: 800,
                        fontSize: '10px',
                      }}
                    >
                      <th style={{ width: '26px', textAlign: 'center', borderRight: '1px solid #333' }}>#</th>
                      <th style={{ width: '48px', textAlign: 'center', borderRight: '1px solid #333' }}>COD</th>
                      <th style={{ textAlign: 'center', borderRight: '1px solid #333', padding: '0 4px' }}>DESCRIÇÃO</th>
                      <th style={{ width: '44px', textAlign: 'center', borderRight: '1px solid #333' }}>QTDE</th>
                      <th style={{ width: '82px', textAlign: 'center', borderRight: '1px solid #333' }}>VALOR R$</th>
                      <th style={{ width: '40px', textAlign: 'center' }}>PESO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top30Sobras.map((item, idx) => {
                      const rank = idx + 1;
                      const q = item.qtde !== undefined ? item.qtde : item.R !== undefined ? Math.abs(item.R) : 0;
                      const v = item.valor !== undefined ? Math.abs(item.valor) : item.S !== undefined ? Math.abs(item.S) : 0;
                      const p = item.peso || 0;

                      // Status analysis
                      const statusBg = item.analysis?.bg || '#C6EFCE';
                      const statusColor = item.analysis?.color || '#006100';

                      return (
                        <tr
                          key={`s-${item.c}-${idx}`}
                          style={{
                            height: '19px',
                            borderBottom: '1px solid #E5E7EB',
                            background: '#FFFFFF',
                          }}
                        >
                          {/* # COLUNA RANKING (VERDE CLARO) */}
                          <td
                            style={{
                              textAlign: 'center',
                              background: '#C6EFCE',
                              color: '#006100',
                              fontWeight: 800,
                              fontSize: '10px',
                              borderRight: '1px solid #D1D5DB',
                              padding: '1px 0',
                            }}
                          >
                            {rank}
                          </td>

                          {/* COD */}
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 800,
                              color: '#000000',
                              fontSize: '10px',
                              borderRight: '1px solid #E5E7EB',
                              fontFamily: 'Consolas, monospace',
                              padding: '1px 0',
                            }}
                          >
                            {item.c || ''}
                          </td>

                          {/* DESCRIÇÃO */}
                          <td
                            style={{
                              padding: '0 5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 600,
                              color: '#111827',
                              fontSize: '9.8px',
                              borderRight: '1px solid #E5E7EB',
                            }}
                            title={item.d}
                          >
                            {item.d}
                          </td>

                          {/* QTDE COM STATUS */}
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '10px',
                              background: q > 0 ? statusBg : 'transparent',
                              color: q > 0 ? statusColor : '#888888',
                              borderRight: '1px solid #E5E7EB',
                              padding: '1px 0',
                            }}
                          >
                            {q > 0 ? q : ''}
                          </td>

                          {/* VALOR R$ (FORMATO INTEIRO COM SEPARADOR DE MILHAR) */}
                          <td
                            style={{
                              borderRight: '1px solid #E5E7EB',
                              padding: '0 4px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                fontSize: '10px',
                              }}
                            >
                              <span style={{ color: '#4B5563', fontSize: '9px' }}>R$</span>
                              <span style={{ fontWeight: 600, color: '#111827' }}>
                                {v > 0 ? Math.round(v).toLocaleString('pt-BR') : ''}
                              </span>
                            </div>
                          </td>

                          {/* PESO (%) COM INTENSIDADE VERDE */}
                          <td
                            style={{
                              textAlign: 'center',
                              fontWeight: 800,
                              fontSize: '9.5px',
                              background: p > 0 ? getPesoBg(p, false) : '#FFFFFF',
                              color: '#000000',
                              padding: '1px 0',
                            }}
                          >
                            {p > 0 ? `${Math.round(p * 100)}%` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* COLUNA LATERAL: CARDS OFICIAIS DE TOTAIS */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  width: '100%',
                }}
              >
                {/* CARD 1: FALTAS R$ */}
                <div
                  style={{
                    border: '1.5px solid #111827',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      background: '#111827',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '5px 0',
                      letterSpacing: '0.4px',
                    }}
                  >
                    FALTAS R$
                  </div>
                  <div
                    style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ color: '#4B5563', fontSize: '13px', fontWeight: 700 }}>R$</span>
                    <span style={{ color: '#DC2626' }}>
                      {Math.round(totalFaltas).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* CARD 2: SOBRAS R$ */}
                <div
                  style={{
                    border: '1.5px solid #111827',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      background: '#111827',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '5px 0',
                      letterSpacing: '0.4px',
                    }}
                  >
                    SOBRAS R$
                  </div>
                  <div
                    style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ color: '#4B5563', fontSize: '13px', fontWeight: 700 }}>R$</span>
                    <span style={{ color: '#059669' }}>
                      {Math.round(totalSobras).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* CARD 3: SALDO FINAL */}
                <div
                  style={{
                    border: '1.5px solid #111827',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    style={{
                      background: '#111827',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      textAlign: 'center',
                      padding: '5px 0',
                      letterSpacing: '0.4px',
                    }}
                  >
                    SALDO FINAL
                  </div>
                  <div
                    style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 900,
                      background: saldoFinal < 0 ? '#FFC7CE' : saldoFinal > 0 ? '#C6EFCE' : '#FFFFFF',
                      color: saldoFinal < 0 ? '#9C0006' : saldoFinal > 0 ? '#006100' : '#111827',
                    }}
                  >
                    {saldoFinal < 0 ? '-R$ ' : saldoFinal > 0 ? '+R$ ' : 'R$ '}
                    {Math.round(Math.abs(saldoFinal)).toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* BOX 4: INFORMAÇÕES DE AUDITORIA */}
                <div
                  style={{
                    border: '1px dashed #94A3B8',
                    borderRadius: '6px',
                    background: '#F8FAFC',
                    padding: '14px 8px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: '#334155',
                      marginBottom: '4px',
                    }}
                  >
                    Relatório TOP 30
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', lineHeight: '1.4' }}>
                    30 maiores faltas apuradas<br />
                    30 maiores sobras apuradas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
