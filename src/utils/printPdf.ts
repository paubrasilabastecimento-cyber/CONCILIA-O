import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RecontagemItem } from '../data/types';

/**
 * Gera e faz o download imediato da Folha de Recontagem em PDF (A4 Oficial)
 * Pronto para imprimir em qualquer impressora, 100% à prova de restrições de iframe.
 */
export function generateRecontagemPDF(
  recontagens: RecontagemItem[],
  options: { fileName?: string } = {}
): boolean {
  if (!recontagens || recontagens.length === 0) {
    return false;
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const now = new Date();
    const todayStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const fileName =
      options.fileName ||
      `folha_recontagem_guarabira_${now.toISOString().slice(0, 10)}.pdf`;

    // 1. Faixa Amarela Superior (Identidade Visual Estoque Oficial Guarabira)
    doc.setFillColor(255, 192, 0); // Amarelo #FFC000
    doc.rect(14, 10, 182, 16, 'F');

    // Borda preta elegante
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(14, 10, 182, 16, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('ESTOQUE OFICIAL GUARABIRA', 105, 17, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FOLHA OFICIAL DE RECONTAGEM FÍSICA DE ITENS', 105, 23, { align: 'center' });

    // 2. Informações de Data / Hora / Total de Itens
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`Data: ${todayStr} às ${timeStr}`, 14, 32);
    doc.text(`Total de Itens para Conferência: ${recontagens.length}`, 196, 32, { align: 'right' });

    // Linha divisória
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(14, 34.5, 196, 34.5);

    // Instruções para o conferente no depósito
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      'Instrução: Realizar contagem física rigorosa no depósito e preencher as quantidades apuradas a caneta.',
      14,
      38.5
    );

    // 3. Montagem da Tabela (Centralizada, com espaço para anotação a mão)
    const tableData = recontagens.map((item, index) => [
      (index + 1).toString(),
      item.cod.toString(),
      item.desc.toUpperCase(),
      '',
    ]);

    const N = recontagens.length;
    const fontSize = N > 25 ? 7 : 8.5;
    const cellPadding = N > 25 ? 2.0 : 3.0;

    autoTable(doc, {
      startY: 42,
      head: [
        [
          '#',
          'CÓDIGO',
          'DESCRIÇÃO DO PRODUTO',
          'VISTO',
        ],
      ],
      body: tableData,
      theme: 'grid',
      tableWidth: 182,
      styles: {
        font: 'helvetica',
        fontSize: fontSize,
        cellPadding: cellPadding,
        textColor: [20, 20, 20],
        lineColor: [160, 160, 160],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: [255, 192, 0],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: fontSize,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
        2: { halign: 'left', cellWidth: 120 },
        3: { halign: 'center', cellWidth: 24 },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 14, right: 14, bottom: 25 },
      didDrawPage: (data) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

        // Linhas de assinatura oficiais no rodapé
        const sigY = pageHeight - 20;
        doc.setDrawColor(60, 60, 60);
        doc.setLineWidth(0.3);

        doc.line(22, sigY, 92, sigY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Conferente Responsável', 57, sigY + 4, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        doc.text('Nome e Assinatura', 57, sigY + 7.5, { align: 'center' });

        doc.line(118, sigY, 188, sigY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text('Supervisor de Estoque / Auditor', 153, sigY + 4, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        doc.text('Visto e Validação', 153, sigY + 7.5, { align: 'center' });

        // Rodapé com paginação
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(
          `Página ${data.pageNumber} • Estoque Oficial Guarabira`,
          105,
          pageHeight - 6,
          { align: 'center' }
        );
      },
    });

    // Baixa o arquivo PDF diretamente para o dispositivo do usuário
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF da folha de recontagem:', err);
    return false;
  }
}

/**
 * Tenta acionar a impressão direta no navegador através de um iframe isolado
 * Isso evita imprimir a barra de navegação superior e elementos de tela.
 */
export function printDirectSheet(recontagens: RecontagemItem[]): boolean {
  if (!recontagens || recontagens.length === 0) return false;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>ESTOQUE OFICIAL GUARABIRA - FOLHA DE RECONTAGEM</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 14mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, "Helvetica Neue", sans-serif;
            color: #000;
            margin: 0 auto;
            max-width: 182mm;
            width: 100%;
            padding: 0;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            background: #FFC000;
            border: 2px solid #000;
            padding: 8px;
            text-align: center;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 16px;
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          .header h2 {
            margin: 3px 0 0;
            font-size: 11px;
            font-weight: bold;
            color: #222;
          }
          .meta {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #333;
            border-bottom: 1px solid #999;
            padding-bottom: 4px;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #FFC000 !important;
            color: #000 !important;
            border: 1px solid #000;
            padding: 5px 4px;
            font-weight: bold;
            font-size: 10px;
            text-align: center;
          }
          td {
            border: 1px solid #777;
            padding: 5px 4px;
            font-size: 10px;
          }
          .col-num { width: 36px; font-weight: bold; color: #555; text-align: center; }
          .col-cod { width: 95px; font-weight: bold; font-family: monospace; font-size: 12px; text-align: center; }
          .col-desc { font-weight: bold; text-align: left; padding-left: 8px; }
          .col-count { width: 110px; font-size: 9px; color: #666; letter-spacing: 1px; }
          .col-visto { width: 80px; text-align: center; }
          .signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-around;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 220px;
          }
          .sig-line {
            border-top: 1.5px solid #000;
            padding-top: 4px;
            font-size: 11px;
            font-weight: bold;
          }
          .sig-desc {
            font-size: 9px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ESTOQUE OFICIAL GUARABIRA</h1>
          <h2>FOLHA OFICIAL DE RECONTAGEM FÍSICA DE ITENS</h2>
        </div>
        <div class="meta">
          <div><b>Data:</b> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div><b>Total de Itens:</b> ${recontagens.length}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-cod">CÓDIGO</th>
              <th class="col-desc">DESCRIÇÃO DO PRODUTO</th>
              <th class="col-visto">VISTO</th>
            </tr>
          </thead>
          <tbody>
            ${recontagens
              .map(
                (item, idx) => `
              <tr>
                <td class="col-num">${idx + 1}</td>
                <td class="col-cod">${item.cod}</td>
                <td class="col-desc">${item.desc}</td>
                <td class="col-visto"></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Conferente Responsável</div>
            <div class="sig-desc">Nome e Assinatura</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Supervisor / Auditor de Estoque</div>
            <div class="sig-desc">Visto e Validação</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Tenta criar iframe invisível para disparar o print limpo
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print bloqueado pelo navegador/sandbox:', e);
          // Fallback para window.print() direto
          try {
            window.focus();
            window.print();
          } catch {}
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {}
          }, 3000);
        }
      }, 500);
      return true;
    }
  } catch (err) {
    console.warn('Falha ao instanciar iframe de impressão:', err);
    try {
      window.focus();
      window.print();
      return true;
    } catch {}
  }

  return false;
}
