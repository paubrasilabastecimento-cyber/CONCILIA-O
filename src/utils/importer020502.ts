import * as XLSX from 'xlsx';
import { RawData, ResRow, DiaRow } from '../data/types';
import { calculateProducts, sum } from './calc';
import { Rt } from './formatters';

export interface Import020502Result {
  success: boolean;
  message?: string;
  bodyRows?: (string | number)[][];
  headerRow?: string[];
  matchedCount?: number;
  unmatchedCount?: number;
  totalParsed?: number;
  beforeTotals?: { tf: number; ts: number; sd: number };
  afterTotals?: { tf: number; ts: number; sd: number };
  bannerHtml?: string;
  nextData?: RawData;
}

export const parseNumber = (s: string | number): number => {
  if (typeof s === 'number') return isNaN(s) ? 0 : Math.round(s);
  let str = String(s ?? '').trim();
  if (!str) return 0;

  // Trata formato caixa/garrafa Promax (ex.: "476/06", "1.320/02", "3/02-", "0/00")
  let isNegative = false;
  if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  if (str.includes('/')) {
    const parts = str.split('/');
    let cx = parts[0].trim().replace(/\./g, '');
    let gf = parts[1].trim().replace(/\./g, '');
    const numCx = parseFloat(cx) || 0;
    const numGf = parseFloat(gf) || 0;
    // Se tiver apenas caixas e garrafas ou decimais
    const total = numCx + numGf / 100;
    return isNegative ? -Math.round(total) : Math.round(total);
  }

  // Número padrão com vírgula ou ponto (ex: "5.538" ou "5538,00" ou "5538")
  if (str.includes(',') && str.includes('.')) {
    // Ex: 1.458,50 -> remove ponto, troca vírgula por ponto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) {
    // Ex: 1.320 ou 25.800 (ponto como milhar)
    str = str.replace(/\./g, '');
  }

  const v = parseFloat(str);
  const res = isNaN(v) ? 0 : Math.round(v);
  return isNegative ? -Math.abs(res) : res;
};

/**
 * Converte o valor da Coluna L (12ª coluna, índice 11 - Disponível Fiscal) do relatório 02.05.02
 * Trata números inteiros, decimais e o formato de caixas Promax ("476/06", "1.320/02", "0/00")
 */
export const parseColL = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  let str = String(val).trim();
  if (!str) return 0;

  let isNegative = false;
  if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Formato Promax caixas/garrafas (ex.: "476/06", "1.320/02", "3/02-", "0/00")
  if (str.includes('/')) {
    const parts = str.split('/');
    const cx = parseFloat(parts[0].replace(/\./g, '')) || 0;
    const gf = parseFloat(parts[1].replace(/\./g, '')) || 0;
    const total = gf > 0 ? cx + gf / 100 : cx;
    return isNegative ? -Math.round(total) : Math.round(total);
  }

  // Número padrão com vírgula ou ponto (ex: "5.538" ou "5538,00" ou "5538")
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  }

  const v = parseFloat(str);
  const res = isNaN(v) ? 0 : Math.round(v);
  return isNegative ? -Math.abs(res) : res;
};

/**
 * Converte valor do Promax (cx/gf ou número) em UNIDADES totais usando o fator da embalagem
 * Ex: "461/06" com fator 12 => 461 * 12 + 6 = 5538 unidades
 */
