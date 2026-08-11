import { formatMalayDate } from './helpers';

export function handlePrintRoshWasteLabel(item, profile) {
  const printWindow = window.open('', '_blank');
  
  // Format code key (e.g., SW430, SW206)
  const cleanCode = item.kod_sw ? item.kod_sw.replace(/\s+/g, '').toUpperCase() : 'SW430';
  
  // Dynamic template image path in public/labels/
  const templateImagePath = `/labels/${cleanCode}.png`;
  const fallbackTemplatePath = `/labels/SW430.png`;

  const ptjName = item.fakulti || profile?.fakulti || 'SERI';
  const wasteId = item.id_sisa || 'SERI-2026-15-1950';
  const dateGenerated = formatMalayDate(item.created_at || item.tarikh_pelupusan);
  const roomLab = item.nama_makmal || profile?.senarai_makmal?.[0] || 'Makmal Silikon';
  const labType = item.kategori_makmal || 'Makmal Penyelidikan';
  const deptCenter = profile?.program_jabatan || 'Pusat Penyelidikan Tenaga Suria';
  const chemicalName = item.nama_buangan || 'ETHANOLAMINE';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label Sisa ROSH UKM - ${cleanCode} - ${wasteId}</title>
        <style>
          @page {
            size: A5 landscape;
            margin: 0;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #000;
          }
          
          /* FIXED A5 LANDSCAPE CONTAINER (794px x 559px) */
          .label-canvas {
            position: relative;
            width: 794px;
            height: 559px;
            margin: 0 auto;
            overflow: hidden;
            background: #fff;
          }

          /* BACKGROUND OFFICIAL ROSH TEMPLATE IMAGE */
          .bg-template {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            z-index: 1;
          }

          /* ABSOLUTE DATA OVERLAYS */
          .data-overlay {
            position: absolute;
            z-index: 10;
            font-weight: bold;
            color: #000;
            line-height: 1.2;
            word-break: break-word;
          }

          /* FIELD COORDINATES MATCHING ROSH UKM TEMPLATE */
          .field-ptj {
            top: 28px;
            right: 40px;
            font-size: 14px;
            text-align: right;
          }

          .field-id-sisa {
            top: 56px;
            right: 40px;
            font-size: 13px;
            text-align: right;
            font-weight: 900;
          }

          .field-tarikh {
            top: 290px;
            left: 275px;
            font-size: 13px;
          }

          .field-makmal {
            top: 338px;
            left: 275px;
            font-size: 13px;
          }

          .field-jenis-makmal {
            top: 388px;
            left: 275px;
            font-size: 13px;
          }

          .field-jabatan {
            top: 436px;
            left: 275px;
            font-size: 13px;
            width: 480px;
          }

          .field-nama-bahan {
            top: 485px;
            left: 275px;
            font-size: 13px;
            width: 480px;
            color: #000;
          }

          .field-qr-code {
            top: 288px;
            right: 32px;
            width: 110px;
            height: 110px;
          }

          .field-qr-code img {
            width: 100%;
            height: 100%;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="label-canvas">
          <!-- BACKGROUND TEMPLATE IMAGE -->
          <img 
            src="${templateImagePath}" 
            id="bgImage" 
            class="bg-template" 
            alt="ROSH Template" 
            onerror="this.src='${fallbackTemplatePath}'" 
          />

          <!-- OVERLAY DATA FIELDS -->
          <div class="data-overlay field-ptj">${ptjName}</div>
          <div class="data-overlay field-id-sisa">${wasteId}</div>
          <div class="data-overlay field-tarikh">${dateGenerated}</div>
          <div class="data-overlay field-makmal">${roomLab}</div>
          <div class="data-overlay field-jenis-makmal">${labType}</div>
          <div class="data-overlay field-jabatan">${deptCenter}</div>
          <div class="data-overlay field-nama-bahan">${chemicalName}</div>

          <!-- DYNAMIC QR CODE OVERLAY -->
          <div class="data-overlay field-qr-code">
            <img src="https://quickchart.io/qr?text=${encodeURIComponent(wasteId)}&size=120" alt="QR Code" />
          </div>
        </div>

        <script>
          const img = document.getElementById('bgImage');
          if (img) {
            img.onload = () => { window.print(); };
            img.onerror = () => { window.print(); };
          } else {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}