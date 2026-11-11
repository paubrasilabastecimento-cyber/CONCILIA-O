import { RawData, ResRow } from '../data/types';
import { calculateProducts, sum } from './calc';
import { Rt, formatBRL } from './formatters';

export interface ImportPrecosResult {
  success: boolean;
  message?: string;
  matchedCount?: number;
  totalParsed?: number;
  sampleUpdates?: { code: number; desc: string; oldPreco: number; newPreco: number }[];
  beforeTotals?: { tf: number; ts: number; sd: number };
  afterTotals?: { tf: number; ts: number; sd: number };
  bannerHtml?: string;
  nextData?: RawData;
}

/**
 * Converte strings numéricas em número decimal tratando padrões brasileiros e internacionais
 */
export const parsePriceNumber = (s: string | number | undefined | null): number => {
  if (s === undefined || s === null) return 0;
  if (typeof s === 'number') return isNaN(s) ? 0 : s;
  let str = String(s).trim();
  if (!str) return 0;

  // Remove símbolos de moeda e espaços
  str = str.replace(/R\$\s*/gi, '').replace(/\$/g, '').trim();

  let isNegative = false;
  if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Se tiver ponto e vírgula (ex: 1.458,50)
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) {
    // Milhar sem decimais (ex: 1.320)
    str = str.replace(/\./g, '');
  }

  const v = parseFloat(str);
  const res = isNaN(v) ? 0 : v;
  return isNegative ? -Math.abs(res) : res;
};

const normalizeStr = (s: string): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/**
 * Processa o arquivo de Tabela de Preços (Tabela 7 / Preços Promax)
 * Atualiza o preço da caixa (U) e recalcula toda a plataforma instantaneamente
 */
