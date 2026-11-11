import React, { useState, useMemo } from 'react';
import { RawData, CalculatedProduct } from '../data/types';
import { parseColL, readFileToText } from '../utils/importer020502';
import { Import020502Modal } from './Import020502Modal';
import { Import020304Modal } from './Import020304Modal';
import { 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Check, 
  Upload,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const getRowCode = (row: (string | number)[]): number => {
  if (!row || !Array.isArray(row)) return 0;
  for (const c of [3, 0, 1, 2]) {
    if (row[c] !== undefined && row[c] !== null) {
      const v = String(row[c]).trim().replace(/^0+/, '');
      const num = Number(v);
      if (!isNaN(num) && num > 10 && num < 99999999) {
        return num;
      }
    }
  }
  return 0;
};

export const getRowDesc = (row: (string | number)[], code: number): string => {
  if (!row || !Array.isArray(row)) return `PRODUTO ${code}`;
  for (const c of [4, 1, 2, 0]) {
    if (row[c] && typeof row[c] === 'string' && row[c].trim().length > 3 && isNaN(Number(row[c]))) {
      return row[c].trim();
    }
  }
  return `PRODUTO ${code}`;
};

export const formatGradeNumber = (v: number): string => {
  if (Math.abs(v) < 1e-9) return '0';
  const rounded = Math.round(v);
  return rounded.toLocaleString('pt-BR');
};

export interface GradeViewProps {
  data: RawData;
  calculatedMap: Record<number, CalculatedProduct>;
  calculatedProducts: CalculatedProduct[];
  onImport020502?: (content: string, fileName: string) => void;
  onImport020304?: (content: string, fileName: string) => void;
  onClear020304?: () => void;
  onImportT7?: (content: string, fileName: string) => void;
  t7BannerHtml?: string | null;
}

type SortKey = 'code' | 'desc' | 'disp020502' | 'grade' | 'saldo' | 'difGrade' | 'difMensal';

export const GradeView: React.FC<GradeViewProps> = ({
  data,
  calculatedMap,
  calculatedProducts,
  onImport020502,
  onImport020304,
  onClear020304,
  onImportT7,
  t7BannerHtml,
}) => {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'bruto' | 'ajustado'>('ajustado');
  const [filterType, setFilterType] = useState<'all' | 'dif_only' | 'neg' | 'pos' | 'zero' | 'only_020502'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [showDisp020502Col, setShowDisp020502Col] = useState(true);
  const [showDifMensalCol, setShowDifMensalCol] = useState(false);
  const [isImport020502ModalOpen, setIsImport020502ModalOpen] = useState(false);
  const [isImport020304ModalOpen, setIsImport020304ModalOpen] = useState(false);

  // Fonte de dados da 02.05.02 (prioriza gradeEc específica, com fallback para data.ec)
  const ecSource = useMemo(() => {
    if (data.gradeEc && Array.isArray(data.gradeEc.r) && data.gradeEc.r.length > 0) {
      return data.gradeEc;
    }
    if (data.ec && Array.isArray(data.ec.r) && data.ec.r.length > 0) {
      return data.ec;
    }
    return null;
  }, [data.gradeEc, data.ec]);

  // Mapeia o Saldo Promax (Disponível no Fiscal) a partir da COLUNA L da planilha 02.05.02
  const ecMap = useMemo(() => {
    const map: Record<number, { disp: number; desc?: string; tipo?: string }> = {};
    if (!ecSource || !Array.isArray(ecSource.r)) return map;

    // Detecta posições das colunas se o cabeçalho estiver presente
    const headers = (ecSource.h || []).map((h) =>
      String(h || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    );

    let pIdx = headers.findIndex((h) =>
      h === 'produto' || h === 'codigo' || h === 'cod produto' || h === 'cod prod' || h === 'cod' || h === 'mercadoria'
    );
    let dIdx = headers.findIndex((h) =>
      h.includes('descricao') || h.includes('descr') || h === 'nome'
    );
    let tIdx = headers.findIndex((h) =>
      h === 'unidade' || h === 'un' || h === 'und' || h === 'tipo'
    );
    let dispIdx = headers.findIndex((h) =>
      h === 'disponivel' || h === 'disponivel fiscal' || h === 'saldo grade real' || h === 'qtd estoque'
    );

    // Fallbacks padrão Promax
    if (pIdx < 0) pIdx = 3;
    if (dIdx < 0) dIdx = 4;
    if (tIdx < 0) tIdx = 5;
    if (dispIdx < 0) dispIdx = 11; // Coluna L (índice 11)

    ecSource.r.forEach((row) => {
      if (!row || !Array.isArray(row)) return;

      let code = 0;
      if (row[pIdx] !== undefined && row[pIdx] !== null) {
        const v = String(row[pIdx]).trim().replace(/^0+/, '');
        const num = Number(v);
        if (!isNaN(num) && num > 10 && num < 99999999) {
          code = num;
        }
      }
      if (!code) {
        code = getRowCode(row);
      }
      if (code <= 0) return;

      let dispVal = 0;
      if (row.length > dispIdx && row[dispIdx] !== undefined && row[dispIdx] !== '') {
        dispVal = parseColL(row[dispIdx]);
      } else if (row.length > 11 && row[11] !== undefined && row[11] !== '') {
        dispVal = parseColL(row[11]);
      } else if (row.length > 27 && row[27] !== undefined && row[27] !== '') {
        dispVal = parseColL(row[27]);
      }

      const desc = (row[dIdx] && String(row[dIdx]).trim()) || getRowDesc(row, code);
      const tipo = (row[tIdx] && String(row[tIdx]).trim()) || 'cx';

      map[code] = { disp: dispVal, desc, tipo };
    });

    return map;
  }, [ecSource]);

  // Mapeia o Saldo e Descrição a partir do relatório 02.03.04 (Col B = código, Col C = descrição, Col E = inicial/saldo)
  const ec0304InfoMap = useMemo(() => {
    const map: Record<number, { saldo: number; desc: string }> = {};
    if (data.ec0304 && Array.isArray(data.ec0304.r)) {
      data.ec0304.r.forEach((row) => {
        if (!row || !Array.isArray(row)) return;
        let code = 0;
        for (const idx of [1, 0, 2]) {
          if (row[idx] !== undefined && row[idx] !== null) {
            const raw = String(row[idx]).trim().replace(/\D/g, '');
            const num = Number(raw);
            if (!isNaN(num) && num > 10 && num < 99999999) {
              code = num;
              break;
            }
          }
        }
        if (!code) code = getRowCode(row);
        if (code > 0) {
          const desc = (row[2] && String(row[2]).trim()) || (row[1] && isNaN(Number(row[1])) ? String(row[1]).trim() : '') || getRowDesc(row, code);
          let inicialVal = 0;
          if (row.length > 4 && row[4] !== undefined && row[4] !== '') {
            inicialVal = parseColL(row[4]);
          } else if (row.length > 3 && row[3] !== undefined && row[3] !== '') {
            inicialVal = parseColL(row[3]);
          } else if (row.length > 2 && row[2] !== undefined && !isNaN(Number(String(row[2]).replace(',', '.')))) {
            inicialVal = parseColL(row[2]);
          }
          map[code] = { saldo: inicialVal, desc };
        }
      });
    }
    return map;
  }, [data.ec0304]);

  // Mapeia a última diferença registrada na DIF Mensal (data.men) para cada produto
  const difMensalMap = useMemo(() => {
    const map: Record<number, number> = {};

    // 1. Mapeia a partir de data.men (DIF Mensal) - busca o último dia preenchido no mês (dias 1..31)
    if (Array.isArray(data.men)) {
      data.men.forEach((row) => {
        const code = row[0];
        const days = row[4] || [];
        let lastVal: number | null = null;
        for (let i = days.length - 1; i >= 0; i--) {
          if (days[i] !== null && days[i] !== undefined) {
            lastVal = days[i];
            break;
          }
        }
        if (lastVal !== null) {
          map[code] = lastVal;
        } else if (row[3] !== null && row[3] !== undefined && row[3] !== 0) {
          map[code] = row[3];
        }
      });
    }

    // 2. Fallback para data.dia se não constar lançamento no mês (prioriza dia atual gq sobre o anterior eq)
    if (Array.isArray(data.dia)) {
      data.dia.forEach((row) => {
        const code = row[0];
        if (map[code] === undefined) {
          const val = row[2] !== 0 ? row[2] : row[1];
          if (val !== 0) map[code] = val;
        }
      });
    }

    // 3. Fallback para calculatedMap (diferença atual em caixas R) se não constar no histórico
    if (calculatedMap) {
      Object.entries(calculatedMap).forEach(([cStr, calc]) => {
        const code = Number(cStr);
        if (map[code] === undefined && calc.R !== 0) {
          map[code] = calc.R;
        }
      });
    }

    return map;
  }, [data.men, data.dia, calculatedMap]);

  // Monta as linhas da Grade conforme as colunas solicitadas:
  // 1. Codigo | 2. Descrição | 3. Disponivel na 020502 | 4. Grade | 5. Saldo | 6. Dif grade
  // Cálculo da Grade: Disponível na 02.05.02 - a DIF Mensal (ex: 16.217 - 72 = 16.145)
  // A coluna Saldo é baseada na Tabela 7 (Promax) ou sobrescrita pelo relatório 02.03.04
  const gradeRows = useMemo(() => {
    const rows: {
      code: number;
      desc: string;
      tipo: string;
      disp020502: number;
      grade: number;
      saldo: number;
      difGrade: number;
      difMensal: number;
      has020502: boolean;
      hasT7: boolean;
      isFrom0304: boolean;
      notIn0304: boolean;
    }[] = [];
    const seenCodes = new Set<number>();

    // Se a 02.05.02 foi importada, exibe APENAS os produtos que constam na 02.05.02
    if (ecSource && Array.isArray(ecSource.r)) {
      ecSource.r.forEach((row) => {
        const code = getRowCode(row);
        if (code > 0 && !seenCodes.has(code)) {
          seenCodes.add(code);
          const ecItem = ecMap[code];
          const calc = calculatedMap[code];
          const info0304 = ec0304InfoMap[code];
          const resRow = (data.res || []).find((r) => r[0] === code);

          const desc = info0304?.desc || ecItem?.desc || calc?.d || resRow?.[1] || getRowDesc(row, code);
          const tipo = ecItem?.tipo || calc?.t || resRow?.[2] || 'cx';

          // Disponível na 02.05.02 (Coluna L / Promax)
          const rawDisp = ecItem ? Math.round(ecItem.disp) : Math.round(row.length > 11 ? parseColL(row[11]) : 0);
          const disp020502 = Math.max(0, rawDisp);

          // Saldo: Se o relatório 02.03.04 foi importado, ele passa a ser a fonte de saldo oficial da Grade.
          let saldo = 0;
          let isFrom0304 = false;
          let notIn0304 = false;

          if (data.ec0304) {
            if (info0304 !== undefined) {
              saldo = Math.round(info0304.saldo);
              isFrom0304 = true;
            } else {
              saldo = 0;
              isFrom0304 = true;
              notIn0304 = true;
            }
          } else if (calc) {
            saldo = Math.round(calc.H !== undefined ? calc.H : (calc.V && calc.V > 1 ? Math.floor(calc.G / calc.V) : calc.G));
          } else if (resRow) {
            const factor = resRow[4] || 1;
            const units = resRow[3] || 0;
            saldo = Math.round(factor > 1 ? Math.floor(units / factor) : units);
          } else {
            saldo = 0;
          }

          // Última diferença registrada da DIF Mensal para este item
          const difMensal = Math.round(difMensalMap[code] || 0);

          // Grade: "disponivel da 02 05 02 - a dif mensal"
          let grade = 0;
          grade = viewMode === 'ajustado' ? Math.round(disp020502 + difMensal) : disp020502;

          const rawDif = Math.round(grade - saldo);
          const difGrade = rawDif > 0 ? 0 : rawDif;

          rows.push({
            code,
            desc,
            tipo,
            disp020502,
            grade,
            saldo,
            difGrade,
            difMensal,
            has020502: true,
            hasT7: Boolean(resRow),
            isFrom0304,
            notIn0304,
          });
        }
      });
    } else {
      // Se a 02.05.02 NÃO foi importada, exibe os produtos da Tabela 7 e/ou 02.03.04 como antes
      const resList = data.res || [];
      resList.forEach((r) => {
        const code = r[0];
        if (code > 0 && !seenCodes.has(code)) {
          seenCodes.add(code);
          const calc = calculatedMap[code];
          const info0304 = ec0304InfoMap[code];

          const desc = info0304?.desc || calc?.d || r[1] || `PRODUTO ${code}`;
          const tipo = calc?.t || r[2] || 'cx';

          const disp020502 = 0;

          let saldo = 0;
          let isFrom0304 = false;
          let notIn0304 = false;

          if (data.ec0304) {
            if (info0304 !== undefined) {
              saldo = Math.round(info0304.saldo);
              isFrom0304 = true;
            } else {
              saldo = 0;
              isFrom0304 = true;
              notIn0304 = true;
            }
          } else if (calc) {
            saldo = Math.round(calc.H !== undefined ? calc.H : (calc.V && calc.V > 1 ? Math.floor(calc.G / calc.V) : calc.G));
          } else {
            const factor = r[4] || 1;
            const units = r[3] || 0;
            saldo = Math.round(factor > 1 ? Math.floor(units / factor) : units);
          }

          const difMensal = Math.round(difMensalMap[code] || 0);
          let grade = viewMode === 'ajustado' ? Math.round(saldo + difMensal) : saldo;

          const rawDif = Math.round(grade - saldo);
          const difGrade = rawDif > 0 ? 0 : rawDif;

          rows.push({
            code,
            desc,
            tipo,
            disp020502,
            grade,
            saldo,
            difGrade,
            difMensal,
            has020502: false,
            hasT7: true,
            isFrom0304,
            notIn0304,
          });
        }
      });

      // Inclui produtos da 02.03.04 se houver e não estiverem na Tabela 7
      if (data.ec0304 && Array.isArray(data.ec0304.r)) {
        data.ec0304.r.forEach((row) => {
          const code = getRowCode(row);
          if (code > 0 && !seenCodes.has(code)) {
            seenCodes.add(code);
            const info = ec0304InfoMap[code];
            const desc = info?.desc || getRowDesc(row, code);
            const tipo = 'cx';
            const disp020502 = 0;
            const saldo = Math.round(info?.saldo || 0);
            const difMensal = Math.round(difMensalMap[code] || 0);

            let grade = viewMode === 'ajustado' ? Math.round(disp020502 + difMensal) : disp020502;
            const rawDif = Math.round(grade - saldo);
            const difGrade = rawDif > 0 ? 0 : rawDif;

            rows.push({
              code,
              desc,
              tipo,
              disp020502,
              grade,
              saldo,
              difGrade,
              difMensal,
              has020502: false,
              hasT7: false,
              isFrom0304: true,
              notIn0304: false,
            });
          }
        });
      }
    }

    // Se a 02.03.04 foi importada, remove as linhas que estiverem fora da 02.03.04 (apenas mantém os que constam na 02.03.04)
    if (data.ec0304) {
      return rows.filter((r) => !r.notIn0304);
    }

    return rows;
  }, [data.res, calculatedMap, ecSource, ecMap, difMensalMap, viewMode, ec0304InfoMap, data.ec0304]);

  // Filtragem e busca
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return gradeRows.filter((item) => {
      if (q && !(item.code + ' ' + item.desc).toLowerCase().includes(q)) {
        return false;
      }
      if (filterType === 'dif_only' && Math.abs(item.difGrade) < 1e-9) return false;
      if (filterType === 'neg' && item.difGrade >= 0) return false;
      if (filterType === 'pos' && item.difGrade <= 0) return false;
      if (filterType === 'zero' && Math.abs(item.difGrade) >= 1e-9) return false;
      if (filterType === 'only_020502' && !item.has020502) return false;
      return true;
    });
  }, [gradeRows, query, filterType]);

  // Ordenação
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let vA: any = a[sortKey];
      let vB: any = b[sortKey];

      if (typeof vA === 'string') {
        vA = vA.toLowerCase();
        vB = (vB as string).toLowerCase();
      }

      if (vA < vB) return sortAsc ? -1 : 1;
      if (vA > vB) return sortAsc ? 1 : -1;
      return a.code - b.code;
    });
  }, [filteredRows, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleExport020502Format = () => {
    // Formato solicitado: 1 / codigo do produto / fiscal em colunas separadas
    const lines = ['1;CODIGO;FISCAL'];
    sortedRows.forEach((r) => {
      const fiscalVal = Math.round(r.disp020502 || 0);
      lines.push(`1;${r.code};${fiscalVal}`);
    });
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `export_1_codigo_fiscal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyGrade = () => {
    const headers = showDisp020502Col
      ? ['CÓDIGO', 'DESCRIÇÃO', 'DISPONÍVEL NA 020502', 'GRADE', 'SALDO', 'DIF GRADE']
      : ['CÓDIGO', 'DESCRIÇÃO', 'GRADE', 'SALDO', 'DIF GRADE'];
    
    const lines = [headers.join('\t')];
    sortedRows.forEach((r) => {
      if (showDisp020502Col) {
        lines.push(
          `${r.code}\t${r.desc}\t${formatGradeNumber(r.disp020502)}\t${formatGradeNumber(r.grade)}\t${formatGradeNumber(r.saldo)}\t${formatGradeNumber(r.difGrade)}`
        );
      } else {
        lines.push(
          `${r.code}\t${r.desc}\t${formatGradeNumber(r.grade)}\t${formatGradeNumber(r.saldo)}\t${formatGradeNumber(r.difGrade)}`
        );
      }
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Contadores para métricas no topo
  const metrics = useMemo(() => {
    let neg = 0;
    let pos = 0;
    let zero = 0;
    let sumGrade = 0;
    let sumSaldo = 0;
    let in020502Count = 0;

    gradeRows.forEach((r) => {
      if (r.has020502) in020502Count++;
      sumGrade += r.grade;
      sumSaldo += r.saldo;
      if (r.difGrade < -1e-9) neg++;
      else if (r.difGrade > 1e-9) pos++;
      else zero++;
    });

    return {
      total: gradeRows.length,
      in020502Count,
      neg,
      pos,
      zero,
      difTotal: neg + pos,
      sumGrade,
      sumSaldo,
    };
  }, [gradeRows]);

  return (
    <section className="w-full flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* BARRA SUPERIOR DE INFORMAÇÕES E AÇÕES */}
      <div style={{ padding: '12px 18px 0 18px' }}>
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', 
            color: '#fff', 
            padding: '12px 16px', 
            borderRadius: '6px',
            marginBottom: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span>
              <span>GRADE PROMAX — CONCILIAÇÃO FISCAL (TABELA 7 &amp; 02.05.02)</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: ecSource ? '#059669' : '#4b5563',
                  color: '#fff',
                }}
              >
                {ecSource ? `✓ 02.05.02 (Coluna L): ${metrics.in020502Count} itens` : 'Aguardando 02.05.02'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: data.ec0304 ? '#7c3aed' : '#4b5563',
                  color: '#fff',
                }}
              >
                {data.ec0304 ? `✓ 02.03.04 (Col E Saldo): ${Object.keys(ec0304InfoMap).length} itens` : 'Aguardando 02.03.04'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#B45309',
                  color: '#fff',
                }}
              >
                Tabela 7 Ativa ({data.res?.length || 0} itens)
              </span>
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#cbd5e1' }}>
              Ao importar a 02.05.02, a Coluna L (Disponível Fiscal) atualiza a Grade automaticamente. O Saldo é baseado na Tabela 7 do Promax.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onImport020502 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label
                  style={{
                    background: ecSource ? '#059669' : '#047857',
                    color: '#fff',
                    fontWeight: 'bold',
                    padding: '7px 13px',
                    borderRadius: '5px',
                    border: '1px solid #10b981',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title="Importar arquivo 02.05.02 (Excel .xlsx, .xls ou .txt/csv) para atualizar a Coluna L e a Grade"
                >
                  <Upload size={14} />
                  <span>{ecSource ? '✓ ATUALIZAR 02.05.02' : '📥 IMPORTAR 02.05.02'}</span>
                  <input
                    type="file"
                    accept=".txt,.csv,.tsv,.xlsx,.xls,text/plain"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { text, fileName } = await readFileToText(file);
                        onImport020502(text, fileName);
                      } catch (err: any) {
                        alert(err.message || 'Erro ao ler arquivo 02.05.02.');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsImport020502ModalOpen(true)}
                  style={{
                    background: '#064e3b',
                    color: '#a7f3d0',
                    fontWeight: 'bold',
                    padding: '7px 11px',
                    borderRadius: '5px',
                    border: '1px solid #059669',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Abrir tela para colar texto ou arrastar arquivo da 02.05.02"
                >
                  <span>📋 Colar Texto</span>
                </button>
              </div>
            )}

            {onImport020304 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label
                  style={{
                    background: data.ec0304 ? '#7c3aed' : '#6d28d9',
                    color: '#fff',
                    fontWeight: 'bold',
                    padding: '7px 13px',
                    borderRadius: '5px',
                    border: '1px solid #8b5cf6',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title="Importar relatório 02.03.04 (Excel .xlsx, .xls ou .txt/csv) para alimentar a coluna Saldo"
                >
                  <FileSpreadsheet size={14} />
                  <span>{data.ec0304 ? '✓ ATUALIZAR 02.03.04' : '📥 IMPORTAR 02.03.04'}</span>
                  <input
                    type="file"
                    accept=".txt,.csv,.tsv,.xlsx,.xls,text/plain"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const { text, fileName } = await readFileToText(file);
                        onImport020304(text, fileName);
                      } catch (err: any) {
                        alert(err.message || 'Erro ao ler arquivo 02.03.04.');
                      }
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setIsImport020304ModalOpen(true)}
                  style={{
                    background: '#3b0764',
                    color: '#e9d5ff',
                    fontWeight: 'bold',
                    padding: '7px 11px',
                    borderRadius: '5px',
                    border: '1px solid #7c3aed',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Abrir tela para colar texto ou arrastar arquivo da 02.03.04"
                >
                  <span>📋 Colar 02.03.04</span>
                </button>

                {data.ec0304 && onClear020304 && (
                  <button
                    type="button"
                    onClick={onClear020304}
                    style={{
                      background: '#450a0a',
                      color: '#fca5a5',
                      fontWeight: 'bold',
                      padding: '7px 11px',
                      borderRadius: '5px',
                      border: '1px solid #dc2626',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Remover 02.03.04 e voltar a usar o saldo padrão da Tabela 7"
                  >
                    <span>🗑️ Limpar 02.03.04</span>
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleExport020502Format}
              style={{
                background: '#047857',
                color: '#fff',
                fontWeight: 'bold',
                padding: '7px 13px',
                borderRadius: '5px',
                border: '1px solid #059669',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              title="Exportar CSV no formato Grade / Código / Quantidade"
            >
              <FileSpreadsheet size={14} />
              <span>📤 EXPORTAR FORMATO 02.05.02</span>
            </button>

            <button
              type="button"
              onClick={handleCopyGrade}
              style={{
                background: copied ? '#10b981' : '#374151',
                color: '#fff',
                fontWeight: 'bold',
                padding: '7px 13px',
                borderRadius: '5px',
                border: '1px solid #4b5563',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              title="Copiar dados para colar no Excel ou Promax"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'COPIADO!' : 'COPIAR TABELA'}</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER SE HOUVER TABELA 7 RECÉM IMPORTADA */}
        {t7BannerHtml && (
          <div 
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              padding: '8px 12px',
              borderRadius: '5px',
              fontSize: '11.5px',
              marginBottom: '8px'
            }}
            dangerouslySetInnerHTML={{ __html: t7BannerHtml }}
          />
        )}

        {/* CARDS DE RESUMO RÁPIDO */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
            gap: '8px', 
            marginBottom: '8px' 
          }}
        >
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>TOTAL PRODUTOS</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{metrics.total}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10.5px', color: '#1E40AF', fontWeight: 600 }}>NA 02.05.02 (COL L)</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E3A8A' }}>{metrics.in020502Count}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10.5px', color: '#047857', fontWeight: 600 }}>CONCILIADOS (= 0)</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{metrics.zero}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10.5px', color: '#b91c1c', fontWeight: 600 }}>DIVERGÊNCIAS (DIF != 0)</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>{metrics.difTotal}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>TOTAL GRADE</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#334155' }}>{formatGradeNumber(metrics.sumGrade)}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '5px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '10.5px', color: '#854D0E', fontWeight: 600 }}>TOTAL TABELA 7</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#A16207' }}>{formatGradeNumber(metrics.sumSaldo)}</div>
          </div>
        </div>

        {/* BARRA DE FERRAMENTAS E FILTROS */}
        <div 
          style={{ 
            background: '#f8f9fa', 
            border: '1px solid #ddd', 
            padding: '8px 12px', 
            borderRadius: '5px',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '8px',
            marginBottom: '8px'
          }}
        >
          {/* Busca */}
          <div style={{ position: 'relative', minWidth: '200px', flex: '1 1 220px', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar código ou descrição…"
              style={{
                width: '100%',
                padding: '5px 24px 5px 28px',
                border: '1px solid #bbb',
                borderRadius: '3px',
                fontSize: '11.5px',
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Alternador de Coluna 'Disponível na 020502' */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowDisp020502Col(!showDisp020502Col)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: showDisp020502Col ? '#EFF6FF' : '#fff',
                color: showDisp020502Col ? '#1E40AF' : '#475569',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Exibir ou ocultar coluna Disponível na 020502"
            >
              <span>{showDisp020502Col ? '✓' : '○'}</span>
              <span>Coluna "Disponível na 020502"</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDifMensalCol(!showDifMensalCol)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: showDifMensalCol ? '#FEF2F2' : '#fff',
                color: showDifMensalCol ? '#B91C1C' : '#475569',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Exibir ou ocultar coluna DIF Mensal (última diferença apurada consultada)"
            >
              <span>{showDifMensalCol ? '✓' : '○'}</span>
              <span>Coluna "DIF Mensal (-DIF)"</span>
            </button>

            {/* Alternador de Modo de Grade: Igual 02.05.02 vs Ajustado */}
            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#E2E8F0', padding: '2px', borderRadius: '4px', border: '1px solid #CBD5E1' }}>
              <button
                type="button"
                onClick={() => setViewMode('bruto')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  borderRadius: '3px',
                  border: 'none',
                  background: viewMode === 'bruto' ? '#1E3A8A' : 'transparent',
                  color: viewMode === 'bruto' ? '#fff' : '#334155',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                title="A Grade é exatamente igual à 02.05.02"
              >
                Grade = 02.05.02
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ajustado')}
                style={{
                  padding: '3px 8px',
                  fontSize: '10.5px',
                  borderRadius: '3px',
                  border: 'none',
                  background: viewMode === 'ajustado' ? '#059669' : 'transparent',
                  color: viewMode === 'ajustado' ? '#fff' : '#334155',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                title="A Grade desconta a diferença do dia anterior (-DIF)"
              >
                Grade Ajustada (-DIF)
              </button>
            </div>
          </div>

          {/* Filtro Todos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '4px 9px',
                fontSize: '11px',
                borderRadius: '4px',
                border: filterType === 'all' ? '1.5px solid #1F2937' : '1px solid #ccc',
                background: filterType === 'all' ? '#1F2937' : '#fff',
                color: filterType === 'all' ? '#fff' : '#333',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Todos ({metrics.total})
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE GRADE COM AS COLUNAS SOLICITADAS:
          CÓDIGO | DESCRIÇÃO | DISPONÍVEL NA 020502 | GRADE | SALDO | DIF GRADE */}
      <div style={{ padding: '0 18px 24px 18px', flex: 1 }}>
        <div 
          className="sc" 
          style={{ 
            width: '100%', 
            overflowX: 'auto',
            maxHeight: 'calc(100vh - 235px)',
            background: '#fff',
            border: '1px solid #333',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <table 
            style={{ 
              width: '100%', 
              borderCollapse: 'separate', 
              borderSpacing: 0,
              fontFamily: 'Segoe UI, Calibri, Arial, sans-serif',
              fontSize: '12px'
            }}
          >
            <thead>
              <tr style={{ background: '#1F2937', color: '#fff' }}>
                {/* 1. CÓDIGO */}
                <th 
                  onClick={() => handleSort('code')}
                  style={{ 
                    background: '#1F2937', 
                    color: '#fff', 
                    padding: '8px 10px', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    width: '100px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderRight: '1px solid #374151',
                    userSelect: 'none'
                  }}
                  title="Código do Produto Promax / Fiscal"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>CÓDIGO</span>
                    {sortKey === 'code' ? (
                      sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <span style={{ opacity: 0.5 }}>▼</span>
                    )}
                  </div>
                </th>

                {/* 2. DESCRIÇÃO */}
                <th 
                  onClick={() => handleSort('desc')}
                  style={{ 
                    background: '#1F2937', 
                    color: '#fff', 
                    padding: '8px 14px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderRight: '1px solid #374151',
                    userSelect: 'none'
                  }}
                  title="Descrição completa do produto"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>DESCRIÇÃO</span>
                    {sortKey === 'desc' ? (
                      sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <span style={{ opacity: 0.5 }}>▼</span>
                    )}
                  </div>
                </th>

                {/* 3. DISPONÍVEL NA 020502 (Coluna L da Planilha 02.05.02) */}
                {showDisp020502Col && (
                  <th 
                    onClick={() => handleSort('disp020502')}
                    style={{ 
                      background: '#1E3A8A', 
                      color: '#fff', 
                      padding: '8px 10px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      width: '150px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      borderRight: '1px solid #374151',
                      userSelect: 'none'
                    }}
                    title="Disponível no Fiscal vindo da Coluna L da planilha 02.05.02"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>DISPONIVEL NA 020502</span>
                      {sortKey === 'disp020502' ? (
                        sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                      ) : (
                        <span style={{ opacity: 0.5 }}>⇅</span>
                      )}
                    </div>
                  </th>
                )}

                {/* 3.5. DIF MENSAL (Última diferença registrada) */}
                {showDifMensalCol && (
                  <th 
                    onClick={() => handleSort('difMensal')}
                    style={{ 
                      background: '#991B1B', 
                      color: '#fff', 
                      padding: '8px 10px', 
                      textAlign: 'center', 
                      cursor: 'pointer', 
                      width: '140px',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      borderRight: '1px solid #374151',
                      userSelect: 'none'
                    }}
                    title="Última diferença registrada na DIF Mensal do mês para este item"
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>DIF MENSAL (-DIF)</span>
                      {sortKey === 'difMensal' ? (
                        sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                      ) : (
                        <span style={{ opacity: 0.5 }}>⇅</span>
                      )}
                    </div>
                  </th>
                )}

                {/* 4. GRADE (Disponível na 02.05.02 - a DIF Mensal) */}
                <th 
                  onClick={() => handleSort('grade')}
                  style={{ 
                    background: '#1F2937', 
                    color: '#fff', 
                    padding: '8px 10px', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    width: '140px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderRight: '1px solid #374151',
                    userSelect: 'none'
                  }}
                  title="Cálculo da Grade: Disponível da 02.05.02 - DIF Mensal (ex: 16.217 - 72 = 16.145)"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>GRADE (DISP - DIF)</span>
                    {sortKey === 'grade' ? (
                      sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <span style={{ opacity: 0.5 }}>⇅</span>
                    )}
                  </div>
                </th>

                {/* 5. SALDO (Saldo da Tabela 7 / Promax) */}
                <th 
                  onClick={() => handleSort('saldo')}
                  style={{ 
                    background: '#1F2937', 
                    color: '#fff', 
                    padding: '8px 10px', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    width: '120px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderRight: '1px solid #374151',
                    userSelect: 'none'
                  }}
                  title="Saldo Promax apurado na Tabela 7"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>SALDO</span>
                    {sortKey === 'saldo' ? (
                      sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <span style={{ opacity: 0.5 }}>▼</span>
                    )}
                  </div>
                </th>

                {/* 6. DIF GRADE (Diferença = Grade - Saldo) */}
                <th 
                  onClick={() => handleSort('difGrade')}
                  style={{ 
                    background: '#1F2937', 
                    color: '#fff', 
                    padding: '8px 10px', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    width: '120px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    userSelect: 'none'
                  }}
                  title="Diferença da Grade = GRADE - SALDO"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>DIF GRADE</span>
                    {sortKey === 'difGrade' ? (
                      sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <span style={{ opacity: 0.5 }}>▼</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={2 + (showDisp020502Col ? 1 : 0) + (showDifMensalCol ? 1 : 0) + 3} style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
                    Nenhum produto encontrado correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                sortedRows.map((r, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? '#F8FAFC' : '#FFFFFF';

                  // Estilização da Diferença da Grade (DIF GRADE)
                  let difBg = '#C6EFCE';
                  let difColor = '#006100';

                  if (r.difGrade < -1e-9) {
                    difBg = '#FFC7CE';
                    difColor = '#9C0006';
                  } else if (r.difGrade > 1e-9) {
                    difBg = '#FFEB9C';
                    difColor = '#9C6500';
                  }

                  return (
                    <tr 
                      key={r.code}
                      style={{ 
                        borderBottom: '1px solid #e2e8f0',
                        height: '24px'
                      }}
                    >
                      {/* 1. CÓDIGO */}
                      <td 
                        style={{ 
                          background: rowBg, 
                          textAlign: 'center', 
                          padding: '3px 8px',
                          borderRight: '1px solid #e5e7eb',
                          fontFamily: 'monospace',
                          fontWeight: 500,
                          color: '#1e293b'
                        }}
                      >
                        {r.code}
                      </td>

                      {/* 2. DESCRIÇÃO */}
                      <td 
                        title={r.desc}
                        style={{ 
                          background: rowBg, 
                          textAlign: 'center', 
                          padding: '3px 12px',
                          borderRight: '1px solid #e5e7eb',
                          fontWeight: 500,
                          letterSpacing: '0.2px',
                          color: '#0f172a'
                        }}
                      >
                        {r.desc}
                      </td>

                      {/* 3. DISPONÍVEL NA 020502 (Coluna L da Planilha 02.05.02) */}
                      {showDisp020502Col && (
                        <td 
                          style={{ 
                            background: '#EFF6FF', 
                            color: '#1E40AF', 
                            textAlign: 'center', 
                            padding: '3px 8px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            borderRight: '1px solid #DBEAFE'
                          }}
                          title={`Disponível no Fiscal (Coluna L da 02.05.02)${r.has020502 ? ' [Presente na 02.05.02]' : ' [Não encontrado na 02.05.02]'}`}
                        >
                          {formatGradeNumber(r.disp020502)}
                        </td>
                      )}

                      {/* 3.5. DIF MENSAL (Última diferença registrada consultada) */}
                      {showDifMensalCol && (
                        <td 
                          style={{ 
                            background: r.difMensal < 0 ? '#FEF2F2' : r.difMensal > 0 ? '#F0FDF4' : rowBg, 
                            color: r.difMensal < 0 ? '#DC2626' : r.difMensal > 0 ? '#16A34A' : '#64748b', 
                            textAlign: 'center', 
                            padding: '3px 8px',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            borderRight: '1px solid #e5e7eb'
                          }}
                          title={`Última diferença registrada na DIF Mensal: ${r.difMensal} cx`}
                        >
                          {r.difMensal !== 0 ? (r.difMensal > 0 ? `+${formatGradeNumber(r.difMensal)}` : formatGradeNumber(r.difMensal)) : '0'} cx
                        </td>
                      )}

                      {/* 4. GRADE (Disponível da 02.05.02 - a DIF Mensal) */}
                      <td 
                        style={{ 
                          background: rowBg, 
                          textAlign: 'center', 
                          padding: '3px 8px',
                          borderRight: '1px solid #e5e7eb',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          color: '#111827'
                        }}
                        title={`Grade: Disponível 02.05.02 (${formatGradeNumber(r.disp020502)}) ${r.difMensal < 0 ? `- ${Math.abs(r.difMensal)} (DIF Mensal)` : r.difMensal > 0 ? `+ ${r.difMensal} (DIF Mensal)` : ''} = ${formatGradeNumber(r.grade)} cx`}
                      >
                        <div>{formatGradeNumber(r.grade)}</div>
                        {r.difMensal !== 0 && (
                          <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 'normal' }}>
                            {r.difMensal < 0
                              ? `(${formatGradeNumber(r.disp020502)} - ${Math.abs(r.difMensal)})`
                              : `(${formatGradeNumber(r.disp020502)} + ${r.difMensal})`}
                          </div>
                        )}
                      </td>

                      {/* 5. SALDO (Tabela 7 Promax ou 02.03.04 - Coluna Dourada Fiel ao Modelo) */}
                      <td 
                        style={{ 
                          background: r.notIn0304 ? '#fef9c3' : (r.isFrom0304 ? '#fef08a' : '#FFC000'), 
                          color: '#000', 
                          textAlign: 'center', 
                          padding: '3px 8px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          borderRight: '1px solid #cca000'
                        }}
                        title={
                          r.notIn0304
                            ? "Produto não consta no relatório 02.03.04 (Saldo = 0)"
                            : r.isFrom0304
                            ? "Saldo alimentado pelo relatório 02.03.04"
                            : "Saldo apurado na Tabela 7 do Promax"
                        }
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <span>{formatGradeNumber(r.saldo)}</span>
                          {r.isFrom0304 && !r.notIn0304 && (
                            <span
                              style={{
                                fontSize: '8.5px',
                                background: '#7c3aed',
                                color: '#fff',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                fontWeight: 700,
                              }}
                              title="Alimentado por 02.03.04"
                            >
                              03.04
                            </span>
                          )}
                          {r.notIn0304 && (
                            <span
                              style={{
                                fontSize: '8px',
                                background: '#dc2626',
                                color: '#fff',
                                padding: '1px 3px',
                                borderRadius: '3px',
                                fontWeight: 700,
                              }}
                              title="Não consta na 02.03.04 (Saldo 0)"
                            >
                              Fora da 03.04
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. DIF GRADE */}
                      <td 
                        style={{ 
                          background: difBg, 
                          color: difColor, 
                          textAlign: 'center', 
                          padding: '3px 8px',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}
                        title={`Diferença da Grade: Grade (${formatGradeNumber(r.grade)}) - Saldo (${formatGradeNumber(r.saldo)}) = ${formatGradeNumber(r.difGrade)}`}
                      >
                        {formatGradeNumber(r.difGrade)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PARA IMPORTAR / COLAR ARQUIVO DA 02.05.02 */}
      {isImport020502ModalOpen && onImport020502 && (
        <Import020502Modal
          isOpen={isImport020502ModalOpen}
          currentData={data}
          targetTab="grade"
          onClose={() => setIsImport020502ModalOpen(false)}
          onConfirmImport={(content, fileName) => {
            onImport020502(content, fileName);
            setIsImport020502ModalOpen(false);
          }}
        />
      )}

      {/* MODAL PARA IMPORTAR / COLAR ARQUIVO DA 02.03.04 */}
      {isImport020304ModalOpen && onImport020304 && (
        <Import020304Modal
          isOpen={isImport020304ModalOpen}
          currentData={data}
          onClose={() => setIsImport020304ModalOpen(false)}
          onConfirmImport={(content, fileName) => {
            onImport020304(content, fileName);
            setIsImport020304ModalOpen(false);
          }}
        />
      )}
    </section>
  );
};
