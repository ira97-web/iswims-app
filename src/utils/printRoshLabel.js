import { formatMalayDate } from './helpers';

export function handlePrintRoshWasteLabel(item, profile) {
  const printWindow = window.open('', '_blank');
  
  const cleanCode = item.kod_sw ? item.kod_sw.replace(/\s+/g, '').toUpperCase() : 'SW430';
  
  const templateImagePath = `/labels/${cleanCode}.png`;
  const fallbackTemplatePath = `/labels/SW430.png`;

  const ptjName = item.fakulti || profile?.fakulti || 'FST';
  const wasteId = item.id_sisa || 'FST-2026-430-37534D0';
  const dateGenerated = formatMalayDate(item.created_at || item.tarikh_pelupusan);
  const roomLab = item.nama_makmal || profile?.senarai_makmal?.[0] || 'Makmal Tahun 2 Oleokimia 2108';
  const labType = item.kategori_makmal || 'Makmal Pengajaran/Perkhidmatan/Instrumentasi';
  const deptCenter = profile?.program_jabatan || 'Unit Sains Kimia';
  const chemicalName = item.nama_buangan || 'ETHANOL';

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
          
          /* FIXED A5 LANDSCAPE CANVAS */
          .label-canvas {
            position: relative;
            width: 794px;
            height: 559px;
            margin: 0 auto;
            overflow: hidden;
            background: #fff;
          }

          /* BACKGROUND TEMPLATE */
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

          /* 1. PTJ NAME: POSITIONED RIGHT NEXT TO 'Nama PTj/ PTj Name:' */
          .field-ptj {
            top: 22px;
            left: 635px;
            font-size: 15px;
            text-align: left;
          }

          /* 2. ID SISA: CENTERED DIRECTLY BELOW 'Nama PTj/ PTj Name:' */
          .field-id-sisa {
            top: 58px;
            left: 480px;
            width: 280px;
            font-size: 12px;
            text-align: center;
            font-weight: 900;
            letter-spacing: 0.3px;
          }

          /* METADATA FIELDS */
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
          }

          /* 3. QR CODE: SHIFTED INWARD & SCALED TO FIT STRICTLY INSIDE THE CELL BORDER */
          .field-qr-code {
            top: 295px;
            right: 48px;
            width: 88px;
            height: 88px;
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

          <!-- QR CODE OVERLAY -->
          <div class="data-overlay field-qr-code">
            <img src="https://quickchart.io/qr?text=${encodeURIComponent(wasteId)}&size=100" alt="QR Code" />
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