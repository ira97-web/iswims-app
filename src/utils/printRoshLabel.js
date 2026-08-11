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

  function getHazardGraphic(type) {
    if (type === 'TOKSIK') {
      return `
        <div style="text-align: center; width: 95px;">
          <svg width="70" height="70" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto; background: #fff;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <path d="M50 22 c-12 0 -20 8 -20 20 c0 7 4 12 8 15 v5 h24 v-5 c4 -3 8 -8 8 -15 c0 -12 -8 -20 -20 -20 z M43 62 h14 v5 h-14 z" fill="#000"/>
              <circle cx="43" cy="38" r="4" fill="#fff"/>
              <circle cx="57" cy="38" r="4" fill="#fff"/>
              <path d="M25 25 L75 75 M75 25 L25 75" stroke="#000" stroke-width="4"/>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; margin-top: -4px;">BAHAN TOKSIK<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'MENGAKIS') {
      return `
        <div style="text-align: center; width: 95px;">
          <svg width="70" height="70" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto; background: #fff;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <polygon points="10,50 90,50 90,90 10,90" fill="#000" />
              <rect x="25" y="20" width="10" height="25" fill="#000" transform="rotate(-20 25 20)" />
              <rect x="65" y="20" width="10" height="25" fill="#000" transform="rotate(20 65 20)" />
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; margin-top: -4px;">BAHAN MENGAKIS<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'CECAIR_MUDAH_TERBAKAR') {
      return `
        <div style="text-align: center; width: 95px;">
          <svg width="70" height="70" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto; background: #dc3545;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <path d="M50 18 C45 35 30 40 30 60 C30 72 40 80 50 80 C60 80 70 72 70 60 C70 40 55 35 50 18 Z" fill="#000" />
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; margin-top: -4px;">CECAIR MUDAH TERBAKAR<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'PEPEJAL_MUDAH_TERBAKAR') {
      return `
        <div style="text-align: center; width: 95px;">
          <svg width="70" height="70" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto; background: repeating-linear-gradient(90deg, #dc3545, #dc3545 10px, #fff 10px, #fff 20px);">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <path d="M50 18 C45 35 30 40 30 60 C30 72 40 80 50 80 C60 80 70 72 70 60 C70 40 55 35 50 18 Z" fill="#000" />
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; margin-top: -4px;">PEPEJAL MUDAH TERBAKAR<br/>(BUANGAN)</div>
        </div>`;
    }
    if (type === 'CAMPURAN_BERBAHAYA') {
      return `
        <div style="text-align: center; width: 95px;">
          <svg width="70" height="70" viewBox="0 0 100 100" style="border: 2px solid #000; transform: rotate(45deg); margin: 12px auto; background: #fff;">
            <g style="transform: rotate(-45deg); transform-origin: center;">
              <line x1="20" y1="10" x2="20" y2="50" stroke="#000" stroke-width="6"/>
              <line x1="35" y1="10" x2="35" y2="50" stroke="#000" stroke-width="6"/>
              <line x1="50" y1="10" x2="50" y2="50" stroke="#000" stroke-width="6"/>
              <line x1="65" y1="10" x2="65" y2="50" stroke="#000" stroke-width="6"/>
              <line x1="80" y1="10" x2="80" y2="50" stroke="#000" stroke-width="6"/>
            </g>
          </svg>
          <div style="font-size: 8px; font-weight: bold; margin-top: -4px;">CAMPURAN PELBAGAI<br/>BAHAN BERBAHAYA (BUANGAN)</div>
        </div>`;
    }
    return '';
  }

  const hazardsHtml = config.hazards.map(h => getHazardGraphic(h)).join('');

  const checkboxListHtml = config.showCheckboxes ? `
    <div style="display: flex; gap: 12px; margin: 10px 0; font-size: 9px; font-weight: bold; flex-wrap: wrap; border: 1px solid #000; padding: 6px;">
      <div><span style="display:inline-block; width:10px; height:10px; border:1px solid #000; margin-right:4px;"></span> BAHAN TOKSIK (BUANGAN)</div>
      <div><span style="display:inline-block; width:10px; height:10px; border:1px solid #000; margin-right:4px;"></span> BAHAN MENGAKIS (BUANGAN)</div>
      <div><span style="display:inline-block; width:10px; height:10px; border:1px solid #000; margin-right:4px;"></span> PEPEJAL MUDAH TERBAKAR (BUANGAN)</div>
      <div><span style="display:inline-block; width:10px; height:10px; border:1px solid #000; margin-right:4px;"></span> CECAIR MUDAH TERBAKAR (BUANGAN)</div>
      <div><span style="display:inline-block; width:10px; height:10px; border:1px solid #000; margin-right:4px;"></span> CAMPURAN PELBAGAI BAHAN BERBAHAYA (BUANGAN)</div>
    </div>
  ` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label Sisa - ${config.code} - ${wasteId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px; color: #000; background: #fff; }
          .label-container {
            width: 680px;
            border: 3px solid #000;
            padding: 15px;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .top-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          .hazards-group {
            display: flex;
            gap: 6px;
          }
          .qr-box {
            text-align: center;
          }
          .ukm-header {
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .sw-code-title {
            font-size: 24px;
            font-weight: bold;
            margin: 6px 0 4px 0;
          }
          .sw-desc-ms {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            line-height: 1.3;
          }
          .sw-desc-en {
            font-size: 10px;
            font-style: italic;
            color: #333;
            margin-bottom: 10px;
            line-height: 1.3;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .meta-table td {
            padding: 4px;
            vertical-align: top;
            font-size: 11px;
            border-bottom: 1px solid #ddd;
          }
          .meta-label-ms {
            font-weight: bold;
          }
          .meta-label-en {
            font-size: 9px;
            font-style: italic;
            color: #555;
          }
          .footer-banner {
            border-top: 2px solid #000;
            padding-top: 6px;
            text-align: center;
            font-size: 9px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="top-row">
            <div class="hazards-group">
              ${hazardsHtml}
            </div>
            <div class="qr-box">
              <img src="https://quickchart.io/qr?text=${encodeURIComponent(wasteId)}&size=110" alt="QR Code" style="width: 100px; height: 100px; border: 1px solid #000;" />
            </div>
          </div>

          <div class="ukm-header">
            <img src="/ukm-logo.png" id="ukmLogo" alt="UKM Logo" style="height: 44px; width: auto;" />
            <div>
              <div style="font-size: 13px; font-weight: bold; letter-spacing: 0.5px;">UNIVERSITI KEBANGSAAN MALAYSIA</div>
              <div style="font-size: 10px; font-style: italic;">The National University of Malaysia</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 6px;">
            <div>Nama PTj/ PTj Name: ${ptjName}</div>
            <div>ID SISA: ${wasteId}</div>
          </div>

          <div class="sw-code-title">${config.code}</div>
          <div class="sw-desc-ms">${config.titleMs}</div>
          <div class="sw-desc-en">${config.titleEn}</div>

          ${checkboxListHtml}

          <table class="meta-table">
            <tr>
              <td style="width: 190px;">
                <div class="meta-label-ms">Tarikh Sisa Dihasilkan</div>
                <div class="meta-label-en">Date Waste Generated</div>
              </td>
              <td style="width: 10px;">:</td>
              <td style="font-weight: bold;">${dateGenerated}</td>
            </tr>
            <tr>
              <td>
                <div class="meta-label-ms">Bilik/ Makmal</div>
                <div class="meta-label-en">Room/Laboratory</div>
              </td>
              <td>:</td>
              <td style="font-weight: bold;">${roomLab}</td>
            </tr>
            <tr>
              <td>
                <div class="meta-label-ms">Jenis Makmal</div>
                <div class="meta-label-en">Laboratory Type</div>
              </td>
              <td>:</td>
              <td style="font-weight: bold;">${labType}</td>
            </tr>
            <tr>
              <td>
                <div class="meta-label-ms">Pusat/ Jabatan</div>
                <div class="meta-label-en">Centre/ Department</div>
              </td>
              <td>:</td>
              <td style="font-weight: bold;">${deptCenter}</td>
            </tr>
            <tr>
              <td>
                <div class="meta-label-ms">${config.chemLabelMs}</div>
                <div class="meta-label-en">${config.chemLabelEn}</div>
              </td>
              <td>:</td>
              <td style="font-weight: bold; color: #0056b3;">${chemicalName}</td>
            </tr>
          </table>

          <div class="footer-banner">
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