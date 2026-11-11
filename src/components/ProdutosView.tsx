import React, { useState, useMemo, useEffect } from 'react';
import { RawData, CalculatedProduct } from '../data/types';
import { N, Rt, RenderMoney, formatBRL } from '../utils/formatters';
import { sum } from '../utils/calc';
import { parsePriceNumber } from '../utils/importerPrecos';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Copy, 
  Check, 
  Package, 
  Boxes, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  X, 
  ExternalLink,
  Info,
  DollarSign,
  Layers,
  FileSpreadsheet,
  Ban,
  Power
} from 'lucide-react';

interface ProdutosViewProps {
  data: RawData;
  calculatedProducts: CalculatedProduct[];
  calculatedMap: Record<number, CalculatedProduct>;
  onRecontar?: (code: number) => void;
  onToggleDesativar?: (code: number) => void;
  onNavigateToTab?: (tab: string) => void;
  onUpdateProductPrice?: (code: number, precoCx: number, fatorCx?: number, fatorHl?: number) => void;
  onOpenImportPrecos?: () => void;
}

export type ProductCategory = 'todas' | 'cervejas' | 'refrigerantes' | 'aguas' | 'energeticos' | 'destilados' | 'outros';

export function getProductCategory(desc: string): ProductCategory {
  const d = desc.toUpperCase();
  if (
    d.includes('SKOL') ||
    d.includes('BRAHMA') ||
    d.includes('BUDWEISER') ||
    d.includes('STELLA') ||
    d.includes('CORONA') ||
    d.includes('SPATEN') ||
    d.includes('BEATS') ||
    d.includes('SUBZERO') ||
    d.includes('BOHEMIA') ||
    d.includes('ORIGINAL') ||
    d.includes('CARACU') ||
    d.includes('COLORADO') ||
    d.includes('CHOPP') ||
    d.includes('BECKS') ||
    d.includes('SERRAMALTE') ||
    d.includes('MICHELOB')
  ) {
    return 'cervejas';
  }

  if (
    d.includes('PEPSI') ||
    d.includes('GUARANA') ||
    d.includes('SUKITA') ||
    d.includes('SODA') ||
    d.includes('TONICA') ||
    d.includes('H2OH') ||
    d.includes('TEEM') ||
    d.includes('CITRUS')
  ) {
    return 'refrigerantes';
  }

  if (
    d.includes('AGUA') ||
    d.includes('ÁGUA') ||
    d.includes('GATORADE') ||
    d.includes('INDAIA') ||
    d.includes('INDAIÁ') ||
    d.includes('ISOTONICO')
  ) {
    return 'aguas';
  }

  if (d.includes('RED BULL') || d.includes('FUSION') || d.includes('MONSTER') || d.includes('ENERG')) {
    return 'energeticos';
  }

  if (
    d.includes('MONTILLA') ||
    d.includes('51') ||
    d.includes('DREHER') ||
    d.includes('CHIVAS') ||
    d.includes('NATU NOBILIS') ||
    d.includes('SMIRNOFF') ||
    d.includes('GALLO') ||
    d.includes('PASSPORT') ||
    d.includes('WHISKY') ||
    d.includes('VODKA') ||
    d.includes('CACHACA') ||
    d.includes('CACHAÇA') ||
    d.includes('VINHO') ||
    d.includes('CASILLERO') ||
    d.includes('AZEITE')
  ) {
    return 'destilados';
  }

  return 'outros';
}

const CATEGORY_NAMES: Record<ProductCategory, string> = {
  todas: 'Todas as Categorias',
  cervejas: 'Cervejas & Chopp',
  refrigerantes: 'Refrigerantes',
  aguas: 'Águas & Isotônicos',
  energeticos: 'Energéticos',
  destilados: 'Destilados & Quentes',
  outros: 'Alimentos & Outros',
};

type SortKey = 'c' | 'd' | 'category' | 'U' | 'V' | 'W' | 'H' | 'K' | 'R' | 'S' | 'X';

