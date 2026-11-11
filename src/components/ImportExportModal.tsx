import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { ProdutoTabela07 } from '../types/tabela';
import { TABELA_07_INFO } from '../data/tabela07Data';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: ProdutoTabela07[];
  onImportProdutos: (novosProdutos: ProdutoTabela07[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  produtos,
  onImportProdutos,
}) => {
  const [csvContent, setCsvContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const exportToCsv = () => {
    const headers = [
      'Tabela',
      'Data Vigencia',
      'Codigo Grupo',
      'Codigo',
      'Descricao',
      'Categoria',
      'Tipo Mercadoria',
      'Unidade Venda',
      'Fator Embalagem',
      'Valor Tabela (R$)',
      'Valor Minimo (R$)',
      'Preco Sugerido (R$)',
      'Aliquota ICMS (%)',
      'Aliquota ST (%)',
      'Aliquota FCP (%)',
      'Regra Comercial',
      'Status',
    ];

    const rows = produtos.map((p) => [
      `"${p.tabela}"`,
      `"${p.dataVigencia}"`,
      `"${p.codigoGrupo}"`,
      `"${p.codigo}"`,
      `"${p.descricao}"`,
      `"${p.categoria}"`,
      `"${p.tipoMercadoria}"`,
      `"${p.unidadeVenda}"`,
      p.fatorEmbalagem,
      p.valorTabela.toFixed(2),
      p.valorMinimo.toFixed(2),
      p.precoSugeridoVenda.toFixed(2),
      p.aliquotaIcms.toFixed(1),
      (p.aliquotaSt || 0).toFixed(1),
      (p.aliquotaFcp || 0).toFixed(1),
      `"${p.regraComercial}"`,
      `"${p.status}"`,
    ]);

    const csvString = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tabela_07_folha_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!csvContent.trim()) {
      setErrorMsg('Cole o conteúdo CSV para importar.');
      return;
    }

    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('O CSV deve conter pelo menos uma linha de cabeçalho e uma de dados.');
      }

      // Check delimiter (comma or semicolon)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';

      const parsed: ProdutoTabela07[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split preserving simple quotes
        const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 5) continue;

        const codigo = cols[3] || cols[0] || `IMP-${Date.now()}-${i}`;
        const descricao = cols[4] || cols[1] || 'PRODUTO IMPORTADO';
        const categoria = (cols[5] as any) || 'Outros';
        const unidadeVenda = (cols[7] as any) || 'CX';
        const valorTabela = parseFloat(cols[9] || cols[2] || '0') || 0;
        const valorMinimo = parseFloat(cols[10] || cols[3] || '0') || valorTabela * 0.95;

        parsed.push({
          tabela: TABELA_07_INFO.nomeTabela,
          dataVigencia: TABELA_07_INFO.vigencia,
          codigoGrupo: '01103 BEBIDAS',
          codigo,
          descricao,
          categoria: (categoria as any) || 'Outros',
          tipoMercadoria: 'Produto',
          unidadeVenda: (unidadeVenda as any) || 'CX',
          fatorEmbalagem: parseInt(cols[8] || '12', 10) || 12,
          valorTabela,
          valorMinimo,
          precoSugeridoVenda: parseFloat(cols[11] || '0') || valorTabela * 1.25,
          aliquotaIcms: parseFloat(cols[12] || '20.0') || 20.0,
          aliquotaSt: parseFloat(cols[13] || '5.5') || 5.5,
          aliquotaFcp: parseFloat(cols[14] || '2.0') || 2.0,
          regraComercial: cols[15] || 'Não cumulativo com etiqueta',
          status: 'Ativo',
        });
      }

      if (parsed.length === 0) {
        throw new Error('Nenhum produto válido foi identificado no formato informado.');
      }

      onImportProdutos(parsed);
      setSuccessMsg(`${parsed.length} produtos importados com sucesso para a Tabela 07!`);
      setCsvContent('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar dados CSV.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base">Exportar & Importar Tabela 07</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Section */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                Exportar Tabela 07 Completa (CSV)
              </h4>
              <p className="text-xs text-blue-800 mt-1">
                Gera arquivo CSV compatível com Excel, Google Planilhas e sistemas ERP com os {produtos.length} produtos vigentes.
              </p>
            </div>
            <button
              onClick={exportToCsv}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
            >
              Baixar CSV (.csv)
            </button>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-slate-700" />
              Importar / Atualizar Planilha
            </h4>
            <p className="text-xs text-slate-500">
              Cole abaixo as linhas no formato CSV (delimitado por &quot;;&quot; ou &quot;,&quot;):
            </p>
            <textarea
              rows={5}
              placeholder={`Tabela;Data Vigencia;Grupo;Codigo;Descricao;Categoria;Tipo;Unidade;Fator;Valor Tabela;Valor Minimo;Sugerido;ICMS;ST;FCP;Regra;Status\n"07 Tabela Folha";"26/02/2025";"01103";"12150";"CERVEJA PROMO 350ML";"Cervejas";"Produto";"CX";12;35.00;33.00;42.00;20.0;5.5;2.0;"Não cumulativo";"Ativo"`}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full font-mono text-xs p-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <button
              onClick={handleImport}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Processar e Adicionar à Tabela 07
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
