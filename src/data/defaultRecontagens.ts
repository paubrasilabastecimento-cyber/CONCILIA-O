import { CalculatedProduct, RecontagemItem } from './types';

export function createRecontagemFromProduct(prod: CalculatedProduct): RecontagemItem {
  return {
    id: `rec_${prod.c}_${Date.now()}`,
    cod: prod.c,
    desc: prod.d,
    tipo: prod.t,
    precoCx: prod.U,
    fatorCx: prod.V || 1,
    fatorHl: prod.X,
    dispPromaxUnid: prod.G,
    dispPromaxCx: prod.H,
    inventarioInicialUnid: prod.J,
    inventarioInicialCx: prod.K,
    difInicialCx: prod.R,
    difInicialValor: prod.S,
    novaContagemCx: prod.K,
    novaContagemUnid: prod.J,
    status: 'pendente',
    solicitadoEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export const initialRecontagens: RecontagemItem[] = [];
