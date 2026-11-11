import { xs, aj } from './part1_aj';
import { dia, rawDia } from './part2_dia';
import { res_a } from './part3_res_a';
import { res_b } from './part3_res_b';
import { men_a } from './part4_men_a';
import { men_b } from './part4_men_b';
import { ec } from './part5_ec';
import { initialRecontagens } from './defaultRecontagens';
import { RawData, MenRow, ResRow } from './types';

export const cervegelasRes: ResRow[] = [
  [23671, "CERVEGELA BRAHMA 600ML", "un", 0, 1, 15.00, 0.001, 0, 0, 0, 0, 0],
  [23672, "CERVEGELA SKOL 600ML", "un", 0, 1, 15.00, 0.001, 0, 0, 0, 0, 0],
  [29416, "CERVEGELA BUDWEISER 600ML", "un", 0, 1, 18.00, 0.001, 0, 0, 0, 0, 0],
  [29418, "CERVEGELA ANTARCTICA 600ML", "un", 0, 1, 15.00, 0.001, 0, 0, 0, 0, 0],
  [35108, "CERVEGELA SPATEN 600ML", "un", 0, 1, 20.00, 0.001, 0, 0, 0, 0, 0],
];

export const cervegelasMen: MenRow[] = [
  [23671, "CERVEGELA BRAHMA 600ML", 0.001, 0, Array(31).fill(null), 0],
  [23672, "CERVEGELA SKOL 600ML", 0.001, 0, Array(31).fill(null), 0],
  [29416, "CERVEGELA BUDWEISER 600ML", 0.001, 0, Array(31).fill(null), 0],
  [29418, "CERVEGELA ANTARCTICA 600ML", 0.001, 0, Array(31).fill(null), 0],
  [35108, "CERVEGELA SPATEN 600ML", 0.001, 0, Array(31).fill(null), 0],
];

const rawRes = [...res_a, ...res_b, ...cervegelasRes];
const zeroedRes = rawRes.map((r) => {
  const row = [...r] as typeof r;
  row[7] = row[3]; // contagem física b igual ao disponível Promax G para zerar divergência
  return row;
});

// Inicializa a DIF Mensal com o Dia 14 e Dia 15 pré-carregados a partir da conciliação gravada (rawDia)
const rawDiaMap = new Map<number, { eq: number; gq: number }>();
rawDia.forEach(([c, eq, gq]) => {
  rawDiaMap.set(c, { eq, gq });
});

const seededMen: MenRow[] = [...men_a, ...men_b, ...cervegelasMen].map((row) => {
  const r = [...row] as typeof row;
  const days = [...r[4]];
  const diaEntry = rawDiaMap.get(r[0]);
  if (diaEntry) {
    if (diaEntry.eq !== undefined && diaEntry.eq !== null) {
      days[13] = diaEntry.eq; // Dia 14 (ontem / congelada)
    }
    if (diaEntry.gq !== undefined && diaEntry.gq !== null) {
      days[14] = diaEntry.gq; // Dia 15 (dia atual)
    }
  }
  const soma = days.reduce<number>((acc, v) => acc + (v || 0), 0);
  return [r[0], r[1], r[2], r[3], days, soma] as MenRow;
});

export const initialRawData: RawData = {
  xs,
  aj,
  dia,
  res: zeroedRes,
  gradeRes: zeroedRes.map((r) => [...r] as typeof r),
  men: seededMen,
  ec,
  gradeEc: undefined,
  ec0304: undefined,
  recontagens: initialRecontagens,
  desativados: [],
};