export function processTabelaPrecos(
  txt: string,
  fileName: string,
  currentData: RawData
): ImportPrecosResult {
  const lines = String(txt)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      message: 'O arquivo de preços está vazio ou sem linhas válidas.',
    };
  }

  // Detecta o melhor separador
  let sep = ';';
  const sample = lines.slice(0, 30).join('\n');
  const counts = {
    ';': (sample.match(/;/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
    '|': (sample.match(/\|/g) || []).length,
  };

  if (counts['\t'] > counts[';'] && counts['\t'] > counts[',']) {
    sep = '\t';
  } else if (counts[','] > counts[';'] && counts[','] > counts['\t']) {
    sep = ',';
  } else if (counts['|'] > counts[';']) {
    sep = '|';
  }

  const allRows = lines.map((l) =>
    l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '').trim())
  );

  // Procura cabeçalho
  let headerIndex = -1;
  let codIdx = -1;
  let priceIdx = -1;
  let descIdx = -1;

  for (let i = 0; i < Math.min(allRows.length, 25); i++) {
    const rowNorm = allRows[i].map(normalizeStr);
    const pIdx = rowNorm.findIndex(
      (c) =>
        c === 'produto' ||
        c === 'codigo' ||
        c === 'cod' ||
        c === 'cod produto' ||
        c === 'cod prod' ||
        c === 'mercadoria' ||
        c === 'item'
    );

    const prIdx = rowNorm.findIndex(
      (c) =>
        c.includes('preco') ||
        c.includes('valor') ||
        c.includes('tabela') ||
        c.includes('tab 7') ||
        c.includes('tab7') ||
        c === 'custo' ||
        c === 'vlr' ||
        c === 'u'
    );

    const dIdx = rowNorm.findIndex(
      (c) => c.includes('descricao') || c.includes('descr') || c === 'nome'
    );

    if (pIdx >= 0 && prIdx >= 0) {
      headerIndex = i;
      codIdx = pIdx;
      priceIdx = prIdx;
      descIdx = dIdx;
      break;
    }
  }

  let body: string[][];

  if (headerIndex >= 0) {
    body = allRows.slice(headerIndex + 1);
  } else {
    // Heurística de fallback: Coluna 0 é Código e Coluna 1 ou última é Preço
    body = allRows;
    codIdx = 0;
    // Se tiver 2 colunas: col 0 = cod, col 1 = preco
    // Se tiver 3 colunas: col 0 = cod, col 1 = desc, col 2 = preco
    priceIdx = body[0]?.length > 2 ? 2 : 1;
    descIdx = body[0]?.length > 2 ? 1 : -1;
  }

  // Mapeia preços do arquivo
  const priceMap = new Map<number, number>();
  const descMap = new Map<number, string>();

  body.forEach((r) => {
    if (!r || r.length <= codIdx) return;
    const rawCod = String(r[codIdx] || '').trim().replace(/\D/g, '');
    const code = Number(rawCod);
    if (!isNaN(code) && code > 0) {
      let pVal = 0;
      if (priceIdx >= 0 && r[priceIdx] !== undefined) {
        pVal = parsePriceNumber(r[priceIdx]);
      } else if (r.length > 1) {
        // Tenta achar a primeira coluna com número válido
        for (let col = 1; col < r.length; col++) {
          const testVal = parsePriceNumber(r[col]);
          if (testVal > 0) {
            pVal = testVal;
            break;
          }
        }
      }

      if (pVal > 0) {
        priceMap.set(code, pVal);
        if (descIdx >= 0 && r[descIdx]) {
          descMap.set(code, String(r[descIdx]).trim());
        }
      }
    }
  });

  if (priceMap.size === 0) {
    return {
      success: false,
      message:
        'Não foi possível identificar colunas válidas de Código e Preço no arquivo de Tabela de Preços.',
    };
  }

  // Totais antes da atualização dos preços
  const calcsAntes = calculateProducts(currentData).C;
  const getTotals = (calcList: typeof calcsAntes) => {
    const desativadosSet = new Set(currentData.desativados || []);
    const active = calcList.filter((p) => !desativadosSet.has(p.c) && !p.desativado);
    const tf = sum(active.filter((r) => r.S < 0), (r) => -r.S);
    const ts = sum(active.filter((r) => r.S > 0), (r) =>
      currentData.xs.includes(r.c) ? 0 : r.S
    );
    return { tf, ts, sd: ts - tf };
  };
  const antes = getTotals(calcsAntes);

  // Aplica aos produtos do RESUMO e GRADE
  let matchedCount = 0;
  const sampleUpdates: { code: number; desc: string; oldPreco: number; newPreco: number }[] = [];

  const nextRes: ResRow[] = currentData.res.map((r) => {
    const rowCopy = [...r] as ResRow;
    const code = rowCopy[0];
    if (priceMap.has(code)) {
      matchedCount++;
      const newPrice = priceMap.get(code)!;
      const oldPrice = rowCopy[5];
      rowCopy[5] = newPrice; // Atualiza U (Preço da Caixa)

      if (sampleUpdates.length < 5 && Math.abs(oldPrice - newPrice) > 0.001) {
        sampleUpdates.push({
          code,
          desc: rowCopy[1],
          oldPreco: oldPrice,
          newPreco: newPrice,
        });
      }
    }
    return rowCopy;
  });

  const nextData: RawData = {
    ...currentData,
    res: nextRes,
    gradeRes: nextRes,
    desativados: currentData.desativados || [],
  };

  // Recalcula toda a plataforma com a nova precificação
  const calcsDepois = calculateProducts(nextData).C;
  const depois = getTotals(calcsDepois);

  const dDiff = (a: number, b: number) => `${Rt(a)} → <b>${Rt(b)}</b>`;

  const bannerHtml =
    `<b>Tabela de Preços Atualizada via Estoque Central: ${fileName}</b> — <b>${matchedCount} preços</b> sincronizados.<br>` +
    `• A precificação foi aplicada no Resumo, Grade, Estoque e Dashboard com recálculo instantâneo.<br>` +
    `• TOTAL FALTAS: ${dDiff(antes.tf, depois.tf)} &nbsp; | &nbsp; TOTAL SOBRAS: ${dDiff(
      antes.ts,
      depois.ts
    )} &nbsp; | &nbsp; SALDO FINAL: ${dDiff(antes.sd, depois.sd)}`;

  return {
    success: true,
    matchedCount,
    totalParsed: priceMap.size,
    sampleUpdates,
    beforeTotals: antes,
    afterTotals: depois,
    bannerHtml,
    nextData,
  };
}
