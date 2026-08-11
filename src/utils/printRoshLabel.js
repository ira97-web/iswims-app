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

  // SW430 SDS QR CODE (DISPLAYED ONLY IF SW430 & SDS IS UPLOADED)
  const isSw430 = cleanCode === 'SW430';
  const sdsUrl = item.sds_url;

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

      <!-- PRIMARY MAKLUMAT SISA QR CODE -->
      <div class="data-overlay ${isSw430 && sdsUrl ? 'field-qr-primary-split' : 'field-qr-code'}">
        <img src="https://quickchart.io/qr?text=${encodeURIComponent(qrPayload)}&size=100" alt="QR Code" />
      </div>

      <!-- SECONDARY SDS QR CODE (RIGHT BELOW PRIMARY QR FOR SW430) -->
      ${isSw430 && sdsUrl ? `
        <div class="data-overlay field-qr-sds-split">
          <img src="https://quickchart.io/qr?text=${encodeURIComponent(sdsUrl)}&size=100" alt="SDS QR" />
          <div style="font-size: 2.0mm; font-weight: bold; text-align: center; color: #000; margin-top: 1px;">QR SDS CHEMICAL</div>
        </div>
      ` : ''}
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
          .bg-template { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; }
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

          .field-qr-primary-split { top: 51.5%; right: 6.0%; width: 9.5%; height: auto; }
          .field-qr-primary-split img { width: 100%; height: auto; display: block; }

          .field-qr-sds-split { top: 71.0%; right: 6.0%; width: 9.5%; height: auto; }
          .field-qr-sds-split img { width: 100%; height: auto; display: block; }
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

// 2. BATCH PRINTING: AUTOMATICALLY GENERATES MULTIPLE LABELS BASED ON BOTTLE COUNT
export function handlePrintBatchRoshLabels(items, profile) {
  if (!items || items.length === 0) return;

  // EXPAND ITEMS ARRAY BASED ON TOTAL BOTTLE QUANTITY FOR EACH ID SISA
  const expandedItems = [];
  items.forEach((item) => {
    const b25 = parseInt(item.botol_2_5l_kimia || item.botol_2_5l_kosong || 0, 10) || 0;
    const b40 = parseInt(item.botol_4_0l_kimia || item.botol_4_0l_kosong || 0, 10) || 0;
    
    // Total bottle count (or 1 if no bottle quantity specified, e.g., solid waste/kg)
    const totalBottles = (b25 + b40) > 0 ? (b25 + b40) : 1;

    for (let i = 0; i < totalBottles; i++) {
      expandedItems.push(item);
    }
  });

  const printWindow = window.open('', '_blank');

  // Split expandedItems array into chunks of 4 (A4 Landscape 2x2 Grid)
  const chunks = [];
  for (let i = 0; i < expandedItems.length; i += 4) {
    chunks.push(expandedItems.slice(i, i + 4));
  }

  const pagesHtml = chunks.map((chunk) => {
    const labelsInChunk = chunk.map((item) => buildLabelCanvasHtml(item, profile)).join('');
    return `<div class="a4-page-landscape">${labelsInChunk}</div>`;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Batch Label ROSH UKM (${expandedItems.length} Label)</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 4mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          
          .a4-page-landscape {
            width: 289mm;
            height: 201mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 3mm;
            page-break-after: always;
            box-sizing: border-box;
          }

          .label-canvas {
            position: relative;
            width: 100%;
            height: 100%;
            border: 1px dashed #ccc;
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
            object-fit: fill;
            z-index: 1;
          }

          .data-overlay {
            position: absolute;
            z-index: 10;
            font-weight: bold;
            color: #000;
            line-height: 1.1;
            word-break: break-word;
          }

          .field-ptj { top: 4.3%; left: 70.5%; font-size: 3.2mm; text-align: left; }
          .field-id-sisa { top: 10.3%; left: 42.8%; width: 35.2%; font-size: 2.6mm; text-align: center; font-weight: 900; }
          .field-tarikh { top: 51.8%; left: 34.6%; font-size: 2.8mm; }
          .field-makmal { top: 60.5%; left: 34.6%; font-size: 2.8mm; }
          .field-jenis-makmal { top: 69.4%; left: 34.6%; font-size: 2.8mm; }
          .field-jabatan { top: 78.0%; left: 34.6%; font-size: 2.8mm; width: 60%; }
          .field-nama-bahan { top: 86.8%; left: 34.6%; font-size: 2.8mm; width: 60%; }

          .field-qr-code { top: 52.8%; right: 6.0%; width: 11.5%; height: auto; }
          .field-qr-code img { width: 100%; height: auto; display: block; }

          .field-qr-primary-split { top: 51.5%; right: 6.0%; width: 9.2%; height: auto; }
          .field-qr-primary-split img { width: 100%; height: auto; display: block; }

          .field-qr-sds-split { top: 71.0%; right: 6.0%; width: 9.2%; height: auto; }
          .field-qr-sds-split img { width: 100%; height: auto; display: block; }
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