export const parsePromaxToUnits = (
  val: string | number | undefined | null,
  factor: number = 1
): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;

  let isNegative = false;
  if (str.endsWith('-')) {
    isNegative = true;
    str = str.slice(0, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  if (str.includes('/')) {
    const parts = str.split('/');
    const cx = parseFloat(parts[0].replace(/\./g, '')) || 0;
    const gf = parseFloat(parts[1].replace(/\./g, '')) || 0;
    const f = factor > 0 ? factor : 1;
    const totalUnits = cx * f + gf;
    return isNegative ? -totalUnits : totalUnits;
  }

  const parsed = parseNumber(str);
  return isNegative ? -Math.abs(parsed) : parsed;
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
 * Lê o arquivo bruto (Excel .xlsx/.xls ou Texto .txt/.csv/.tsv/.inf) e converte em texto separado por delimitador
 */
export async function readFileToText(file: File): Promise<{ text: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
          
          // Se tiver múltiplas abas, tenta achar a aba correspondente ao tipo do arquivo
          let targetSheetName = workbook.SheetNames[0];
          const fileNameLower = file.name.toLowerCase();
          const is0304File = fileNameLower.includes('0304') || fileNameLower.includes('03.04') || fileNameLower.includes('saldo');

          for (const name of workbook.SheetNames) {
            const n = name.toLowerCase();
            if (is0304File && (n.includes('02.03.04') || n.includes('020304') || n.includes('03.04') || n.includes('saldo') || n.includes('posicao'))) {
              targetSheetName = name;
              break;
            }
            if (n.includes('02.05.02') || n.includes('02 05 02') || n.includes('020502') || n.includes('estoque') || n.includes('central') || n.includes('grade')) {
              targetSheetName = name;
              break;
            }
          }

          const worksheet = workbook.Sheets[targetSheetName];
          // Converte com sheet_to_json ou sheet_to_csv garantindo que nenhum dado seja cortado
          const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';', blankrows: false });
          resolve({ text: csv, fileName: file.name });
        } catch (err) {
          reject(new Error('Erro ao ler planilha Excel: ' + (err as Error).message));
        }
      };
      reader.onerror = () => reject(new Error('Falha na leitura do arquivo'));
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        let text = '';
        const buffer = reader.result as ArrayBuffer;
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch {
          text = new TextDecoder('windows-1252').decode(buffer);
        }
        resolve({ text, fileName: file.name });
      };
      reader.onerror = () => reject(new Error('Falha na leitura do arquivo'));
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Processa o conteúdo do arquivo 02.05.02 e calcula o novo estado da aplicação
 * Garante que TUDO que tem no Excel vem para a plataforma (todas as linhas e colunas)
 */
