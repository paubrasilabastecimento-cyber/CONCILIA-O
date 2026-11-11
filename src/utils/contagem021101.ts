export interface MatchedContagemInfo {
  code: number;
  confirmedQty: number;
  statusText: string;
  roundLabels: string[];
}

export function getMatchedProductsFrom021101(
  counts: {
    id: string;
    label?: string;
    rows?: (string | number)[][];
    parsedItems?: {
      code: string;
      cleanCode: number;
      desc: string;
      qty: number;
    }[];
  }[]
): Map<number, MatchedContagemInfo> {
  const map = new Map<number, MatchedContagemInfo>();
  if (!counts || counts.length < 2) return map;

  // Mapa de contagens por código
  const codeCounts = new Map<number, { qty: number; round: string }[]>();

  counts.forEach((round, idx) => {
    const roundLabel = round.label || `Recontagem ${idx + 1}`;
    const items = round.parsedItems || [];
    items.forEach((item) => {
      const code = item.cleanCode || Number(String(item.code).replace(/\D/g, ''));
      if (!code || isNaN(code)) return;

      if (!codeCounts.has(code)) {
        codeCounts.set(code, []);
      }
      codeCounts.get(code)!.push({ qty: item.qty, round: roundLabel });
    });
  });

  // Identifica produtos onde 2 ou mais contagens consecutivas foram iguais
  codeCounts.forEach((entries, code) => {
    if (entries.length >= 2) {
      const last = entries[entries.length - 1];
      const prev = entries[entries.length - 2];
      if (last.qty === prev.qty) {
        map.set(code, {
          code,
          confirmedQty: last.qty,
          statusText: `Bateu: ${last.qty} cx (${prev.round} = ${last.round})`,
          roundLabels: [prev.round, last.round],
        });
      }
    }
  });

  return map;
}
