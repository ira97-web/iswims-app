import { swLabelConfig } from '../constants/swLabelConfig';
import { formatMalayDate } from './helpers';

export function handlePrintRoshWasteLabel(item, profile) {
  const printWindow = window.open('', '_blank');
  const cleanCode = item.kod_sw ? item.kod_sw.replace(/\s+/g, '').toUpperCase() : 'SW430';
  const config = swLabelConfig[cleanCode] || {
    code: item.kod_sw || "SW 430",
    titleMs: "BAHAN KIMIA MAKMAL YANG USANG",
    titleEn: "OBSOLETE LABORATORY CHEMICALS",
    chemLabelMs: "Nama Bahan Kimia",
    chemLabelEn: "Name of Chemical",
    hazards: ["TOKSIK", "MENGAKIS", "PEPEJAL_MUDAH_TERBAKAR", "CECAIR_MUDAH_TERBAKAR", "CAMPURAN_BERBAHAYA"],
    showCheckboxes: true
  };

  const ptjName = item.fakulti || profile?.fakulti || 'FST';
  const wasteId = item.id_sisa || 'SERI-2026-15-1950';
  const dateGenerated = formatMalayDate(item.created_at || item.tarikh_pelupusan);
  const roomLab = item.nama_makmal || profile?.senarai_makmal?.[0] || 'Makmal Silikon';
  const labType = item.kategori_makmal || 'Makmal Penyelidikan';
  const deptCenter = profile?.program_jabatan || 'Pusat Penyelidikan Tenaga Suria';
  const chemicalName = item.nama_buangan || 'ETHANOLAMINE';

  // SVG Hazard Warning Diamonds
  function getHazardGraphic(type, hasCheckbox = false) {
    let iconSvg = '';
    let labelText = '';

    if (type === 'TOKSIK') {
      labelText = 'BAHAN TOKSIK<br/>(BUANGAN)';
      iconSvg = `
        <svg width="55" height="55" viewBox="0 0 100 100" style="border: 1.5px solid #000; transform: rotate(45deg); margin: 8px auto; background: #fff;">
          <g style="transform: rotate(-45deg); transform-origin: center;">
            <path d="M50 20 c-11 0 -18 7 -18 18 c0 6 3 10 7 13 v5 h22 v-5 c4 -3 7 -7 7 -13 c0 -11 -7 -18 -18 -18 z" fill="#000"/>
            <circle cx="43" cy="34" r="3.5" fill="#fff"/>
            <circle cx="57" cy="34" r="3.5" fill="#fff"/>
            <path d="M43 51 h14 v4 h-14 z" fill="#fff"/>
            <path d="M22 22 L78 78 M78 22 L22 78" stroke="#000" stroke-width="4.5"/>
          </g>
        </svg>`;
    } else if (type === 'MENGAKIS') {
      labelText = 'BAHAN MENGAKIS<br/>(BUANGAN)';
      iconSvg = `
        <svg width="55" height="55" viewBox="0 0 100 100" style="border: 1.5px solid #000; transform: rotate(45deg); margin: 8px auto; background: #fff;">
          <g style="transform: rotate(-45deg); transform-origin: center;">
            <polygon points="12,52 88,52 88,88 12,88" fill="#000"/>
            <rect x="25" y="20" width="10" height="25" fill="#000" transform="rotate(-20 25 20)"/>
            <rect x="65" y="20" width="10" height="25" fill="#000" transform="rotate(20 65 20)"/>
          </g>
        </svg>`;
    } else if (type === 'PEPEJAL_MUDAH_TERBAKAR') {
      labelText = 'PEPEJAL MUDAH TERBAKAR<br/>(BUANGAN)';
      iconSvg = `
        <svg width="55" height="55" viewBox="0 0 100 100" style="border: 1.5px solid #000; transform: rotate(45deg); margin: 8px auto; background: repeating-linear-gradient(90deg, #e02424, #e02424 6px, #fff 6px, #fff 12px);">
          <g style="transform: rotate(-45deg); transform-origin: center;">
            <path d="M50 15 C45 32 30 38 30 58 C30 70 40 78 50 78 C60 78 70 70 70 58 C70 38 55 32 50 15 Z" fill="#000"/>
          </g>
        </svg>`;
    } else if (type === 'CECAIR_MUDAH_TERBAKAR') {
      labelText = 'CECAIR MUDAH TERBAKAR<br/>(BUANGAN)';
      iconSvg = `
        <svg width="55" height="55" viewBox="0 0 100 100" style="border: 1.5px solid #000; transform: rotate(45deg); margin: 8px auto; background: #e02424;">
          <g style="transform: rotate(-45deg); transform-origin: center;">
            <path d="M50 15 C45 32 30 38 30 58 C30 70 40 78 50 78 C60 78 70 70 70 58 C70 38 55 32 50 15 Z" fill="#000"/>
          </g>
        </svg>`;
    } else if (type === 'CAMPURAN_BERBAHAYA') {
      labelText = 'CAMPURAN PELBAGAI<br/>BAHAN BERBAHAYA<br/>(BUANGAN)';
      iconSvg = `
        <svg width="55" height="55" viewBox="0 0 100 100" style="border: 1.5px solid #000; transform: rotate(45deg); margin: 8px auto; background: #fff;">
          <g style="transform: rotate(-45deg); transform-origin: center;">
            <line x1="15" y1="10" x2="15" y2="50" stroke="#000" stroke-width="5"/>
            <line x1="28" y1="10" x2="28" y2="50" stroke="#000" stroke-width="5"/>
            <line x1="41" y1="10" x2="41" y2="50" stroke="#000" stroke-width="5"/>
            <line x1="54" y1="10" x2="54" y2="50" stroke="#000" stroke-width="5"/>
            <line x1="67" y1="10" x2="67" y2="50" stroke="#000" stroke-width="5"/>
            <line x1="80" y1="10" x2="80" y2="50" stroke="#000" stroke-width="5"/>
          </g>
        </svg>`;
    }

    return `
      <div style="display: flex; align-items: flex-start; gap: 4px; text-align: center; flex: 1;">
        ${hasCheckbox ? '<div style="width: 14px; height: 14px; border: 2px solid #000; margin-top: 4px; flex-shrink: 0;"></div>' : ''}
        <div style="flex-grow: 1;">
          ${iconSvg}
          <div style="font-size: 7.5px; font-weight: bold; line-height: 1.1; margin-top: 2px;">${labelText}</div>
        </div>
      </div>`;
  }

  // Render Hazard Row
  let hazardsHtml = '';
  if (config.showCheckboxes) {
    const all5Hazards = ['TOKSIK', 'MENGAKIS', 'PEPEJAL_MUDAH_TERBAKAR', 'CECAIR_MUDAH_TERBAKAR', 'CAMPURAN_BERBAHAYA'];
    hazardsHtml = all5Hazards.map(h => getHazardGraphic(h, true)).join('');
  } else {
    hazardsHtml = config.hazards.map(h => getHazardGraphic(h, false)).join('');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label Sisa ROSH UKM - ${config.code} - ${wasteId}</title>
        <style>
          @page {
            size: A5 landscape;
            margin: 0;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 12px;
            background: #fff;
            color: #000;
            box-sizing: border-box;
          }
          .rosh-card {
            width: 100%;
            max-width: 780px;
            border: 2.5px solid #000;
            margin: 0 auto;
            box-sizing: border-box;
            background: #fff;
          }

          /* 1. HEADER ROW */
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
          }
          .ukm-brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .ukm-brand img {
            height: 48px;
            width: auto;
            object-fit: contain;
          }
          .ukm-title-bold {
            font-size: 13px;
            font-weight: bold;
            line-height: 1.2;
          }
          .ukm-title-sub {
            font-size: 9.5px;
            font-style: italic;
            color: #333;
          }
          .ptj-id-box {
            text-align: right;
            font-size: 13px;
            line-height: 1.4;
          }
          .ptj-label {
            font-weight: normal;
            color: #666;
            font-style: italic;
          }

          /* 2. GREY TITLE BAR */
          .grey-title-bar {
            background-color: #d0d0d0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            display: flex;
            align-items: center;
            padding: 6px 14px;
          }
          .sw-code-large {
            font-size: 30px;
            font-weight: 900;
            width: 170px;
            flex-shrink: 0;
            letter-spacing: 0.5px;
          }
          .sw-titles {
            flex-grow: 1;
            text-align: center;
          }
          .sw-title-ms {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .sw-title-en {
            font-size: 10.5px;
            font-style: italic;
            text-transform: uppercase;
            margin-top: 2px;
          }

          /* 3. HAZARDS ROW */
          .hazards-row {
            display: flex;
            justify-content: space-around;
            align-items: flex-start;
            padding: 8px 12px;
            border-bottom: 2px solid #000;
            gap: 8px;
          }

          /* 4. METADATA TABLE WITH QR CODE */
          .meta-table {
            width: 100%;
            border-collapse: collapse;
          }
          .meta-table td {
            border-bottom: 1.5px solid #000;
            padding: 6px 10px;
            vertical-align: middle;
            font-size: 11px;
          }
          .meta-table tr:last-child td {
            border-bottom: none;
          }
          .label-col {
            width: 180px;
            border-right: 1.5px solid #000;
          }
          .col-label-ms {
            font-weight: bold;
            font-size: 11px;
          }
          .col-label-en {
            font-size: 9.5px;
            font-style: italic;
            color: #333;
          }
          .val-col {
            font-weight: bold;
            font-size: 11.5px;
          }
          .qr-col {
            width: 115px;
            border-left: 1.5px solid #000;
            text-align: center;
            vertical-align: middle !important;
            padding: 4px !important;
          }

          /* 5. FOOTER */
          .rosh-footer {
            border-top: 2px solid #000;
            padding: 6px;
            text-align: center;
            font-size: 9px;
            font-weight: bold;
            letter-spacing: 0.2px;
          }
        </style>
      </head>
      <body>
        <div class="rosh-card">
          <!-- 1. HEADER ROW -->
          <div class="header-row">
            <div class="ukm-brand">
              <img src="/ukm-logo.png" id="ukmLogo" alt="UKM Logo" />
              <div>
                <div class="ukm-title-bold">UNIVERSITI KEBANGSAAN MALAYSIA</div>
                <div class="ukm-title-sub">The National University of Malaysia</div>
              </div>
            </div>
            <div class="ptj-id-box">
              <div><span class="ptj-label">Nama PTj/ PTj Name:</span> <strong>${ptjName}</strong></div>
              <div style="margin-top: 4px;">
                <strong>ID SISA:</strong><br/>
                <strong>${wasteId}</strong>
              </div>
            </div>
          </div>

          <!-- 2. GREY TITLE BAR -->
          <div class="grey-title-bar">
            <div class="sw-code-large">${config.code}</div>
            <div class="sw-titles">
              <div class="sw-title-ms">${config.titleMs}</div>
              <div class="sw-title-en">${config.titleEn}</div>
            </div>
          </div>

          <!-- 3. HAZARD PICTOGRAMS ROW -->
          <div class="hazards-row">
            ${hazardsHtml}
          </div>

          <!-- 4. METADATA TABLE WITH RIGHT INTEGRATED QR CODE -->
          <table class="meta-table">
            <tr>
              <td class="label-col">
                <div class="col-label-ms">Tarikh Sisa Dihasilkan</div>
                <div class="col-label-en">Date Waste Generated</div>
              </td>
              <td class="val-col">${dateGenerated}</td>
              <td class="qr-col" rowspan="3">
                <img src="https://quickchart.io/qr?text=${encodeURIComponent(wasteId)}&size=110" alt="QR Code" style="width: 100px; height: 100px; display: block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td class="label-col">
                <div class="col-label-ms">Bilik/ Makmal</div>
                <div class="col-label-en">Room/Laboratory</div>
              </td>
              <td class="val-col">${roomLab}</td>
            </tr>
            <tr>
              <td class="label-col">
                <div class="col-label-ms">Jenis Makmal</div>
                <div class="col-label-en">Laboratory Type</div>
              </td>
              <td class="val-col">${labType}</td>
            </tr>
            <tr>
              <td class="label-col">
                <div class="col-label-ms">Pusat/ Jabatan</div>
                <div class="col-label-en">Centre/ Department</div>
              </td>
              <td class="val-col" colspan="2">${deptCenter}</td>
            </tr>
            <tr>
              <td class="label-col">
                <div class="col-label-ms">${config.chemLabelMs}</div>
                <div class="col-label-en">${config.chemLabelEn}</div>
              </td>
              <td class="val-col" colspan="2" style="font-size: 12px;">${chemicalName}</td>
            </tr>
          </table>

          <!-- 5. FOOTER BANNER -->
          <div class="rosh-footer">
            DISEDIAKAN OLEH/ PREPARED BY: PUSAT PENGURUSAN RISIKO, KESELAMATAN & KESIHATAN PEKERJAAN (ROSH-UKM)
          </div>
        </div>

        <script>
          const img = document.getElementById('ukmLogo');
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