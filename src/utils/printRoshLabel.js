import { formatMalayDate } from './helpers';

// Helper function to build 1 label overlay canvas
function buildLabelCanvasHtml(item, profile) {
  const cleanCode = item.kod_sw ? item.kod_sw.replace(/\s+/g, '').toUpperCase() : 'SW430';
  const templateImagePath = `/labels/${cleanCode}.png`;
  const fallbackTemplatePath = `/labels/SW430.png`;

  const ptjName = item.fakulti || profile?.fakulti || 'FST';
  const wasteId = item.id_sisa || 'FST-2026-430-1';
  const dateGenerated = formatMalayDate(item.created_at || item.tarikh_pelupusan);
  const roomLab = item.nama_makmal || profile?.senarai_makmal?.[0] || 'Makmal Utama';
  const labType = item.kategori_makmal || 'Makmal Penyelidikan';
  const deptCenter = profile?.program_jabatan || '-';
  const chemicalName = item.nama_buangan || '-';
  const ukmperVal = profile?.ukmper || '-';
  const statusVal = item.status || 'SUBMITTED';

  const qrPayload = `ID SISA: ${wasteId}\nMAKMAL: ${roomLab}\nUKMPER: ${ukmperVal}\nSTATUS: ${statusVal}`;

  return `
    <div class="label-canvas">
      <img 
        src="${templateImagePath}" 
        class="bg-template" 
        alt="ROSH Template" 
        onerror="this.src='${fallbackTemplatePath}'" 
      />
      <div class="data-overlay field-ptj">${ptjName}</div>
      <div class="data-overlay field-id-sisa">${wasteId}</div>
      <div class="data-overlay field-tarikh">${dateGenerated}</div>
      <div class="data-overlay field-makmal">${roomLab}</div>
      <div class="data-overlay field-jenis-makmal">${labType}</div>
      <div class="data-overlay field-jabatan">${deptCenter}</div>
      <div class="data-overlay field-nama-bahan">${chemicalName}</div>

      <div class="data-overlay field-qr-code">
        <img src="https://quickchart.io/qr?text=${encodeURIComponent(qrPayload)}&size=120" alt="QR Code" />
      </div>
    </div>
  `;
}

// 1. SINGLE LABEL PRINTING (A5 Landscape)
export function handlePrintRoshWasteLabel(item, profile) {
  const printWindow = window.open('', '_blank');
  const labelHtml = buildLabelCanvasHtml(item, profile);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label Sisa ROSH UKM - ${item.id_sisa}</title>
        <style>
          @page { size: A5 landscape; margin: 0; }
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
          .label-canvas {
            position: relative;
            width: 794px;
            height: 559px;
            margin: 0 auto;
            overflow: hidden;
            background: #fff;
          }
          .bg-template { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; z-index: 1; }
          .data-overlay { position: absolute; z-index: 10; font-weight: bold; color: #000; line-height: 1.2; word-break: break-word; }
          .field-ptj { top: 4.3%; left: 70.5%; font-size: 15px; text-align: left; }
          .field-id-sisa { top: 10.3%; left: 42.8%; width: 35.2%; font-size: 12px; text-align: center; font-weight: 900; }
          .field-tarikh { top: 51.8%; left: 34.6%; font-size: 13px; }
          .field-makmal { top: 60.5%; left: 34.6%; font-size: 13px; }
          .field-jenis-makmal { top: 69.4%; left: 34.6%; font-size: 13px; }
          .field-jabatan { top: 78.0%; left: 34.6%; font-size: 13px; width: 60%; }
          .field-nama-bahan { top: 86.8%; left: 34.6%; font-size: 13px; width: 60%; }
          .field-qr-code { top: 52.8%; right: 6.0%; width: 11.0%; height: auto; }
          .field-qr-code img { width: 100%; height: auto; display: block; }
        </style>
      </head>
      <body>
        ${labelHtml}
        <script>window.print();</script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// 2. BATCH PRINTING: 4 LABELS PER A4 PAGE (2x2 GRID)
export function handlePrintBatchRoshLabels(items, profile) {
  if (!items || items.length === 0) return;

  const printWindow = window.open('', '_blank');

  // Split array of items into groups of 4
  const chunks = [];
  for (let i = 0; i < items.length; i += 4) {
    chunks.push(items.slice(i, i + 4));
  }

  const pagesHtml = chunks.map((chunk) => {
    const labelsInChunk = chunk.map((item) => buildLabelCanvasHtml(item, profile)).join('');
    return `<div class="a4-page">${labelsInChunk}</div>`;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Batch Label ROSH UKM (${items.length} Label)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          
          /* A4 PAGE CONTAINER: 2x2 GRID FOR 4 LABELS */
          .a4-page {
            width: 198mm;
            height: 284mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 4mm;
            page-break-after: always;
            box-sizing: border-box;
          }

          /* INDIVIDUAL LABEL CELL INSIDE A4 GRID */
          .label-canvas {
            position: relative;
            width: 100%;
            height: 100%;
            border: 1px solid #999;
            overflow: hidden;
            background: #fff;
            box-sizing: border-box;
          }

          .bg-template {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            z-index: 1;
          }

          /* PERCENTAGE-BASED OVERLAY COORDINATES FOR SCALED 2x2 GRID */
          .data-overlay {
            position: absolute;
            z-index: 10;
            font-weight: bold;
            color: #000;
            line-height: 1.1;
            word-break: break-word;
          }

          .field-ptj { top: 4.3%; left: 70.5%; font-size: 2.8mm; text-align: left; }
          .field-id-sisa { top: 10.3%; left: 42.8%; width: 35.2%; font-size: 2.4mm; text-align: center; font-weight: 900; }
          .field-tarikh { top: 51.8%; left: 34.6%; font-size: 2.5mm; }
          .field-makmal { top: 60.5%; left: 34.6%; font-size: 2.5mm; }
          .field-jenis-makmal { top: 69.4%; left: 34.6%; font-size: 2.5mm; }
          .field-jabatan { top: 78.0%; left: 34.6%; font-size: 2.5mm; width: 60%; }
          .field-nama-bahan { top: 86.8%; left: 34.6%; font-size: 2.5mm; width: 60%; }

          .field-qr-code { top: 52.8%; right: 6.0%; width: 12.0%; height: auto; }
          .field-qr-code img { width: 100%; height: auto; display: block; }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}