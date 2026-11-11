import React, { useState, useMemo } from 'react';
import { CalculatedProduct } from '../data/types';
import { N, Z, Rt } from '../utils/formatters';
import { sum } from '../utils/calc';

interface ResumoViewProps {
  calculated: CalculatedProduct[];
  onUpdateRes: (index: number, key: 'G' | 'J', value: number) => void;
  onImportT7: (content: string, fileName: string) => void;
  t7BannerHtml: string | null;
  ecBannerHtml?: string | null;
  onRecontar?: (code: number) => void;
  onNavigateToDashboard?: () => void;
}

const format2Dec = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const ResumoView: React.FC<ResumoViewProps> = ({
  calculated,
  onUpdateRes,
  onImportT7,
  t7BannerHtml,
  ecBannerHtml,
  onRecontar,
  onNavigateToDashboard,
}) => {
  const [query, setQuery] = useState('');
  const [activeEditCell, setActiveEditCell] = useState<{ index: number; key: 'G' | 'J' } | null>(null);

  const handleFileT7Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(
          reader.result as ArrayBuffer
        );
      } catch {
        text = new TextDecoder('windows-1252').decode(
          reader.result as ArrayBuffer
        );
      }
      onImportT7(text, file.name);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const kpis = useMemo(() => {
    const active = calculated.filter((r) => !r.desativado);

    const dif = sum(active, (r) => r.S);
    const hf = sum(active, (r) => r.Y);
    const hp = sum(active, (r) => r.Z);
    const so = active.filter((r) => r.R > 0).length;
    const fa = active.filter((r) => r.R < 0).length;
    const ok = active.filter((r) => r.R === 0).length;
    const totalCount = so + fa + ok || 1;
    const toolkit = ((ok / totalCount) * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + '%';

    return {
      date: new Date().toLocaleDateString('pt-BR'),
      dif,
      hf,
      hp,
      difHecto: hf - hp,
      estFiscal: sum(active, (r) => r.I),
      estFisico: sum(active, (r) => r.L),
      so,
      fa,
      ok,
      toolkit,
    };
  }, [calculated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calculated
      .map((r, index) => ({ ...r, originalIndex: index }))
      .filter((r) => {
        if (!q) return true;
        return (r.c + ' ' + r.d).toLowerCase().includes(q);
      });
  }, [calculated, query]);

  const sg = (v: number) => (v < 0 && !Z(v) ? '-' : '') + N(v, 0);

  return (
    <section>
      {/* =====================================================================
          CABEÇALHO OFICIAL DO RESUMO (IDÊNTICO À FOTO FORNECIDA PELO USUÁRIO)
      ===================================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '10px 0 16px',
          overflowX: 'auto',
          paddingBottom: '4px',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        }}
      >
        {/* BLOCO 1: DATA, DIF EM REAIS, DIF EM HECTO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '170px 280px',
            gridTemplateRows: 'repeat(3, 33px)',
            border: '2px solid #FFFFFF',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          {/* Linha 1: DATA */}
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '2px solid #FFFFFF',
              borderBottom: '2px solid #FFFFFF',
              letterSpacing: '0.4px',
            }}
          >
            DATA
          </div>
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '23px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '2px solid #FFFFFF',
              letterSpacing: '0.5px',
            }}
          >
            {kpis.date}
          </div>

          {/* Linha 2: DIF EM REAIS */}
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '2px solid #FFFFFF',
              borderBottom: '2px solid #FFFFFF',
              letterSpacing: '0.3px',
            }}
          >
            DIF EM REAIS
          </div>
          <div
            style={{
              background: kpis.dif < 0 ? '#FFD6D9' : '#D4EDDA',
              color: kpis.dif < 0 ? '#B91C1C' : '#15803D',
              fontWeight: 800,
              fontSize: '14.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 14px',
              borderBottom: '2px solid #FFFFFF',
              fontFamily: 'monospace',
            }}
          >
            <span>{kpis.dif < 0 ? '-R$' : 'R$'}</span>
            <span>{format2Dec(Math.abs(kpis.dif))}</span>
          </div>

          {/* Linha 3: DIF EM HECTO */}
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '2px solid #FFFFFF',
              letterSpacing: '0.3px',
            }}
          >
            DIF EM HECTO
          </div>
          <div
            style={{
              background: kpis.difHecto >= 0 ? '#D4EDDA' : '#FFD6D9',
              color: kpis.difHecto >= 0 ? '#15803D' : '#B91C1C',
              fontWeight: 800,
              fontSize: '14.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
            }}
          >
            <span>{format2Dec(kpis.difHecto)}</span>
          </div>
        </div>

        {/* BLOCO 2: FISCAL E FÍSICO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '135px 125px',
            gridTemplateRows: 'repeat(4, 25px)',
            border: '1px solid #1E293B',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          {/* Cabeçalho 1 */}
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
            }}
          >
            2
          </div>
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #1E293B',
            }}
          >
            HECTO FISCAL
          </div>

          {/* Valores 1 */}
          <div
            style={{
              background: '#F1F5F9',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ fontSize: '10.5px' }}>R$</span>
            <span>{format2Dec(kpis.estFiscal)}</span>
          </div>
          <div
            style={{
              background: '#F1F5F9',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #1E293B',
              fontFamily: 'monospace',
            }}
          >
            {format2Dec(kpis.hf)}
          </div>

          {/* Cabeçalho 2 */}
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
            }}
          >
            ESTOQUE FÍSICO
          </div>
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #1E293B',
            }}
          >
            HECTO FÍSICO
          </div>

          {/* Valores 2 */}
          <div
            style={{
              background: '#F1F5F9',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
              borderRight: '1px solid #1E293B',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ fontSize: '10.5px' }}>R$</span>
            <span>{format2Dec(kpis.estFisico)}</span>
          </div>
          <div
            style={{
              background: '#F1F5F9',
              color: '#0F172A',
              fontWeight: 800,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
            }}
          >
            {format2Dec(kpis.hp)}
          </div>
        </div>

        {/* BLOCO: TOOLKIT + SOBRAS / FALTAS / OK */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 85px)',
            gridTemplateRows: 'repeat(4, 25px)',
            border: '1px solid #1E293B',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        >
          {/* Linha 1 do Topo: TOOLKIT */}
          <div style={{ background: '#FFFFFF', borderRight: '1px solid #1E293B', borderBottom: '1px solid #1E293B' }} />
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
            }}
          >
            TOOLKIT
          </div>
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #1E293B' }} />

          {/* Linha 2: Valor do TOOLKIT */}
          <div style={{ background: '#FFFFFF', borderRight: '1px solid #1E293B', borderBottom: '1px solid #1E293B' }} />
          <div
            style={{
              background: '#FFD6D9',
              color: '#B91C1C',
              fontWeight: 800,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
            }}
          >
            {kpis.toolkit}
          </div>
          <div style={{ background: '#FFFFFF', borderBottom: '1px solid #1E293B' }} />

          {/* Linha 3: Cabeçalhos SOBRAS | FALTAS | OK */}
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
            }}
          >
            SOBRAS
          </div>
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              borderBottom: '1px solid #1E293B',
            }}
          >
            FALTAS
          </div>
          <div
            style={{
              background: '#3A3A3A',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #1E293B',
            }}
          >
            OK
          </div>

          {/* Linha 4: Valores SOBRAS | FALTAS | OK */}
          <div
            style={{
              background: '#FFFFFF',
              color: '#000000',
              fontWeight: 800,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              fontFamily: 'monospace',
            }}
          >
            {kpis.so}
          </div>
          <div
            style={{
              background: '#FFFFFF',
              color: '#000000',
              fontWeight: 800,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #1E293B',
              fontFamily: 'monospace',
            }}
          >
            {kpis.fa}
          </div>
          <div
            style={{
              background: '#FFFFFF',
              color: '#000000',
              fontWeight: 800,
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
            }}
          >
            {kpis.ok}
          </div>
        </div>
      </div>

      <div className="tools">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar código ou produto…"
          size={32}
        />
        <span>{filtered.length} linhas</span>
        <label
          className="btn"
          style={{ padding: '6px 14px', fontSize: '13px', cursor: 'pointer' }}
        >
          IMPORTAR TABELA 7
          <input
            type="file"
            accept=".txt,.csv,.tsv,text/plain"
            hidden
            onChange={handleFileT7Change}
          />
        </label>
        <small style={{ color: '#555' }}>
          Sem blocos manuais: exibição limpa e contínua. Clique em qualquer valor de Disponível ou Inventário para ajustar.
        </small>
      </div>

      {ecBannerHtml && (
        <div
          className="imp on"
          dangerouslySetInnerHTML={{ __html: ecBannerHtml }}
          style={{ marginBottom: '8px' }}
        />
      )}

      {t7BannerHtml && (
        <div
          className="imp on"
          dangerouslySetInnerHTML={{ __html: t7BannerHtml }}
        />
      )}

      <div className="wrap">
        <div className="sc" style={{ width: '100%' }}>
          <table id="table-r">
            <colgroup>
              {[56, 330, 40, 70, 50, 92, 70, 50, 92, 56, 44, 56, 56, 62, 52, 92, 66, 76, 46, 70, 60, 72, 72].map(
                (w, idx) => (
                  <col key={idx} width={w} />
                )
              )}
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2}>COD</th>
                <th rowSpan={2}>DESCRIÇÃO PRODUTO</th>
                <th rowSpan={2}>TIPO</th>
                <th colSpan={3}>DISPONIVEL PROMAX</th>
                <th colSpan={3}>INVENTARIO</th>
                <th colSpan={4}>AJUSTES</th>
                <th colSpan={2}>DIFERENÇAS</th>
                <th rowSpan={2}>DIF R$</th>
                <th rowSpan={2}>JUSTIF.</th>
                <th rowSpan={2}>PREÇO CX</th>
                <th rowSpan={2}>FATOR</th>
                <th rowSpan={2}>PREÇO UND</th>
                <th rowSpan={2}>FATOR HECTO</th>
                <th rowSpan={2}>HECTO FISCAL</th>
                <th rowSpan={2}>HECTO FÍSICO</th>
              </tr>
              <tr className="h2">
                <th>UNID</th>
                <th>CX</th>
                <th>VALOR R$</th>
                <th>UNID</th>
                <th>CX</th>
                <th>VALOR R$</th>
                <th>SOBRAS</th>
                <th>PNC</th>
                <th>FALTAS</th>
                <th>REPACK</th>
                <th>DIF UNID</th>
                <th>DIF CX</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.c}>
                  <td 
                    className="c font-mono"
                    style={{ cursor: 'pointer', fontWeight: 'bold' }}
                    onDoubleClick={() => onRecontar && onRecontar(r.c)}
                    title="Dê DUPLO CLIQUE para abrir este item na Recontagem"
                  >
                    {r.c}
                  </td>
                  <td title={r.d}>{r.d}</td>
                  <td className="c">{r.t}</td>
                  <td
                    className="n ed-cell"
                    onClick={() => setActiveEditCell({ index: r.originalIndex, key: 'G' })}
                    title="Clique para editar Disponível Promax"
                    style={{ cursor: 'pointer' }}
                  >
                    {activeEditCell?.index === r.originalIndex && activeEditCell?.key === 'G' ? (
                      <input
                        autoFocus
                        defaultValue={r.G}
                        key={`g-${r.c}-${r.G}`}
                        onBlur={(e) => {
                          const val = Number(e.target.value.replace(',', '.')) || 0;
                          if (val !== r.G) onUpdateRes(r.originalIndex, 'G', val);
                          setActiveEditCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Number((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                            if (val !== r.G) onUpdateRes(r.originalIndex, 'G', val);
                            setActiveEditCell(null);
                          }
                          if (e.key === 'Escape') {
                            setActiveEditCell(null);
                          }
                        }}
                      />
                    ) : (
                      <span>{r.G}</span>
                    )}
                  </td>
                  <td className="n">{r.H}</td>
                  <td className="n">{N(r.I)}</td>
                  <td
                    className="n ed-cell"
                    onClick={() => setActiveEditCell({ index: r.originalIndex, key: 'J' })}
                    title="Clique para editar Inventário Físico"
                    style={{ cursor: 'pointer' }}
                  >
                    {activeEditCell?.index === r.originalIndex && activeEditCell?.key === 'J' ? (
                      <input
                        autoFocus
                        defaultValue={r.J}
                        key={`j-${r.c}-${r.J}`}
                        onBlur={(e) => {
                          const val = Number(e.target.value.replace(',', '.')) || 0;
                          if (val !== r.J) onUpdateRes(r.originalIndex, 'J', val);
                          setActiveEditCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Number((e.target as HTMLInputElement).value.replace(',', '.')) || 0;
                            if (val !== r.J) onUpdateRes(r.originalIndex, 'J', val);
                            setActiveEditCell(null);
                          }
                          if (e.key === 'Escape') {
                            setActiveEditCell(null);
                          }
                        }}
                      />
                    ) : (
                      <span>{r.J}</span>
                    )}
                  </td>
                  <td className="n">{r.K}</td>
                  <td className="n">{N(r.L)}</td>
                  <td className="n">{r.M}</td>
                  <td className="n">{r.N}</td>
                  <td className="n">{r.O}</td>
                  <td className="n">{r.P}</td>
                  <td className="n">{sg(r.Q)}</td>
                  <td className="n">{sg(r.R)}</td>
                  <td className={`n ${r.S < 0 ? 'neg' : ''}`}>
                    {(r.S < 0 ? '-' : '') + N(r.S)}
                  </td>
                  <td className="n">{r.T}</td>
                  <td className="n">{N(r.U)}</td>
                  <td className="n">{r.V}</td>
                  <td className="n">{N(r.W)}</td>
                  <td className="n">{r.X}</td>
                  <td className="n">{N(r.Y)}</td>
                  <td className="n">{N(r.Z)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
