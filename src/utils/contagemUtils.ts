import { ContagemEstoqueItem } from '../data/types';

export const getItemDateString = (item: ContagemEstoqueItem): string => {
  if (item.dataHora) {
    const parts = item.dataHora.split(' ');
    if (parts.length > 0) return parts[0];
  }
  if (item.timestamp) {
    return new Date(item.timestamp).toLocaleDateString('pt-BR');
  }
  return new Date().toLocaleDateString('pt-BR');
};

export const mergeContagemItems = (
  base: ContagemEstoqueItem,
  incoming: ContagemEstoqueItem
): ContagemEstoqueItem => {
  const pallets = (base.pallets || 0) + (incoming.pallets || 0);
  const lastros = (base.lastros || 0) + (incoming.lastros || 0);
  const caixas = (base.caixas || 0) + (incoming.caixas || 0);
  const unidades = (base.unidades || 0) + (incoming.unidades || 0);
  const totalUnidades = (base.totalUnidades || 0) + (incoming.totalUnidades || 0);
  const fatorCx = base.fatorCx || incoming.fatorCx || 1;
  const totalCaixasDecimal = totalUnidades / fatorCx;

  return {
    ...base,
    pallets,
    lastros,
    caixas,
    unidades,
    totalUnidades,
    totalCaixasDecimal,
    totalCaixasFormatado: `${Math.floor(totalCaixasDecimal)} cx`,
    timestamp: Date.now(),
  };
};

export const consolidateContagens = (items: ContagemEstoqueItem[] = []): ContagemEstoqueItem[] => {
  return items;
};