export const ProdutosView: React.FC<ProdutosViewProps> = ({
  data,
  calculatedProducts,
  calculatedMap,
  onRecontar,
  onToggleDesativar,
  onNavigateToTab,
  onUpdateProductPrice,
  onOpenImportPrecos,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>('todas');
  const [divergenceFilter, setDivergenceFilter] = useState<'all' | 'dif_only' | 'faltas' | 'sobras' | 'zero'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'with_stock' | 'zero_stock'>('all');
  const [activationFilter, setActivationFilter] = useState<'all' | 'ativos' | 'desativados'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('c');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<CalculatedProduct | null>(null);
  const [copied, setCopied] = useState(false);

  // Estados para Edição / Adição de Preço do Produto
  const [editPrecoCx, setEditPrecoCx] = useState<string>('');
  const [editFatorCx, setEditFatorCx] = useState<string>('');
  const [editFatorHl, setEditFatorHl] = useState<string>('');
  const [priceSavedSuccess, setPriceSavedSuccess] = useState<boolean>(false);

  // Atualiza os campos de edição sempre que um produto é selecionado
  useEffect(() => {
    if (selectedProduct) {
      setEditPrecoCx(selectedProduct.U > 0 ? selectedProduct.U.toFixed(2).replace('.', ',') : '');
      setEditFatorCx(selectedProduct.V > 0 ? String(selectedProduct.V) : '1');
      setEditFatorHl(selectedProduct.X > 0 ? String(selectedProduct.X).replace('.', ',') : '0');
      setPriceSavedSuccess(false);
    }
  }, [selectedProduct?.c]);

  // Cálculos reativos em tempo real conforme o usuário digita no modal
  const parsedPreco = useMemo(() => parsePriceNumber(editPrecoCx), [editPrecoCx]);
  const parsedFator = useMemo(() => {
    const v = parseFloat(String(editFatorCx).replace(',', '.'));
    return isNaN(v) || v <= 0 ? 1 : v;
  }, [editFatorCx]);
  const parsedHl = useMemo(() => parsePriceNumber(editFatorHl), [editFatorHl]);
  const unitPreview = useMemo(() => (parsedFator > 0 ? parsedPreco / parsedFator : parsedPreco), [parsedPreco, parsedFator]);

  // Salvar Preço do Produto
  const handleSaveCurrentPrice = () => {
    if (!selectedProduct) return;
    const preco = parsedPreco;
    const fator = parsedFator;
    const hl = parsedHl;

    if (onUpdateProductPrice) {
      onUpdateProductPrice(selectedProduct.c, preco, fator, hl);
    }

    // Atualiza imediatamente o produto em tela no modal
    setSelectedProduct((prev) => {
      if (!prev) return null;
      const W = fator > 0 ? preco / fator : preco;
      const I = prev.G * W;
      const L = prev.J * W;
      const S = prev.desativado ? 0 : (L < 0 ? 0 : L - I);
      return {
        ...prev,
        U: preco,
        V: fator,
        W,
        X: hl,
        I,
        L,
        S,
        Y: hl * prev.G,
        Z: hl * prev.J,
      };
    });

    setPriceSavedSuccess(true);
    setTimeout(() => {
      setPriceSavedSuccess(false);
    }, 4000);
  };

  // Conjunto de produtos desativados da plataforma por inteiro
  const desativadosSet = useMemo(() => new Set(data.desativados || []), [data.desativados]);

  // Mapeamento de Estoque Central 02.05.02
  const ecSet = useMemo(() => {
    const set = new Set<number>();
    if (data.ec && Array.isArray(data.ec.r)) {
      data.ec.r.forEach((row) => {
        const cod = Number(row[3]);
        if (!isNaN(cod) && cod > 0) set.add(cod);
      });
    }
    return set;
  }, [data.ec]);

  // Mapeamento de histórico anterior (data.dia)
  const diaMap = useMemo(() => {
    const map = new Map<number, { eq: number; gq: number }>();
    data.dia.forEach(([cod, eq, gq]) => {
      map.set(cod, { eq, gq });
    });
    return map;
  }, [data.dia]);

  // Mapeamento da DIF Mensal
  const menMap = useMemo(() => {
    const map = new Map<number, { fechamento: number; dias: (number | null)[] }>();
    data.men.forEach((r) => {
      map.set(r[0], {
        fechamento: r[3] || 0,
        dias: r[4] || [],
      });
    });
    return map;
  }, [data.men]);

  // Métricas gerais calculadas para a base de produtos
  const metrics = useMemo(() => {
    const totalCount = calculatedProducts.length;
    let withStockCount = 0;
    let faltasCount = 0;
    let sobrasCount = 0;
    let zeroDiffCount = 0;
    let desativadosCount = 0;
    let totalValorPromax = 0;
    let totalValorFisico = 0;
    let totalHlFiscal = 0;
    let totalHlFisico = 0;

    calculatedProducts.forEach((p) => {
      const isDesat = desativadosSet.has(p.c) || !!p.desativado;
      if (isDesat) desativadosCount++;

      if (p.H > 0 || p.G > 0) withStockCount++;
      if (p.R < 0) faltasCount++;
      else if (p.R > 0) sobrasCount++;
      else zeroDiffCount++;

      totalValorPromax += p.I;
      totalValorFisico += p.L;
      totalHlFiscal += p.Y;
      totalHlFisico += p.Z;
    });

    return {
      totalCount,
      withStockCount,
      faltasCount,
      sobrasCount,
      zeroDiffCount,
      desativadosCount,
      ativosCount: totalCount - desativadosCount,
      totalValorPromax,
      totalValorFisico,
      totalHlFiscal,
      totalHlFisico,
    };
  }, [calculatedProducts, desativadosSet]);

  // Filtragem e ordenação dos produtos
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = calculatedProducts.filter((p) => {
      const cat = getProductCategory(p.d);
      const isDesat = desativadosSet.has(p.c) || !!p.desativado;

      // Filtro de Ativação / Desativação
      if (activationFilter === 'ativos' && isDesat) return false;
      if (activationFilter === 'desativados' && !isDesat) return false;

      // Filtro de Categoria
      if (categoryFilter !== 'todas' && cat !== categoryFilter) {
        return false;
      }

      // Filtro de Divergência
      if (divergenceFilter === 'dif_only' && p.R === 0) return false;
      if (divergenceFilter === 'faltas' && p.R >= 0) return false;
      if (divergenceFilter === 'sobras' && p.R <= 0) return false;
      if (divergenceFilter === 'zero' && p.R !== 0) return false;

      // Filtro de Estoque
      if (stockFilter === 'with_stock' && p.H <= 0 && p.G <= 0) return false;
      if (stockFilter === 'zero_stock' && (p.H > 0 || p.G > 0)) return false;

      // Busca por texto
      if (q) {
        const codeMatch = String(p.c).includes(q);
        const descMatch = p.d.toLowerCase().includes(q);
        const catMatch = CATEGORY_NAMES[cat].toLowerCase().includes(q);
        if (!codeMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });

    // Ordenação
    list.sort((a, b) => {
      let valA: any = a[sortKey as keyof CalculatedProduct];
      let valB: any = b[sortKey as keyof CalculatedProduct];

      if (sortKey === 'category') {
        valA = getProductCategory(a.d);
        valB = getProductCategory(b.d);
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [calculatedProducts, query, categoryFilter, divergenceFilter, stockFilter, activationFilter, sortKey, sortAsc, desativadosSet]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'd' || key === 'c');
    }
  };

  // Exportar para CSV
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Descrição',
      'Categoria',
      'Preço Caixa (R$)',
      'Fator Caixa',
      'Preço Unidade (R$)',
      'Fator Hecto',
      'Disp Promax (CX)',
      'Disp Promax (UN)',
      'Valor Promax (R$)',
      'Inventário Físico (CX)',
      'Inventário Físico (UN)',
      'Valor Físico (R$)',
      'Ajustes Sobra (UN)',
      'Ajustes Avaria (UN)',
      'Ajustes Repack (UN)',
      'Ajustes Falta Map (UN)',
      'Diferença (CX)',
      'Diferença (R$)',
      'Hecto Fiscal (HL)',
      'Hecto Físico (HL)'
    ];

    const rows = filteredProducts.map((p) => [
      p.c,
      `"${p.d.replace(/"/g, '""')}"`,
      `"${CATEGORY_NAMES[getProductCategory(p.d)]}"`,
      p.U.toFixed(2).replace('.', ','),
      p.V,
      p.W.toFixed(2).replace('.', ','),
      p.X.toFixed(4).replace('.', ','),
      p.H,
      p.G,
      p.I.toFixed(2).replace('.', ','),
      p.K,
      p.J,
      p.L.toFixed(2).replace('.', ','),
      p.M,
      p.N,
      p.P,
      p.O,
      p.R,
      p.S.toFixed(2).replace('.', ','),
      p.Y.toFixed(2).replace('.', ','),
      p.Z.toFixed(2).replace('.', ',')
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `catalogo_todos_produtos_guarabira_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copiar dados da tabela
  const handleCopyTable = () => {
    const headerLine = 'COD\tDESCRIÇÃO\tCATEGORIA\tPREÇO CX\tFATOR CX\tDISP PROMAX CX\tFÍSICO CX\tDIF CX\tDIF R$';
    const lines = filteredProducts.map(
      (p) => `${p.c}\t${p.d}\t${CATEGORY_NAMES[getProductCategory(p.d)]}\t${formatBRL(p.U)}\t${p.V}\t${p.H}\t${p.K}\t${p.R}\t${formatBRL(p.S)}`
    );
    navigator.clipboard.writeText([headerLine, ...lines].join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="w-full">
      {/* =========================================================================
          CABEÇALHO DA ABA: TODOS OS PRODUTOS
         ========================================================================= */}
      <div style={{ padding: '12px 16px 0 16px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#fff',
            borderRadius: '8px',
            padding: '14px 18px',
            boxShadow: '0 3px 6px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#FFC000', color: '#000', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>CATÁLOGO GERAL DE PRODUTOS</span>
                <span style={{ fontSize: '11px', background: '#334155', color: '#94A3B8', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {metrics.totalCount} PRODUTOS
                </span>
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                Visualização consolidada de todos os itens cadastrados no Promax da filial Guarabira, incluindo preços, estoques, ajustes e divergências.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onOpenImportPrecos && (
              <button
                type="button"
                onClick={onOpenImportPrecos}
                style={{
                  background: '#0D9488',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 'bold',
                  padding: '7px 13px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(13, 148, 136, 0.25)',
                }}
                title="Importar ou colar planilha de Tabela de Preços"
              >
                <span>💰</span>
                <span>IMPORTAR PREÇOS</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                background: '#0284C7',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                padding: '7px 13px',
                borderRadius: '6px',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              }}
              title="Baixar planilha completa em formato CSV / Excel"
            >
              <Download size={14} />
              <span>EXPORTAR CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTable}
              style={{
                background: copied ? '#16A34A' : '#334155',
                color: '#fff',
                border: '1px solid #475569',
                fontWeight: 'bold',
                padding: '7px 13px',
                borderRadius: '6px',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="Copiar dados da tabela para colar no Excel"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'COPIADO!' : 'COPIAR TABELA'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CARDS DE RESUMO E KPIs
         ========================================================================= */}
      <div className="kpis" style={{ paddingTop: '10px' }}>
        <div className="k">
          <small>TOTAL DE ITENS</small>
          <span>{metrics.totalCount}</span>
        </div>

        <div className="k">
          <small>COM ESTOQUE PROMAX</small>
          <span>{metrics.withStockCount} itens</span>
        </div>

        <div className="k">
          <small>VALOR ESTOQUE PROMAX</small>
          <span>{Rt(metrics.totalValorPromax)}</span>
        </div>

        <div className="k">
          <small>VALOR ESTOQUE FÍSICO</small>
          <span>{Rt(metrics.totalValorFisico)}</span>
        </div>

        <div className="k">
          <small>HECTOLITROS TOTAIS</small>
          <span>{N(metrics.totalHlFiscal, 0)} HL</span>
        </div>

        <div className="k r">
          <small>PRODUTOS COM FALTA</small>
          <span>{metrics.faltasCount}</span>
        </div>

        <div className="k y">
          <small>PRODUTOS COM SOBRA</small>
          <span>{metrics.sobrasCount}</span>
        </div>

        <div className="k g">
          <small>100% CONCILIADOS</small>
          <span>{metrics.zeroDiffCount}</span>
        </div>

        <div
          className={`k ${metrics.desativadosCount > 0 ? 'r' : ''}`}
          onClick={() => setActivationFilter(activationFilter === 'desativados' ? 'all' : 'desativados')}
          style={{
            cursor: 'pointer',
            border: activationFilter === 'desativados' ? '2px solid #DC2626' : undefined,
            background: activationFilter === 'desativados' ? '#FEF2F2' : undefined,
          }}
          title="Clique para filtrar apenas produtos desativados da plataforma por inteiro"
        >
          <small style={{ color: metrics.desativadosCount > 0 ? '#DC2626' : undefined, fontWeight: 'bold' }}>
            DESATIVADOS POR INTEIRO
          </small>
          <span style={{ color: metrics.desativadosCount > 0 ? '#DC2626' : undefined }}>
            {metrics.desativadosCount}
          </span>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE FILTROS E BUSCA RESPONSIVA
         ========================================================================= */}
      <div
        style={{
          margin: '8px 16px',
          padding: '10px 14px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #FFC000',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Linha 1: Campo de Busca e Filtros Rápidos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          {/* Campo de Busca */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por código, produto ou tipo..."
              style={{
                width: '100%',
                padding: '6px 28px 6px 32px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros em Selects */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filtro de Ativação / Desativação na Plataforma */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>STATUS:</span>
              <select
                value={activationFilter}
                onChange={(e) => setActivationFilter(e.target.value as any)}
                style={{
                  padding: '5px 8px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  border: activationFilter === 'desativados' ? '1.5px solid #DC2626' : '1px solid #cbd5e1',
                  background: activationFilter === 'desativados' ? '#FEF2F2' : '#fff',
                  color: activationFilter === 'desativados' ? '#DC2626' : '#0f172a',
                  fontWeight: 'bold',
                }}
              >
                <option value="all">Todos ({metrics.totalCount})</option>
                <option value="ativos">Apenas Ativos ({metrics.ativosCount})</option>
                <option value="desativados">🚫 Desativados ({metrics.desativadosCount})</option>
              </select>
            </div>

            {/* Filtro de Divergência */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>SITUAÇÃO:</span>
              <select
                value={divergenceFilter}
                onChange={(e) => setDivergenceFilter(e.target.value as any)}
                style={{
                  padding: '5px 8px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 'bold',
                }}
              >
                <option value="all">Todas as Situações</option>
                <option value="dif_only">Só com Divergência (Falta ou Sobra)</option>
                <option value="faltas">Só Faltas (K &lt; H)</option>
                <option value="sobras">Só Sobras (K &gt; H)</option>
                <option value="zero">100% Conciliados (Zerados)</option>
              </select>
            </div>

            {/* Filtro de Estoque */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ESTOQUE:</span>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                style={{
                  padding: '5px 8px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontWeight: 'bold',
                }}
              >
                <option value="all">Todos os Estoques</option>
                <option value="with_stock">Apenas com Estoque (&gt; 0 cx)</option>
                <option value="zero_stock">Estoque Zerado (= 0 cx)</option>
              </select>
            </div>

            {/* Contador de Itens Encontrados */}
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '4px' }}>
              {filteredProducts.length} de {metrics.totalCount} produtos
            </span>
          </div>
        </div>

        {/* Linha 2: Categorias em Botões de Segmento */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['todas', 'cervejas', 'refrigerantes', 'aguas', 'energeticos', 'destilados', 'outros'] as ProductCategory[]).map((cat) => {
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: isSelected ? '1px solid #0F172A' : '1px solid #e2e8f0',
                  background: isSelected ? '#0F172A' : '#f8fafc',
                  color: isSelected ? '#fff' : '#475569',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {CATEGORY_NAMES[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          TABELA GERAL DE TODOS OS PRODUTOS
         ========================================================================= */}
      <div className="wrap" style={{ paddingTop: '4px' }}>
        <div className="sc" style={{ width: '100%', maxHeight: 'calc(100vh - 220px)' }}>
          <table id="table-r" style={{ width: 'max-content', minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', cursor: 'pointer' }} onClick={() => handleSort('c')}>
                  #
                </th>
                <th style={{ width: '68px', cursor: 'pointer' }} onClick={() => handleSort('c')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span>COD</span>
                    {sortKey === 'c' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ minWidth: '280px', textAlign: 'left', paddingLeft: '8px', cursor: 'pointer' }} onClick={() => handleSort('d')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>DESCRIÇÃO DO PRODUTO</span>
                    {sortKey === 'd' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ width: '120px', cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  CATEGORIA
                </th>
                <th style={{ width: '85px', cursor: 'pointer' }} onClick={() => handleSort('U')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span>PREÇO CX</span>
                    {sortKey === 'U' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ width: '60px', cursor: 'pointer' }} onClick={() => handleSort('V')}>
                  FATOR CX
                </th>
                <th style={{ width: '85px', cursor: 'pointer' }} onClick={() => handleSort('W')}>
                  PREÇO UN
                </th>
                <th style={{ width: '90px', cursor: 'pointer', background: '#e0a800' }} onClick={() => handleSort('H')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span>PROMAX (CX)</span>
                    {sortKey === 'H' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ width: '90px', background: '#e0a800' }}>
                  PROMAX (UN)
                </th>
                <th style={{ width: '90px', cursor: 'pointer', background: '#d49b00' }} onClick={() => handleSort('K')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span>FÍSICO (CX)</span>
                    {sortKey === 'K' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ width: '90px', background: '#d49b00' }}>
                  FÍSICO (UN)
                </th>
                <th style={{ width: '85px', cursor: 'pointer' }} onClick={() => handleSort('R')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span>DIF (CX)</span>
                    {sortKey === 'R' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ width: '100px', cursor: 'pointer' }} onClick={() => handleSort('S')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span>DIF (R$)</span>
                    {sortKey === 'S' && (sortAsc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </div>
                </th>
                <th style={{ width: '70px', cursor: 'pointer' }} onClick={() => handleSort('X')}>
                  FATOR HL
                </th>
                <th style={{ width: '75px' }}>
                  HL PROMAX
                </th>
                <th style={{ width: '75px' }}>
                  HL FÍSICO
                </th>
                <th style={{ width: '180px', textAlign: 'center' }}>
                  AÇÕES
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={17} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const cat = getProductCategory(p.d);
                  const isDesat = desativadosSet.has(p.c) || !!p.desativado;
                  const isFalta = p.R < 0;
                  const isSobra = p.R > 0;
                  const isZero = p.R === 0;

                  return (
                    <tr
                      key={p.c}
                      style={{
                        cursor: 'pointer',
                        background: isDesat ? '#FEF2F2' : undefined,
                        opacity: isDesat ? 0.75 : 1,
                      }}
                      onClick={() => setSelectedProduct(p)}
                      title={isDesat ? '🚫 Produto Desativado da Plataforma por Inteiro (Clique para detalhes)' : 'Clique para ver a ficha completa deste produto'}
                    >
                      {/* Índice */}
                      <td className="c" style={{ color: '#888' }}>
                        {idx + 1}
                      </td>

                      {/* Código */}
                      <td className="c font-mono" style={{ fontWeight: 'bold' }}>
                        {p.c}
                      </td>

                      {/* Descrição */}
                      <td style={{ fontWeight: '600' }} title={p.d}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textDecoration: isDesat ? 'line-through' : 'none', color: isDesat ? '#64748b' : '#0f172a' }}>
                            {p.d}
                          </span>
                          {isDesat && (
                            <span
                              style={{
                                fontSize: '8.5px',
                                fontWeight: 'bold',
                                background: '#DC2626',
                                color: '#fff',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                letterSpacing: '0.4px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              DESATIVADO
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="c" style={{ fontSize: '11px', color: '#555' }}>
                        {CATEGORY_NAMES[cat].split(' ')[0]}
                      </td>

                      {/* Preço Caixa */}
                      <td
                        className="n font-mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(p);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Clique para adicionar ou editar o preço deste produto"
                      >
                        {p.U > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                            <span>{formatBRL(p.U)}</span>
                            <span style={{ fontSize: '9px', opacity: 0.5 }}>✏️</span>
                          </div>
                        ) : (
                          <span style={{ background: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 'bold' }}>
                            + Preço
                          </span>
                        )}
                      </td>

                      {/* Fator Caixa */}
                      <td className="c">
                        {p.V}
                      </td>

                      {/* Preço Unidade */}
                      <td className="n font-mono" style={{ color: '#555' }}>
                        {formatBRL(p.W)}
                      </td>

                      {/* Promax CX */}
                      <td className="c font-mono" style={{ fontWeight: p.H > 0 ? 'bold' : 'normal' }}>
                        {N(p.H, 0)}
                      </td>

                      {/* Promax UN */}
                      <td className="c font-mono" style={{ color: '#555' }}>
                        {N(p.G, 0)}
                      </td>

                      {/* Físico CX */}
                      <td className="c font-mono" style={{ fontWeight: p.K > 0 ? 'bold' : 'normal' }}>
                        {N(p.K, 0)}
                      </td>

                      {/* Físico UN */}
                      <td className="c font-mono" style={{ color: '#555' }}>
                        {N(p.J, 0)}
                      </td>

                      {/* Diferença CX */}
                      <td
                        className="c font-mono"
                        style={{
                          fontWeight: 'bold',
                          background: isDesat ? '#F1F5F9' : isFalta ? '#FFC7CE' : isSobra ? '#FFEB9C' : '#E8F5E9',
                          color: isDesat ? '#64748B' : isFalta ? '#9C0006' : isSobra ? '#9C6500' : '#1B5E20',
                        }}
                      >
                        {isDesat ? '0 (desat)' : `${isSobra ? '+' : ''}${p.R}`}
                      </td>

                      {/* Diferença R$ */}
                      <td
                        className="n font-mono"
                        style={{
                          fontWeight: 'bold',
                          color: isDesat ? '#94A3B8' : isFalta ? '#DC2626' : isSobra ? '#D97706' : '#16A34A',
                        }}
                      >
                        {isDesat ? 'R$ 0,00' : Rt(p.S)}
                      </td>

                      {/* Fator HL */}
                      <td className="c font-mono" style={{ fontSize: '11px' }}>
                        {N(p.X)}
                      </td>

                      {/* HL Promax */}
                      <td className="c font-mono" style={{ fontSize: '11px' }}>
                        {N(p.Y)}
                      </td>

                      {/* HL Físico */}
                      <td className="c font-mono" style={{ fontSize: '11px' }}>
                        {N(p.Z)}
                      </td>

                      {/* Ações */}
                      <td className="c" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {/* Botão de Desativar da Plataforma por Inteiro / Reativar */}
                          {onToggleDesativar && (
                            isDesat ? (
                              <button
                                type="button"
                                onClick={() => onToggleDesativar(p.c)}
                                style={{
                                  background: '#16A34A',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title="Reativar produto na plataforma"
                              >
                                <CheckCircle2 size={11} />
                                <span>Ativar</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleDesativar(p.c);
                                }}
                                style={{
                                  background: '#DC2626',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title="Desativar este produto da plataforma por inteiro"
                              >
                                <Ban size={10} />
                                <span>Desativar</span>
                              </button>
                            )
                          )}

                          {onRecontar && (
                            <button
                              type="button"
                              onClick={() => onRecontar(p.c)}
                              style={{
                                background: '#D97706',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '3px',
                                padding: '2px 5px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                              title="Enviar este produto para a fila de Recontagem"
                            >
                              Recontar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            style={{
                              background: p.U > 0 ? '#0D9488' : '#D97706',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 5px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                            title={p.U > 0 ? `Preço atual: ${formatBRL(p.U)} (Clique para editar)` : 'Adicionar preço para este produto'}
                          >
                            <span>💰</span>
                            <span>{p.U > 0 ? 'Preço' : '+ Preço'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedProduct(p)}
                            style={{
                              background: '#2B579A',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 5px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                            title="Ver ficha completa do produto"
                          >
                            Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL DE FICHA DETALHADA DO PRODUTO
         ========================================================================= */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px', width: '95%', padding: '0', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div style={{ background: '#0F172A', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ background: '#FFC000', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    COD #{selectedProduct.c}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {CATEGORY_NAMES[getProductCategory(selectedProduct.d)]}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#fff', lineHeight: 1.3 }}>
                  {selectedProduct.d}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo da Ficha do Produto */}
            <div style={{ padding: '16px 20px', maxHeight: '78vh', overflowY: 'auto' }}>
              {/* Seção de Definição e Salvamento de Preço */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>💰</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Adicionar / Alterar Preço do Produto
                    </span>
                  </div>
                  {priceSavedSuccess && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: '#16A34A',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ✓ Preço Salvo com Sucesso!
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '8px',
                    alignItems: 'flex-end',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 'bold', color: '#166534', marginBottom: '3px' }}>
                      Preço Caixa (R$) *
                    </label>
                    <input
                      type="text"
                      value={editPrecoCx}
                      onChange={(e) => {
                        setEditPrecoCx(e.target.value);
                        setPriceSavedSuccess(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCurrentPrice();
                      }}
                      placeholder="Ex: 54,90"
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        border: '1.5px solid #4ADE80',
                        borderRadius: '6px',
                        background: '#fff',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 'bold', color: '#334155', marginBottom: '3px' }}>
                      Fator Caixa (un/cx)
                    </label>
                    <input
                      type="text"
                      value={editFatorCx}
                      onChange={(e) => {
                        setEditFatorCx(e.target.value);
                        setPriceSavedSuccess(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCurrentPrice();
                      }}
                      placeholder="Ex: 8"
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        background: '#fff',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 'bold', color: '#64748B', marginBottom: '3px' }}>
                      Preço Unidade
                    </label>
                    <div
                      style={{
                        padding: '7px 9px',
                        fontSize: '12.5px',
                        fontWeight: 'bold',
                        background: '#DCFCE7',
                        border: '1px solid #BBF7D0',
                        borderRadius: '6px',
                        color: '#15803D',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatBRL(unitPreview)}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 'bold', color: '#64748B', marginBottom: '3px' }}>
                      Fator HL
                    </label>
                    <input
                      type="text"
                      value={editFatorHl}
                      onChange={(e) => {
                        setEditFatorHl(e.target.value);
                        setPriceSavedSuccess(false);
                      }}
                      placeholder="Ex: 0,0215"
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        fontSize: '12.5px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        background: '#fff',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleSaveCurrentPrice}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#16A34A',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>💾</span>
                      <span>Salvar Preço</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '6px', fontSize: '10.5px', color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>ℹ️</span>
                  <span>
                    Ao salvar, o preço da caixa e os valores financeiros (R$) são atualizados instantaneamente em toda a plataforma.
                  </span>
                </div>
              </div>

              {/* Seção 1: Dados Comerciais e Embalagem */}
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Informações Comerciais &amp; Embalagem
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}>
                    <small style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>PREÇO CAIXA</small>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{formatBRL(selectedProduct.U)}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}>
                    <small style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>FATOR CAIXA</small>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{selectedProduct.V} un/cx</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}>
                    <small style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>PREÇO UNIDADE</small>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{formatBRL(selectedProduct.W)}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '5px' }}>
                    <small style={{ color: '#64748b', fontSize: '10px', display: 'block' }}>FATOR HECTOLITRO</small>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>{N(selectedProduct.X)}</span>
                  </div>
                </div>
              </div>

              {/* Seção 2: Confronto de Estoque Promax vs Físico */}
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Confronto de Estoque: Promax vs Físico
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {/* Disponível Promax */}
                  <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400E', marginBottom: '4px' }}>
                      DISPONÍVEL PROMAX
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#78350F' }}>
                      {N(selectedProduct.H, 0)} caixas
                    </div>
                    <small style={{ fontSize: '11px', color: '#B45309' }}>
                      {N(selectedProduct.G, 0)} unidades | {Rt(selectedProduct.I)}
                    </small>
                  </div>

                  {/* Físico com Ajustes */}
                  <div style={{ background: '#E0F2FE', border: '1px solid #BAE6FD', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0369A1', marginBottom: '4px' }}>
                      FÍSICO COM AJUSTES
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0C4A6E' }}>
                      {N(selectedProduct.K, 0)} caixas
                    </div>
                    <small style={{ fontSize: '11px', color: '#0284C7' }}>
                      {N(selectedProduct.J, 0)} unidades | {Rt(selectedProduct.L)}
                    </small>
                  </div>

                  {/* Divergência Apurada */}
                  <div
                    style={{
                      background: selectedProduct.R < 0 ? '#FEE2E2' : selectedProduct.R > 0 ? '#FEF3C7' : '#DCFCE7',
                      border: `1px solid ${selectedProduct.R < 0 ? '#FCA5A5' : selectedProduct.R > 0 ? '#FDE68A' : '#86EFAC'}`,
                      padding: '10px',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: selectedProduct.R < 0 ? '#991B1B' : selectedProduct.R > 0 ? '#92400E' : '#166534', marginBottom: '4px' }}>
                      DIVERGÊNCIA
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: selectedProduct.R < 0 ? '#991B1B' : selectedProduct.R > 0 ? '#92400E' : '#166534' }}>
                      {selectedProduct.R > 0 ? '+' : ''}{selectedProduct.R} caixas
                    </div>
                    <small style={{ fontSize: '11px', color: selectedProduct.R < 0 ? '#B91C1C' : selectedProduct.R > 0 ? '#B45309' : '#15803D', fontWeight: 'bold' }}>
                      {Rt(selectedProduct.S)}
                    </small>
                  </div>
                </div>
              </div>

              {/* Seção 3: Detalhamento dos Ajustes Aplicados */}
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ajustes Manuais Aplicados na Conciliação
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <small style={{ color: '#64748b', fontSize: '9.5px', display: 'block' }}>SOBRAS (M)</small>
                    <span style={{ fontSize: '12.5px', fontWeight: 'bold' }}>{selectedProduct.M} un</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <small style={{ color: '#64748b', fontSize: '9.5px', display: 'block' }}>AVARIAS (N)</small>
                    <span style={{ fontSize: '12.5px', fontWeight: 'bold' }}>{selectedProduct.N} un</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <small style={{ color: '#64748b', fontSize: '9.5px', display: 'block' }}>REPACK (P)</small>
                    <span style={{ fontSize: '12.5px', fontWeight: 'bold' }}>{selectedProduct.P} un</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <small style={{ color: '#64748b', fontSize: '9.5px', display: 'block' }}>FALTAS MAP (O)</small>
                    <span style={{ fontSize: '12.5px', fontWeight: 'bold' }}>{selectedProduct.O} un</span>
                  </div>
                </div>
              </div>

              {/* Seção 4: Status no Estoque Central 02.05.02 e Histórico */}
              <div style={{ marginBottom: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: '#334155' }}>
                    ESTOQUE CENTRAL (RELATÓRIO 02.05.02):
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: ecSet.has(selectedProduct.c) ? '#DCFCE7' : '#FEE2E2',
                      color: ecSet.has(selectedProduct.c) ? '#166534' : '#991B1B',
                    }}
                  >
                    {ecSet.has(selectedProduct.c) ? '✓ Consta na 02.05.02' : '✕ Fora da 02.05.02'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#64748b' }}>
                  <span>DIF Congelada Anterior: <b>{diaMap.get(selectedProduct.c)?.eq ?? 0} cx</b></span>
                  <span>|</span>
                  <span>Fechamento Mês Anterior: <b>{menMap.get(selectedProduct.c)?.fechamento ?? 0} cx</b></span>
                </div>
              </div>

              {/* Seção 5: Status de Ativação na Plataforma & Botão Desativar por Inteiro */}
              {(() => {
                const isSelectedDesat = desativadosSet.has(selectedProduct.c) || !!selectedProduct.desativado;
                return (
                  <div
                    style={{
                      marginBottom: '16px',
                      background: isSelectedDesat ? '#FEF2F2' : '#FFFBEB',
                      border: `1.5px solid ${isSelectedDesat ? '#FCA5A5' : '#FDE68A'}`,
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 'bold', color: isSelectedDesat ? '#991B1B' : '#92400E' }}>
                          STATUS NA PLATAFORMA:
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: isSelectedDesat ? '#DC2626' : '#16A34A',
                            color: '#fff',
                          }}
                        >
                          {isSelectedDesat ? '🚫 DESATIVADO DA PLATAFORMA' : '✓ PRODUTO ATIVO'}
                        </span>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: isSelectedDesat ? '#7F1D1D' : '#78350F', lineHeight: 1.4 }}>
                      {isSelectedDesat
                        ? 'Este produto foi desativado por inteiro da plataforma. Todas as suas divergências, faltas e sobras estão desconsideradas e zeradas nos dashboards e relatórios operacionais.'
                        : 'Ao desativar este produto por inteiro, ele será removido dos cálculos de divergência, faltas e sobras em toda a plataforma sem afetar o histórico bruto.'}
                    </p>

                    {onToggleDesativar && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleDesativar(selectedProduct.c);
                          setSelectedProduct(null);
                        }}
                        style={{
                          width: '100%',
                          background: isSelectedDesat ? '#16A34A' : '#DC2626',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: isSelectedDesat ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 2px 4px rgba(220, 38, 38, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelectedDesat ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                        <span>
                          {isSelectedDesat ? 'REATIVAR PRODUTO NA PLATAFORMA' : 'DESATIVAR ESTE PRODUTO DA PLATAFORMA POR INTEIRO'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Botões de Ação no Rodapé do Modal */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                {onRecontar && (
                  <button
                    type="button"
                    onClick={() => {
                      onRecontar(selectedProduct.c);
                      setSelectedProduct(null);
                    }}
                    style={{
                      flex: 1,
                      background: '#D97706',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '9px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📋</span>
                    <span>Enviar para Recontagem</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '5px',
                    padding: '9px 16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
