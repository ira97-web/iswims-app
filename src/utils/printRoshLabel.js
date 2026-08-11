import { swLabelConfig } from '../constants/swLabelConfig';
import { formatMalayDate } from './helpers';

export function handlePrintRoshWasteLabel(item, profile) {
  const printWindow = window.open('', '_blank');
  const cleanCode = item.kod_sw ? item.kod_sw.replace(/\s+/g, '').toUpperCase() : 'SW206';
  const config = swLabelConfig[cleanCode] || {
    code: item.kod_sw || "SW 206",
    titleMs: "BUANGAN TERJADUAL",
    titleEn: "SCHEDULED WASTE",
    chemLabelMs: "Nama Bahan Kimia",
    chemLabelEn: "Name of Chemical",
    hazards: ["TOKSIK"]
  };

  const ptjName = item.fakulti || profile?.fakulti || 'FST';
  const wasteId = item.id_sisa || 'FST-2026-00-0000';
  const dateGenerated = formatMalayDate(item.created_at || item.tarikh_pelupusan);
  const roomLab = item.nama_makmal || profile?.senarai_makmal?.[0] || '-';
  const labType = item.kategori_makmal || 'Makmal Penyelidikan';
  const deptCenter = profile?.program_jabatan || '-';
  const chemicalName = item.nama_buangan || '-';

  // Accurate SVG Hazard Warning Diamonds matching Department of Environment (JAS) standards
  function getHazardGraphic(type) {
    if (type === 'TOKSIK') {
      return `
        <div style="text-align: center; width: 100px; margin-bottom: 8px;">
          <svg width="75" height="75" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto 8px auto; background: #fff;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <!-- Skull -->
              <path d="M50 20 c-11 0 -18 7 -18 18 c0 6 3 10 7 13 v5 h22 v-5 c4 -3 7 -7 7 -13 c0 -11 -7 -18 -18 -18 z" fill="#000"/>
              <circle cx="43" cy="34" r="3.5" fill="#fff"/>
              <circle cx="57" cy="34" r="3.5" fill="#fff"/>
              <!-- Teeth -->
              <path d="M43 51 h14 v4 h-14 z" fill="#fff"/>
              <!-- Crossbones -->
              <path d="M22 22 L78 78 M78 22 L22 78" stroke="#000" stroke-width="4.5"/>
              <!-- Class 6 Number -->
              <text x="50" y="92" font-size="12" font-weight="bold" text-anchor="middle" fill="#000">6</text>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; line-height: 1.1;">BAHAN TOKSIK<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'MENGAKIS') {
      return `
        <div style="text-align: center; width: 100px; margin-bottom: 8px;">
          <svg width="75" height="75" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto 8px auto; background: #fff;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <!-- Spilling test tubes & corrosive bar/hand -->
              <rect x="20" y="25" width="22" height="6" fill="#000" transform="rotate(-30 20 25)"/>
              <rect x="58" y="14" width="22" height="6" fill="#000" transform="rotate(30 58 14)"/>
              <!-- Surface & Hand -->
              <polygon points="12,52 88,52 88,88 12,88" fill="#000"/>
              <!-- Class 8 Number -->
              <text x="50" y="82" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">8</text>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; line-height: 1.1;">BAHAN MENGAKIS<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'CECAIR_MUDAH_TERBAKAR') {
      return `
        <div style="text-align: center; width: 100px; margin-bottom: 8px;">
          <svg width="75" height="75" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto 8px auto; background: #e02424;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <!-- Flame -->
              <path d="M50 15 C45 32 30 38 30 58 C30 70 40 78 50 78 C60 78 70 70 70 58 C70 38 55 32 50 15 Z" fill="#000"/>
              <!-- Class 3 Number -->
              <text x="50" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#000">3</text>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; line-height: 1.1;">CECAIR MUDAH TERBAKAR<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'PEPEJAL_MUDAH_TERBAKAR') {
      return `
        <div style="text-align: center; width: 100px; margin-bottom: 8px;">
          <svg width="75" height="75" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto 8px auto; background: repeating-linear-gradient(90deg, #e02424, #e02424 8px, #fff 8px, #fff 16px);">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <path d="M50 15 C45 32 30 38 30 58 C30 70 40 78 50 78 C60 78 70 70 70 58 C70 38 55 32 50 15 Z" fill="#000"/>
              <text x="50" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#000">4</text>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; line-height: 1.1;">PEPEJAL MUDAH TERBAKAR<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'CAMPURAN_BERBAHAYA') {
      return `
        <div style="text-align: center; width: 100px; margin-bottom: 8px;">
          <svg width="75" height="75" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto 8px auto; background: #fff;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <!-- 7 Vertical Stripes -->
              <line x1="15" y1="10" x2="15" y2="50" stroke="#000" stroke-width="5"/>
              <line x1="26" y1="10" x2="26" y2="50" stroke="#000" stroke-width="5"/>
              <line x1="38" y1="10" x2="38" y2="50" stroke="#000" stroke-width="5"/>
              <line x1="50" y1="10" x2="50" y2="50" stroke="#000" stroke-width="5"/>
              <line x1="62" y1="10" x2="62" y2="50" stroke="#000" stroke-width="5"/>
              <line x1="74" y1="10" x2="74" y2="50" stroke="#000" stroke-width="5"/>
              <line x1="85" y1="10" x2="85" y2="50" stroke="#000" stroke-width="5"/>
              <!-- Class 9 Number -->
              <text x="50" y="90" font-size="12" font-weight="bold" text-anchor="middle" fill="#000">9</text>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; line-height: 1.1;">CAMPURAN PELBAGAI<br/>BAHAN BERBAHAYA (BUANGAN)</div>
        </div>`;
    }
    return '';
  }

  const hazardsHtml = config.hazards.map(h => getHazardGraphic(h)).join('');

  const checkboxListHtml = config.showCheckboxes ? `
    <div style="display: flex; gap: 8px; margin: 8px 0 12px 0; font-size: 8px; font-weight: bold; flex-wrap: wrap; border: 1px solid #000; padding: 6px;">
      <div style="display: flex; alignItems: center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; border:1px solid #000;"></span> BAHAN TOKSIK (BUANGAN)</div>
      <div style="display: flex; alignItems: center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; border:1px solid #000;"></span> BAHAN MENGAKIS (BUANGAN)</div>
      <div style="display: flex; alignItems: center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; border:1px solid #000;"></span> PEPEJAL MUDAH TERBAKAR (BUANGAN)</div>
      <div style="display: flex; alignItems: center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; border:1px solid #000;"></span> CECAIR MUDAH TERBAKAR (BUANGAN)</div>
      <div style="display: flex; alignItems: center; gap: 4px;"><span style="display:inline-block; width:10px; height:10px; border:1px solid #000;"></span> CAMPURAN PELBAGAI BAHAN BERBAHAYA (BUANGAN)</div>
    </div>
  ` : '';

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
            padding: 15px;
            background: #fff;
            color: #000;
            box-sizing: border-box;
          }
          .rosh-card {
            width: 100%;
            max-width: 760px;
            border: 3px solid #000;
            padding: 12px 16px;
            margin: 0 auto;
            box-sizing: border-box;
            background: #fff;
          }

          /* HEADER ROW */
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .ukm-brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .ukm-brand img {
            height: 48px;
            width: auto;
            object-fit: contain;
          }
          .ukm-title-bold {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 0.5px;
            line-height: 1.2;
          }
          .ukm-title-sub {
            font-size: 10px;
            font-style: italic;
            color: #333;
          }
          .ptj-id-box {
            text-align: right;
            font-size: 12px;
            font-weight: bold;
            line-height: 1.5;
          }

          /* MAIN BODY GRID: LEFT HAZARDS + RIGHT CONTENT */
          .main-grid {
            display: flex;
            gap: 20px;
            align-items: flex-start;
          }

          /* LEFT COLUMN: HAZARDS & QR CODE */
          .left-column {
            width: 130px;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .qr-container {
            margin-top: 10px;
            text-align: center;
          }
          .qr-container img {
            width: 110px;
            height: 110px;
            border: 1px solid #000;
            padding: 2px;
            background: #fff;
          }

          /* RIGHT COLUMN: SW CODE, TITLE & METADATA TABLE */
          .right-column {
            flex-grow: 1;
          }
          .sw-code-large {
            font-size: 32px;
            font-weight: 900;
            margin: 0 0 2px 0;
            line-height: 1;
            letter-spacing: 1px;
          }
          .sw-title-ms {
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            line-height: 1.35;
          }
          .sw-title-en {
            font-size: 10px;
            font-style: italic;
            color: #222;
            margin-bottom: 12px;
            line-height: 1.3;
          }

          /* METADATA TABLE */
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          .meta-table td {
            padding: 6px 4px;
            vertical-align: top;
            font-size: 11px;
            border-bottom: 1px solid #bbb;
          }
          .meta-table tr:last-child td {
            border-bottom: none;
          }
          .col-label-ms {
            font-weight: bold;
            color: #000;
          }
          .col-label-en {
            font-size: 9px;
            font-style: italic;
            color: #444;
          }
          .col-val {
            font-weight: bold;
            font-size: 11px;
            color: #000;
            padding-left: 8px;
          }

          /* FOOTER BANNER */
          .rosh-footer {
            border-top: 2px solid #000;
            margin-top: 12px;
            padding-top: 6px;
            text-align: center;
            font-size: 9.5px;
            font-weight: bold;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="rosh-card">
          <!-- TOP HEADER ROW -->
          <div class="header-row">
            <div class="ukm-brand">
              <img src="/ukm-logo.png" id="ukmLogo" alt="UKM Logo" />
              <div>
                <div class="ukm-title-bold">UNIVERSITI KEBANGSAAN MALAYSIA</div>
                <div class="ukm-title-sub">The National University of Malaysia</div>
              </div>
            </div>
            <div class="ptj-id-box">
              <div>Nama PTj/ PTj Name: <span style="font-size: 13px;">${ptjName}</span></div>
              <div>ID SISA: <span style="font-size: 13px;">${wasteId}</span></div>
            </div>
          </div>

          <!-- MAIN BODY GRID -->
          <div class="main-grid">
            <!-- LEFT COLUMN: WARNING DIAMONDS + QR CODE -->
            <div class="left-column">
              ${hazardsHtml}
              <div class="qr-container">
                <img src="https://quickchart.io/qr?text=${encodeURIComponent(wasteId)}&size=130" alt="QR Code" />
              </div>
            </div>

            <!-- RIGHT COLUMN: DETAILS -->
            <div class="right-column">
              <div class="sw-code-large">${config.code}</div>
              <div class="sw-title-ms">${config.titleMs}</div>
              <div class="sw-title-en">${config.titleEn}</div>

              ${checkboxListHtml}

              <table class="meta-table">
                <tr>
                  <td style="width: 185px;">
                    <div class="col-label-ms">Tarikh Sisa Dihasilkan</div>
                    <div class="col-label-en">Date Waste Generated</div>
                  </td>
                  <td style="width: 10px;">:</td>
                  <td class="col-val">${dateGenerated}</td>
                </tr>
                <tr>
                  <td>
                    <div class="col-label-ms">Bilik/ Makmal</div>
                    <div class="col-label-en">Room/Laboratory</div>
                  </td>
                  <td>:</td>
                  <td class="col-val">${roomLab}</td>
                </tr>
                <tr>
                  <td>
                    <div class="col-label-ms">Jenis Makmal</div>
                    <div class="col-label-en">Laboratory Type</div>
                  </td>
                  <td>:</td>
                  <td class="col-val">${labType}</td>
                </tr>
                <tr>
                  <td>
                    <div class="col-label-ms">Pusat/ Jabatan</div>
                    <div class="col-label-en">Centre/ Department</div>
                  </td>
                  <td>:</td>
                  <td class="col-val">${deptCenter}</td>
                </tr>
                <tr>
                  <td>
                    <div class="col-label-ms">${config.chemLabelMs}</div>
                    <div class="col-label-en">${config.chemLabelEn}</div>
                  </td>
                  <td>:</td>
                  <td class="col-val" style="color: #0056b3; font-size: 12px;">${chemicalName}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- FOOTER ROSH UKM BANNER -->
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