export function process020502(
  txt: string,
  nome: string,
  currentData: RawData,
  targetTab: 'dashboard' | 'ec' | 'grade' | 'all' = 'dashboard'
): Import020502Result {
  const lines = String(txt)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      message: 'Arquivo vazio ou sem linhas suficientes de dados.',
    };
  }

  // Detecta o melhor separador
  let sep = ';';
  const firstLines = lines.slice(0, 20).join('\n');
  const counts = {
    ';': (firstLines.match(/;/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
    ',': (firstLines.match(/,/g) || []).length,
    '|': (firstLines.match(/\|/g) || []).length,
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

  // Procura a linha de cabeçalho
  let headerIndex = -1;
  let ip = -1; // Produto / Código
  let id = -1; // Descrição
  let it = -1; // Unidade / Tipo
  let ie = -1; // Qtd Estoque / Saldo Atual
  let ic = -1; // Qtd Contagem / Inventário

  for (let i = 0; i < Math.min(allRows.length, 30); i++) {
    const rowNorm = allRows[i].map(normalizeStr);
    const pIdx = rowNorm.findIndex(
      (c) =>
        c === 'produto' ||
        c === 'cod produto' ||
        c === 'codigo' ||
        c === 'cod prod' ||
        c === 'cod' ||
        c === 'mercadoria' ||
        c === 'cod mercadoria'
    );
    const dIdx = rowNorm.findIndex(
      (c) => c.includes('descricao') || c.includes('descr') || c === 'nome'
    );
    const tIdx = rowNorm.findIndex(
      (c) => c === 'unidade' || c === 'un' || c === 'und' || c === 'tipo'
    );
    
    // Qtd Estoque / Disponível
    const eIdx = rowNorm.findIndex(
      (c) =>
        c === 'qtd estoque' ||
        c.includes('qtd estoque') ||
        c === 'disponivel' ||
        c === 'saldo atual' ||
        c.includes('saldo atual') ||
        c === 'estoque' ||
        c === 'saldo'
    );

    // Qtd Contagem / Inventário
    const cIdx = rowNorm.findIndex(
      (c) =>
        c === 'qtd contagem' ||
        c.includes('qtd contagem') ||
        c === 'inventario' ||
        c.includes('inventario') ||
        c === 'contagem'
    );

    if (pIdx >= 0 && (dIdx >= 0 || eIdx >= 0 || cIdx >= 0 || i === 0)) {
      headerIndex = i;
      ip = pIdx;
      id = dIdx >= 0 ? dIdx : pIdx + 1;
      it = tIdx >= 0 ? tIdx : pIdx + 2;
      ie = eIdx >= 0 ? eIdx : -1;
      ic = cIdx >= 0 ? cIdx : -1;
      break;
    }
  }

  let body: (string | number)[][];
  let header: string[];

  if (headerIndex >= 0) {
    header = allRows[headerIndex];
    body = allRows.slice(headerIndex + 1);
  } else {
    // Fallback padrão relatório Promax 02.05.02
    ip = 3;
    id = 4;
    it = 5;
    ie = 27;
    ic = 28;
    header = currentData.ec?.h || [];
    body = allRows;
  }

  // Se ie ou ic não foram achados no cabeçalho, procura se existem as colunas 27/28 ou 11/12
  if (ie < 0) {
    if (body.some((r) => r.length > 27)) ie = 27;
    else if (body.some((r) => r.length > 11)) ie = 11;
  }
  if (ic < 0) {
    if (body.some((r) => r.length > 28)) ic = 28;
    else if (body.some((r) => r.length > 12)) ic = 12;
  }

  // Se a coluna de produto não foi encontrada ou é inválida, localiza a coluna que mais possui códigos de produto
  // IMPORTANTE: Coluna 0 é Armazém ('01'), NUNCA produto. Padrão Promax 02.05.02 é ip = 3.
  const sampleData = body.slice(0, 50);
  const isStandardPromax020502 = sampleData.some(
    (r) =>
      r.length > 5 &&
      (String(r[0] || '').trim() === '01' || String(r[0] || '').trim() === '1') &&
      /^\d+$/.test(String(r[3] || '').trim().replace(/^0+/, '')) &&
      /[a-zA-Z]/.test(String(r[4] || ''))
  );

  if (isStandardPromax020502) {
    ip = 3;
    id = 4;
    it = 5;
    if (ie < 0) ie = body.some((r) => r.length > 27) ? 27 : 11;
    if (ic < 0) ic = body.some((r) => r.length > 28) ? 28 : 12;
  } else if (ip < 0) {
    const maxCols = Math.max(...sampleData.map((r) => r.length), 0);
    let bestCol = -1;
    let maxValidCodes = 0;

    // Procura colunas a partir do índice 1 (nunca coluna 0 que é armazém)
    for (let c = 1; c < maxCols; c++) {
      let count = 0;
      for (const r of sampleData) {
        const v = String(r[c] || '').trim().replace(/^0+/, '');
        const num = Number(v);
        // Código de produto válido no Promax tem mais de 2 dígitos e coluna adjacente com descrição
        if (!isNaN(num) && num >= 100 && num < 9999999) {
          count++;
        }
      }
      if (count > maxValidCodes) {
        maxValidCodes = count;
        bestCol = c;
      }
    }

    if (bestCol >= 1 && maxValidCodes >= 5) {
      ip = bestCol;
      if (id <= ip) id = ip + 1;
      if (it <= ip) it = ip + 2;
    } else {
      ip = 3;
      id = 4;
      it = 5;
    }
  }

  // Filtra linhas com código de produto válido
  body = body.filter((r) => {
    if (!r || r.length <= ip) return false;
    const codeStr = String(r[ip] || '').trim().replace(/^0+/, '');
    const codeNum = Number(codeStr);
    if (isNaN(codeNum) || codeNum <= 0 || codeNum >= 99999999) return false;
    return true;
  });

  if (body.length < 20) {
    return {
      success: false,
      message:
        `O arquivo enviado contém apenas ${body.length} produtos válidos. Para proteger a conciliação contra perdas ou corrupção acidental, relatórios com menos de 20 produtos são rejeitados. A base atual foi preservada com total segurança.`,
    };
  }

  // Totais antes da importação
  const getTotals = (calcList: ReturnType<typeof calculateProducts>['C']) => {
    const desativadosSet = new Set(currentData.desativados || []);
    const active = calcList.filter((p) => !desativadosSet.has(p.c) && !p.desativado);
    const tf = sum(active.filter((r) => r.S < 0), (r) => -r.S);
    const ts = sum(active.filter((r) => r.S > 0), (r) =>
      currentData.xs.includes(r.c) ? 0 : r.S
    );
    return { tf, ts, sd: ts - tf };
  };

  const calcsAntes = calculateProducts(currentData).C;
  const antes = getTotals(calcsAntes);

  // Mapeia todas as linhas do arquivo Excel / texto:
  // Mapa de fatores de embalagem dos produtos já cadastrados
  const resFactorMap = new Map<number, number>();
  currentData.res.forEach((r) => {
    resFactorMap.set(r[0], r[4] || 1);
  });

  // Mapeia todas as linhas do arquivo Excel / texto do relatório 02.05.02:
  const fileProductsMap: Record<
    number,
    {
      estoque: number;
      contagem: number;
      desc: string;
      tipo: string;
      rawRow: (string | number)[];
    }
  > = {};

  body.forEach((r) => {
    const rawCode = String(r[ip] || '').trim().replace(/^0+/, '');
    const code = Number(rawCode);
    if (!isNaN(code) && code > 0) {
      // Identifica o fator da embalagem
      let factor = resFactorMap.get(code);
      if (!factor && r.length > 23) {
        const parsedF = Number(r[23]);
        if (!isNaN(parsedF) && parsedF > 0) factor = parsedF;
      }
      factor = factor || 1;

      // Disponível Promax / Coluna L (índice 11) ou Coluna 27 (Qtd Estoque em unidades)
      let colLVal = 0;
      if (r.length > 27 && r[27] !== undefined && r[27] !== '') {
        const p27 = parseNumber(r[27]);
        colLVal = p27 !== 0 ? p27 : parsePromaxToUnits(r[11] ?? r[ie], factor);
      } else {
        colLVal = parsePromaxToUnits(r.length > 11 ? r[11] : (ie >= 0 ? r[ie] : 0), factor);
      }

      // Contagem física / Coluna M (índice 12) ou Coluna 28 (Qtd Contagem em unidades)
      let colMVal = 0;
      if (r.length > 28 && r[28] !== undefined && r[28] !== '') {
        const p28 = parseNumber(r[28]);
        colMVal = p28 !== 0 ? p28 : parsePromaxToUnits(r[12] ?? r[ic], factor);
      } else {
        colMVal = parsePromaxToUnits(r.length > 12 ? r[12] : (ic >= 0 && r[ic] !== undefined ? r[ic] : 0), factor);
      }

      const desc = id >= 0 && r[id] ? String(r[id]).trim() : `PRODUTO ${code}`;
      const tipo = it >= 0 && r[it] ? String(r[it]).trim().toLowerCase() : 'cx';

      fileProductsMap[code] = {
        estoque: colLVal, // Disponível Promax
        contagem: colMVal, // Contagem física
        desc,
        tipo,
        rawRow: r,
      };
    }
  });

  // Mapeia ajustes pendentes para garantir que J = G e a conciliação atual permaneça 100% zerada
  const sAdj: { M: Record<number, number>; N: Record<number, number>; O: Record<number, number> } = {
    M: {},
    N: {},
    O: {},
  };
  (currentData.aj?.so || []).forEach((r) => {
    if (r[8] === 'Pendente') {
      const code = Number(r[0]);
      sAdj.M[code] = (sAdj.M[code] || 0) + Number(r[2] || 0);
    }
  });
  (currentData.aj?.av || []).forEach((r) => {
    if (r[4] === 'Pendente') {
      const code = Number(r[1]);
      sAdj.N[code] = (sAdj.N[code] || 0) + Number(r[3] || 0);
    }
  });
  (currentData.aj?.fm || []).forEach((r) => {
    const code = Number(r[0]);
    sAdj.O[code] = (sAdj.O[code] || 0) + Number(r[2] || 0);
  });

  let ach = 0;
  let aus = 0;

  // Mapa com a última diferença apurada/congelada do produto em caixas (DIF 1 / data.dia)
  const existingDiaMap = new Map<number, number>();
  (currentData.dia || []).forEach((d) => existingDiaMap.set(d[0], d[1]));

  // 1. Atualiza os produtos já existentes no RESUMO com o Disponível Promax da 02.05.02
  // e calcula o Inventário Físico (b) para refletir as divergências reais no Dashboard
  const nextRes: ResRow[] = currentData.res.map((x) => {
    const rowCopy = [...x] as ResRow;
    const code = rowCopy[0];
    const fileItem = fileProductsMap[code];
    const V = rowCopy[4] || 1;
    const M = sAdj.M[code] || 0;
    const Nn = sAdj.N[code] || 0;
    const Oo = sAdj.O[code] || 0;
    const diffCx = existingDiaMap.get(code) ?? 0;

    if (fileItem) {
      ach++;
      rowCopy[3] = fileItem.estoque;   // Disponível Promax -> G no Resumo

      // Lê a contagem física se o arquivo contiver contagens; caso contrário preserva contagem existente
      const hasAnyCountInFile = Object.values(fileProductsMap).some((p) => p.contagem > 0);
      if (hasAnyCountInFile) {
        rowCopy[7] = fileItem.contagem;
      } else if (rowCopy[7] === 0 || rowCopy[7] === undefined) {
        // Se o arquivo só continha estoque e não tinha contagem, inicializa alinhado ao estoque
        rowCopy[7] = fileItem.estoque;
      }
      rowCopy[8] = 0;                  // P (repack) zerado
      rowCopy[9] = 0;
      rowCopy[10] = 0;
      rowCopy[11] = 0;
    } else {
      aus++;
      // Produtos que não constam no arquivo: se já tinham estoque zerado, mantém zerado; não zera se for item com histórico
      if (rowCopy[3] === 0 && rowCopy[7] === 0) {
        rowCopy[3] = 0;
        rowCopy[7] = 0;
      }
      rowCopy[8] = 0;
      rowCopy[9] = 0;
      rowCopy[10] = 0;
      rowCopy[11] = 0;
    }
    return rowCopy;
  });

  // 2. Se houver produtos novos no Excel que NÃO estão no RESUMO, inclui com os dados do arquivo
  const existingCodesSet = new Set(nextRes.map((x) => x[0]));
  let novosAdicionados = 0;

  Object.entries(fileProductsMap).forEach(([codeStr, item]) => {
    const code = Number(codeStr);
    if (!existingCodesSet.has(code)) {
      const V = item.rawRow && item.rawRow.length > 23 ? Number(item.rawRow[23]) || 1 : 1;
      const contagemVal = item.contagem;

      const novaLinha: ResRow = [
        code,
        item.desc || `PRODUTO ${code}`,
        item.tipo || 'cx',
        item.estoque,                          // 3: G - Disponível Promax
        V,                                     // 4: V0 (fator)
        0,                                     // 5: U (preço padrão 0)
        0,                                     // 6: X (fator hecto)
        contagemVal,                           // 7: b (contagem física)
        0,                                     // 8: P (repack)
        0,                                     // 9: rm
        0,                                     // 10: rn
        0,                                     // 11: ro
      ];
      nextRes.push(novaLinha);
      existingCodesSet.add(code);
      novosAdicionados++;
    }
  });

  // Monta o próximo estado: O Estoque Central é SEMPRE atualizado primeiro e propaga para toda a plataforma
  const updatedGradeEc = {
    h: header.length > 0 ? header : (currentData.gradeEc?.h || currentData.ec?.h || []),
    r: body,
  };

  const nextGradeRes: ResRow[] = nextRes.map((r) => [...r] as ResRow);

  // Garante que a DIF 1 (eq) permaneça com a última diferença salva e congelada e o DIA ATUAL (gq) fique zerado
  const nextDia: DiaRow[] = nextRes.map((r) => {
    const code = r[0];
    const prevEq = existingDiaMap.get(code) ?? 0;
    return [code, prevEq, 0] as DiaRow;
  });

  const isGradeOnly = targetTab === 'grade';

  const nextData: RawData = isGradeOnly
    ? {
        ...currentData,
        gradeEc: updatedGradeEc,
      }
    : {
        ...currentData,
        res: nextRes,
        dia: nextDia,
        gradeEc: updatedGradeEc,
        gradeRes: nextGradeRes,
        ec0304: currentData.ec0304,
        ec: {
          h: header.length > 0 ? header : (currentData.ec?.h || []),
          r: body,
        },
        desativados: currentData.desativados || [],
      };

  const calcsDepois = calculateProducts(nextData).C;
  const dep = getTotals(calcsDepois);

  const dDiff = (a: number, b: number) => `${Rt(a)} → <b>${Rt(b)}</b>`;

  const bannerHtml = isGradeOnly
    ? `<b>Importação 02.05.02 da GRADE Concluída: ${nome}</b> — ${body.length} produtos carregados.<br>` +
      `• <b>Atualização exclusiva da aba GRADE:</b> A Coluna L ("Disponível na 020502") e a Grade foram recalculadas.<br>` +
      `• <b>Demais abas protegidas:</b> Dashboard, Resumo e Estoque Central permanecem com suas contagens e divergências intactas.`
    : `<b>Importação 02.05.02 Concluída via Estoque Central: ${nome}</b> — ${body.length} produtos carregados.<br>` +
      `• <b>Aba ESTOQUE CENTRAL</b> atualizada primeiro com todas as ${body.length} linhas brutas do relatório oficial.<br>` +
      `• <b>Plataforma Inteira Recalculada:</b> RESUMO, GRADE e DASHBOARD atualizados com os novos saldos (${ach} produtos sincronizados` +
      (novosAdicionados > 0 ? ` e ${novosAdicionados} novos produtos adicionados).<br>` : ').<br>') +
      `• TOTAL FALTAS: ${dDiff(antes.tf, dep.tf)} &nbsp; | &nbsp; TOTAL SOBRAS: ${dDiff(
        antes.ts,
        dep.ts
      )} &nbsp; | &nbsp; SALDO FINAL: ${dDiff(antes.sd, dep.sd)}`;

  const calcsFinal = calculateProducts(nextData).C;
  const depFinal = getTotals(calcsFinal);

  return {
    success: true,
    bodyRows: body,
    headerRow: header,
    matchedCount: ach + novosAdicionados,
    unmatchedCount: 0,
    totalParsed: body.length,
    beforeTotals: antes,
    afterTotals: depFinal,
    bannerHtml,
    nextData,
  };
}
