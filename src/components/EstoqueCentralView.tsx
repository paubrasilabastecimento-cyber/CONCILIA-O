import React, { useState, useMemo } from 'react';
import { EstoqueCentralData, ResRow, RawData, CalculatedProduct, DashboardSnapshot } from '../data/types';
import { readFileToText } from '../utils/importer020502';
import { SaveDaily020502Modal } from './SaveDaily020502Modal';
import { Save, FolderArchive } from 'lucide-react';

interface EstoqueCentralViewProps {
  ec: EstoqueCentralData;
  res: ResRow[];
  data?: RawData;
  calculated?: CalculatedProduct[];
  snapshots?: DashboardSnapshot[];
  onSaveSnapshot?: (snapshot: DashboardSnapshot) => void;
  onImport: (content: string, fileName: string) => void;
  importBannerHtml: string | null;
  onClearBanner: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenImportModal?: () => void;
  onOpenImportPrecosModal?: () => void;
  onImportPrecos?: (content: string, fileName: string) => void;
  precosBannerHtml?: string | null;
  onClearPrecosBanner?: () => void;
  onImport020304?: (content: string, fileName: string) => void;
  ec0304BannerHtml?: string | null;
  onClearEc0304Banner?: () => void;
}

export const EstoqueCentralView: React.FC<EstoqueCentralViewProps> = ({
  ec,
  res,
  data,
  calculated = [],
  snapshots = [],
  onSaveSnapshot,
  onImport,
  importBannerHtml,
  onClearBanner,
  onNavigateToDashboard,
  onNavigateToTab,
  onOpenImportModal,
  onOpenImportPrecosModal,
  onImportPrecos,
  precosBannerHtml,
  onClearPrecosBanner,
  onImport020304,
  ec0304BannerHtml,
  onClearEc0304Banner,
}) => {
  const [query, setQuery] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [pastedPrecoText, setPastedPrecoText] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Fonte efetiva de dados da 02.05.02 exibida na tabela
  const displayedEc = ec;

  // =========================================================================
  // TABELA E FILTROS DE PESQUISA
  // =========================================================================
  const ip = useMemo(() => {
    const idx = displayedEc.h.indexOf('Produto');
    return idx >= 0 ? idx : 3;
  }, [displayedEc.h]);

  const okSet = useMemo(() => {
    return new Set(res.map((x) => x[0]));
  }, [res]);

  const { rows, totalLines, okCount, nokCount } = useMemo(() => {
    const q = query.trim().toLowerCase();
    let nok = 0;

    const mapped = (displayedEc.r || []).map((r) => {
      const prodCode = Number(r[ip]);
      const isOk = okSet.has(prodCode);
      if (!isOk) nok++;
      const statusText = isOk ? 'OK' : 'NOK';
      return {
        r,
        isOk,
        statusText,
        fullSearchText: (statusText + ' ' + r.join(' ')).toLowerCase(),
      };
    });

    const filtered = mapped.filter((item) => {
      if (!q) return true;
      return item.fullSearchText.includes(q);
    });

    return {
      rows: filtered,
      totalLines: displayedEc.r?.length || 0,
      okCount: (displayedEc.r?.length || 0) - nok,
      nokCount: nok,
    };
  }, [displayedEc.r, displayedEc.h, ip, okSet, query]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { text, fileName } = await readFileToText(file);
      onImport(text, fileName);
    } catch (err: any) {
      alert(err.message || 'Erro ao ler arquivo.');
    }
    e.target.value = '';
  };

  const handleFilePrecoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { text, fileName } = await readFileToText(file);
      if (onImportPrecos) {
        onImportPrecos(text, fileName);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao ler tabela de preços.');
    }
    e.target.value = '';
  };

  // Verifica se o dia selecionado tem snapshot
  return (
    <section>
      {/* =====================================================================
          KPIS DO RELATÓRIO EXIBIDO
      ===================================================================== */}
      <div className="kpis">
        <div className="k">
          <small>LINHAS NO ARQUIVO (ATUAL)</small>
          <span>{totalLines}</span>
        </div>
        <div className="k g">
          <small>OK (no RESUMO)</small>
          <span>{okCount}</span>
        </div>
        <div className="k r">
          <small>NOK (fora do RESUMO)</small>
          <span>{nokCount}</span>
        </div>
      </div>

      {/* =====================================================================
          BARRA DE FERRAMENTAS PRINCIPAL
      ===================================================================== */}
      <div className="tools" style={{ flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          className="btn"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(180deg, #1E3A8A 0%, #172554 100%)',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            border: '1px solid #1E40AF',
          }}
          onClick={() => setIsSaveModalOpen(true)}
          title="Salvar esta 02.05.02 para consultar na aba 02.05.02 SALVAS"
        >
          <Save size={14} color="#93C5FD" />
          <span>SALVAR 02.05.02 DO DIA</span>
        </button>



        <label
          className="btn"
          style={{
            padding: '7px 14px',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#eee',
            color: '#333',
            borderRadius: '6px',
          }}
          title="Selecionar arquivo direto (.txt, .csv, .xlsx)"
        >
          <span>📁 Importar Nova 02.05.02</span>
          <input
            type="file"
            accept=".txt,.csv,.tsv,.inf,.xlsx,.xls,text/plain"
            hidden
            onChange={handleFileChange}
          />
        </label>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar (código, produto, OK ou NOK)…"
          size={28}
          style={{ marginLeft: 'auto' }}
        />

        <button
          type="button"
          onClick={() => {
            const header = displayedEc.h.join(';');
            const lines = (displayedEc.r || []).map((row) => row.join(';'));
            const blob = new Blob(['\ufeff' + [header, ...lines].join('\r\n')], {
              type: 'text/csv;charset=utf-8;',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estoque_central_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
          }}
          className="btn"
          style={{ padding: '7px 14px', fontSize: '12px', background: '#0D9488', color: '#fff' }}
        >
          📥 Exportar CSV
        </button>

        <span>{rows.length} linhas</span>
      </div>

      {/* Banners Informativos de Atualização */}
      {importBannerHtml && (
        <div style={{ position: 'relative', margin: '0 24px 8px' }}>
          <div
            className="imp on"
            dangerouslySetInnerHTML={{ __html: importBannerHtml }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'A') {
                e.preventDefault();
                onNavigateToDashboard();
              }
            }}
          />
          <button
            type="button"
            onClick={onClearBanner}
            style={{
              position: 'absolute',
              top: '6px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#666',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {precosBannerHtml && (
        <div style={{ position: 'relative', margin: '0 24px 8px' }}>
          <div
            className="imp on"
            style={{ borderLeftColor: '#16A34A', background: '#F0FDF4' }}
            dangerouslySetInnerHTML={{ __html: precosBannerHtml }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'A') {
                e.preventDefault();
                onNavigateToDashboard();
              }
            }}
          />
          {onClearPrecosBanner && (
            <button
              type="button"
              onClick={onClearPrecosBanner}
              style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#166534',
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Áreas Expansíveis de Colagem de Texto */}
      <div style={{ display: 'flex', gap: '16px', margin: '0 24px 8px' }}>
        <details style={{ flex: 1 }}>
          <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
            ▶ Ou cole aqui o conteúdo do 02.05.02 (separado por ;)
          </summary>
          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            style={{
              width: '100%',
              marginTop: '4px',
              border: '1px solid #ccc',
              padding: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              boxSizing: 'border-box',
            }}
            placeholder="Armazem;Deposito;...;Produto;Descricao;..."
          />
          <button
            className="btn"
            style={{ padding: '4px 10px', fontSize: '11px', marginTop: '4px' }}
            onClick={() => {
              if (pastedText.trim()) {
                onImport(pastedText, '02.05.02 (Texto Colado)');
              }
            }}
          >
            Importar 02.05.02 colado
          </button>
        </details>

        <details style={{ flex: 1 }}>
          <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: '#166534' }}>
            ▶ Ou cole aqui a Tabela de Preços (Código e Preço)
          </summary>
          <textarea
            rows={4}
            value={pastedPrecoText}
            onChange={(e) => setPastedPrecoText(e.target.value)}
            style={{
              width: '100%',
              marginTop: '4px',
              border: '1px solid #A5D6A7',
              padding: '6px',
              fontFamily: 'monospace',
              fontSize: '11px',
              boxSizing: 'border-box',
            }}
            placeholder="Codigo;Preco&#10;9067;28.95&#10;988;52.22"
          />
          <button
            className="btn"
            style={{ padding: '4px 10px', fontSize: '11px', marginTop: '4px', background: '#22C55E', color: '#fff' }}
            onClick={() => {
              if (pastedPrecoText.trim() && onImportPrecos) {
                onImportPrecos(pastedPrecoText, 'Tabela de Preços (Texto Colado)');
              }
            }}
          >
            Importar Preços colados
          </button>
        </details>
      </div>

      {/* =====================================================================
          TABELA DE LINHAS DO ESTOQUE CENTRAL
      ===================================================================== */}
      <div className="wrap">
        <div className="sc" style={{ width: '100%' }}>
          <table id="table-e">
            <thead>
              <tr>
                <th>Status</th>
                {displayedEc.h.map((header, hIdx) => (
                  <th key={hIdx}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowObj, rIdx) => (
                <tr key={rIdx}>
                  <td className={rowObj.isOk ? 'ok' : 'nok'}>
                    {rowObj.statusText}
                  </td>
                  {rowObj.r.map((val, cIdx) => (
                    <td key={cIdx}>{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Salvar 02.05.02 do Dia */}
      {data && onSaveSnapshot && (
        <SaveDaily020502Modal
          isOpen={isSaveModalOpen}
          data={data}
          calculated={calculated}
          onClose={() => setIsSaveModalOpen(false)}
          onSaveSnapshot={(snapshot) => {
            onSaveSnapshot(snapshot);
            setIsSaveModalOpen(false);
          }}
        />
      )}
    </section>
  );
};
