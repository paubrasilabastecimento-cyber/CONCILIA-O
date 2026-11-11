export interface InventoryItem {
  id: string;
  cod: string;
  descricao: string;
  tipo: string;
  factorCx: number; // Unidades por caixa, padrão para cálculo
  
  // Disponível Promax
  promaxUnid: number;
  promaxCx: number;
  promaxValor: number;

  // Inventário Físico
  invUnid: number;
  invCx: number;
  invValor: number;

  // Ajustes
  sobras: number;
  pnc: number; // Produto Não Conforme / Quebra
  faltas: number;
  repack: number;

  // Diferenças (podem ser calculadas ou personalizadas)
  difUnid: number;
  difCx: number;
}

export type FilterType = 'all' | 'with-diff' | 'no-diff' | 'with-adjustments';
