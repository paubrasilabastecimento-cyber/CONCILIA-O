export interface ProdutoTabela07 {
  tabela: string;
  dataVigencia: string;
  codigoGrupo: string;
  codigo: string;
  descricao: string;
  categoria: 'Cervejas' | 'Refrigerantes' | 'Destilados & Whiskies' | 'Energéticos' | 'Águas & Sucos' | 'Vinhos & Espumantes' | 'Aperitivos' | 'Outros';
  tipoMercadoria: string;
  unidadeVenda: 'CX' | 'PACK' | 'FD' | 'UN' | 'GF' | 'LT';
  fatorEmbalagem: number; // ex: 12 unidades por caixa
  valorTabela: number; // Preço cheio R$
  valorMinimo: number; // Preço mínimo com desconto máximo permitido
  precoSugeridoVenda: number; // Preço sugerido de revenda
  aliquotaIcms: number; // % ICMS
  aliquotaSt?: number; // % ICMS ST
  aliquotaFcp?: number; // % FCP
  regraComercial: string; // ex: "Não cumulativo com etiqueta", "Com Etiqueta", etc.
  status: 'Ativo' | 'Sob Consulta';
  estoqueDisponivel?: number;
}

export interface ItemPedido {
  produto: ProdutoTabela07;
  quantidade: number;
  precoUnitarioAplicado: number;
  descontoPercentual: number;
}
