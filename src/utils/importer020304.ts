import * as XLSX from 'xlsx';
import { RawData, EstoqueCentralData } from '../data/types';
import { parseColL } from './importer020502';

export interface Import020304Result {
  success: boolean;
  message?: string;
  matchedCount?: number;
  bannerHtml?: string;
  nextData?: RawData;
  previewItems?: { code: number; desc: string; saldo: number }[];
}

/**
 * Remove acentos e normaliza texto para comparação
 */
function normalizeStr(s: any): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Processa o relatório 02.03.04 (Posição de Estoque / Saldo Promax)
 * Suporta formatos CSV, TSV, TXT (espaçamentos fixos), e planilhas Excel convertidas
 * Identifica automaticamente colunas de Código, Descrição e Saldo/Inicial
 */
export function process020304(
  txt: string,
  nome: string,
  currentData: RawData
): Import020304Result {
  const lines = String(txt)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 1) {
    return {
      success: false,
      message: 'Arquivo 02.03.04 vazio ou sem linhas de dados.',
    };
  }

  // Detecta o separador (; , \t , | ou múltiplos espaços)
  let sep: string | RegExp = ';';
  const sample = lines.slice(0, 30).join('\n');
  const counts = {
    ';': (sample.match(/;/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
    '|': (sample.match(/\|/g) || []).length,
  };

  if (counts['\t'] >= counts[';'] && counts['\t'] >= counts[','] && counts['\t'] > 2) {
    sep = '\t';
  } else if (counts[';'] >= counts[','] && counts[';'] > 2) {
    sep = ';';
  } else if (counts['|'] > 2 && counts['|'] >= counts[';']) {
    sep = '|';
  } else if (counts[','] > 5 && counts[','] > counts[';']) {
    sep = ',';
  } else {
    // Se não encontrou delimitador padrão claro, verifica múltiplos espaços (relatórios Promax Spool/TXT)
    const spaceMatches = lines.slice(0, 10).filter((l) => /\s{2,}/.test(l)).length;
    if (spaceMatches >= 3) {
      sep = /\s{2,}|\t/;
    } else {
      sep = ';';
    }
  }

  const allRows: string[][] = lines.map((l) => {
    if (sep instanceof RegExp) {
      return l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '').trim());
    }
    return l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '').trim());
  });

  let headerIndex = -1;
  let codeIdx = -1;
  let descIdx = -1;
  let saldoIdx = -1;

  // 1. Procura cabeçalho nas primeiras 50 linhas
  for (let i = 0; i < Math.min(allRows.length, 50); i++) {
    const row = allRows[i];
    const rowNorm = row.map(normalizeStr);
    const rowStr = rowNorm.join(' ');

    const hasCodeWord = rowNorm.some(
      (c) =>
        c === 'codigo' ||
        c === 'cod' ||
        c === 'cod.' ||
        c === 'produto' ||
        c === 'cod produto' ||
        c === 'cod prod' ||
        c === 'item' ||
        c === 'mercadoria' ||
        c === 'cd'
    );

    const hasSaldoWord = rowNorm.some(
      (c) =>
        c.includes('saldo') ||
        c.includes('inicial') ||
        c.includes('estoque') ||
        c.includes('disponivel') ||
        c.includes('qtde') ||
        c.includes('qtd') ||
        c.includes('fisico')
    );

    if (hasCodeWord || (hasSaldoWord && rowStr.includes('desc'))) {
      headerIndex = i;

      // Identifica coluna de código
      rowNorm.forEach((cell, cIdx) => {
        if (
          cell === 'codigo' ||
          cell === 'cod' ||
          cell === 'cod.' ||
          cell === 'produto' ||
          cell === 'cod produto' ||
          cell === 'cod prod' ||
          cell === 'cd' ||
          cell === 'item' ||
          cell === 'mercadoria'
        ) {
          if (codeIdx === -1) codeIdx = cIdx;
        }
      });

      // Identifica coluna de descrição
      rowNorm.forEach((cell, cIdx) => {
        if (
          cell.includes('descricao') ||
          cell.includes('descr') ||
          cell.includes('nome') ||
          cell.includes('denominacao') ||
          cell.includes('especificacao')
        ) {
          if (descIdx === -1 && cIdx !== codeIdx) descIdx = cIdx;
        }
      });

      // Identifica coluna de saldo/inicial com pontuação de prioridade
      let bestScore = -1;
      rowNorm.forEach((cell, cIdx) => {
        if (cIdx === codeIdx || cIdx === descIdx) return;
        let score = -1;
        if (cell === 'saldo atual' || cell === 'saldo final') score = 100;
        else if (cell === 'saldo' || cell === 'saldo total') score = 90;
        else if (cell === 'saldo fisico' || cell === 'saldo real') score = 85;
        else if (cell === 'saldo inicial' || cell === 'inicial') score = 80;
        else if (cell === 'estoque atual' || cell === 'estoque') score = 70;
        else if (cell === 'disponivel' || cell === 'disp') score = 60;
        else if (cell === 'qtd estoque' || cell === 'quantidade' || cell === 'qtde' || cell === 'qtd') score = 50;
        else if (cell.includes('saldo')) score = 40;
        else if (cell.includes('inicial')) score = 30;

        if (score > bestScore) {
          bestScore = score;
          saldoIdx = cIdx;
        }
      });

      break;
    }
  }

  const candidateDataRows = headerIndex >= 0 ? allRows.slice(headerIndex + 1) : allRows;

  // 2. Se alguma coluna não foi encontrada pelo cabeçalho, autodetecta pelas células dos dados
  if (codeIdx === -1 || saldoIdx === -1 || descIdx === -1) {
    const colStats: {
      numericCodes: number;
      textDescriptions: number;
      quantities: number;
    }[] = [];

    const sampleRows = candidateDataRows.slice(0, 40);
    sampleRows.forEach((row) => {
      row.forEach((cell, cIdx) => {
        if (!colStats[cIdx]) {
          colStats[cIdx] = { numericCodes: 0, textDescriptions: 0, quantities: 0 };
        }
        const str = String(cell).trim();
        if (!str) return;

        // Código: inteiro numérico puro entre 10 e 99999999
        const cleanDigits = str.replace(/\D/g, '');
        const numVal = Number(cleanDigits);
        if (/^\d{3,8}$/.test(str) && numVal > 10 && numVal < 99999999) {
          colStats[cIdx].numericCodes++;
        }

        // Descrição: texto longo com letras
        if (/[a-zA-ZÀ-ÿ]{3,}/.test(str) && str.length >= 4) {
          colStats[cIdx].textDescriptions++;
        }

        // Saldo/quantidade: número positivo ou negativo ou formato cx/gf Promax
        if (
          /^[-+]?[\d.,]+(\/\d+)?-?$/.test(str) &&
          !/^\d{4,8}$/.test(str) // evita confundir com código puro
        ) {
          colStats[cIdx].quantities++;
        }
      });
    });

    if (codeIdx === -1) {
      let maxCodes = 0;
      colStats.forEach((st, idx) => {
        if (st.numericCodes > maxCodes) {
          maxCodes = st.numericCodes;
          codeIdx = idx;
        }
      });
    }

    if (descIdx === -1) {
      let maxTexts = 0;
      colStats.forEach((st, idx) => {
        if (idx !== codeIdx && st.textDescriptions > maxTexts) {
          maxTexts = st.textDescriptions;
          descIdx = idx;
        }
      });
    }

    if (saldoIdx === -1) {
      let maxQtys = 0;
      colStats.forEach((st, idx) => {
        if (idx !== codeIdx && idx !== descIdx && st.quantities > maxQtys) {
          maxQtys = st.quantities;
          saldoIdx = idx;
        }
      });
    }
  }

  // 3. Fallbacks finais baseados no layout padrão do Promax 02.03.04
  // Layout clássico: Col A (0) = Filial, Col B (1) = Código, Col C (2) = Descrição, Col E (4) = Saldo Inicial / Saldo
  if (codeIdx === -1) codeIdx = 1;
  if (descIdx === -1) descIdx = 2;
  if (saldoIdx === -1) saldoIdx = 4;

  let matchedCount = 0;
  const processedRows: (string | number)[][] = [];
  const seenCodes = new Set<number>();
  const previewItems: { code: number; desc: string; saldo: number }[] = [];

  candidateDataRows.forEach((row) => {
    if (!row || row.length === 0) return;

    // Tenta obter o código na coluna identificada
    let codeNum = 0;
    if (row[codeIdx] !== undefined && row[codeIdx] !== '') {
      const cleanDigits = String(row[codeIdx]).replace(/\D/g, '');
      const parsed = parseInt(cleanDigits, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 99999999) {
        codeNum = parsed;
      }
    }

    // Se não encontrou código na coluna esperada, tenta varrer as outras colunas (0, 1, 2)
    if (!codeNum) {
      for (const idx of [0, 1, 2]) {
        if (row[idx] !== undefined && row[idx] !== '') {
          const cleanDigits = String(row[idx]).replace(/\D/g, '');
          const parsed = parseInt(cleanDigits, 10);
          if (!isNaN(parsed) && parsed > 10 && parsed < 99999999) {
            codeNum = parsed;
            break;
          }
        }
      }
    }

    if (!codeNum || seenCodes.has(codeNum)) return;

    // Descrição
    let desc = '';
    if (descIdx >= 0 && row[descIdx]) {
      desc = String(row[descIdx]).trim();
    }
    if (!desc) {
      // Procura primeiro campo de texto não numérico
      for (let i = 0; i < row.length; i++) {
        if (i !== codeIdx && i !== saldoIdx) {
          const val = String(row[i] || '').trim();
          if (/[a-zA-ZÀ-ÿ]{3,}/.test(val)) {
            desc = val;
            break;
          }
        }
      }
    }
    if (!desc) desc = `PRODUTO ${codeNum}`;

    // Saldo / Inicial
    let saldoVal = 0;
    if (saldoIdx >= 0 && row.length > saldoIdx && row[saldoIdx] !== undefined && row[saldoIdx] !== '') {
      saldoVal = parseColL(row[saldoIdx]);
    } else if (row.length > 4 && row[4] !== undefined && row[4] !== '') {
      saldoVal = parseColL(row[4]);
    } else if (row.length > 3 && row[3] !== undefined && row[3] !== '') {
      saldoVal = parseColL(row[3]);
    }

    seenCodes.add(codeNum);
    matchedCount++;

    const rowData: (string | number)[] = [
      row[0] || '01',
      codeNum,
      desc,
      'cx',
      saldoVal,
    ];
    processedRows.push(rowData);

    if (previewItems.length < 8) {
      previewItems.push({
        code: codeNum,
        desc,
        saldo: saldoVal,
      });
    }
  });

  if (matchedCount === 0) {
    return {
      success: false,
      message: `Nenhum produto válido foi identificado no relatório 02.03.04. Verifique se o arquivo contém linhas com Códigos de produtos (ex: 10255) e valores de Saldo.`,
    };
  }

  const ec0304: EstoqueCentralData = {
    h: ['Filial', 'Cod', 'Descricao', 'UN', 'Saldo'],
    r: processedRows,
  };

  const nextData: RawData = {
    ...currentData,
    ec0304,
    desativados: currentData.desativados || [],
  };

  const bannerHtml = `Importado <b>02.03.04</b> (${nome}): <b>${matchedCount}</b> produtos carregados com sucesso na coluna Saldo da Grade!`;

  return {
    success: true,
    matchedCount,
    bannerHtml,
    nextData,
    previewItems,
  };
}
