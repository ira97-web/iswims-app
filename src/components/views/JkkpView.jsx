import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { calculateStorageDays, formatMalayDate, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function JkkpView({
  allWasteRecords = [],
  profile,
  handleVerifyStatus,
  setActiveTab
}) {
  // FILTER STATES
  const [filterTarikh, setFilterTarikh] = useState('');
  const [filterMakmal, setFilterMakmal] = useState('');
  const [filterPenjana, setFilterPenjana] = useState('');

  // SELECTION STATE FOR BATCH APPROVAL
  const [selectedWasteIds, setSelectedWasteIds] = useState([]);

  // PILIHAN DINAMIK UNTUK DROPDOWN
  const tarikhOptions = [...new Set(allWasteRecords.map((r) => r.tarikh_pelupusan).filter(Boolean))];
  const makmalOptions = [...new Set(allWasteRecords.map((r) => r.nama_makmal).filter(Boolean))];
  const penjanaOptions = [...new Set(allWasteRecords.map((r) => r.nama_penjana || r.email || r.user_id).filter(Boolean))];

  // LOGIK PADANAN LONGGAR (LOOSE MATCHING)
  const matchesLoose = (itemValue, filterValue) => {
    if (!filterValue || filterValue.trim() === '') return true;
    if (!itemValue) return false;
    return itemValue.toString().toLowerCase().trim() === filterValue.toString().toLowerCase().trim();
  };

  const matchesDate = (itemDate, filterDate) => {
    if (!filterDate || filterDate.trim() === '') return true;
    if (!itemDate) return false;

    const rawMatch = itemDate.toString().toLowerCase().trim() === filterDate.toString().toLowerCase().trim();
    const formattedMalayMatch = formatMalayDate(itemDate).toLowerCase().trim() === filterDate.toLowerCase().trim();

    return rawMatch || formattedMalayMatch;
  };

  // LOGIK PENAPISAN
  const filteredRecords = allWasteRecords.filter((item) => {
    if (!matchesDate(item.tarikh_pelupusan, filterTarikh)) return false;
    if (!matchesLoose(item.nama_makmal, filterMakmal)) return false;
    if (!matchesLoose(item.nama_penjana || item.email || item.user_id, filterPenjana)) return false;
    return true;
  });

  function resetFilters() {
    setFilterTarikh('');
    setFilterMakmal('');
    setFilterPenjana('');
  }

  // FUNGSI PILIH / TANDAKAN REKOD
  function toggleSelectWaste(id_sisa) {
    if (selectedWasteIds.includes(id_sisa)) {
      setSelectedWasteIds(selectedWasteIds.filter((item) => item !== id_sisa));
    } else {
      setSelectedWasteIds([...selectedWasteIds, id_sisa]);
    }
  }

  function toggleSelectAll() {
    if (selectedWasteIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedWasteIds([]);
    } else {
      setSelectedWasteIds(filteredRecords.map((r) => r.id_sisa));
    }
  }

  // FUNGSI PENGESAHAN KELOMPOK (BATCH APPROVAL)
  async function handleBatchApprove() {
    const unapprovedSelected = filteredRecords.filter(
      (r) => selectedWasteIds.includes(r.id_sisa) && !['DISAHKAN_JKKP', 'DISAHKAN', 'SAH'].includes(r.status)
    );

    if (unapprovedSelected.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu rekod yang belum disahkan.');
      return;
    }

    const confirmApprove = window.confirm(
      `Adakah anda pasti ingin mengesahkan ${unapprovedSelected.length} permohonan sisa yang terpilih?`
    );

    if (!confirmApprove) return;

    try {
      const idsToApprove = unapprovedSelected.map((r) => r.id_sisa);
      const { error } = await supabase
        .from('rekod_sisa')
        .update({ status: 'DISAHKAN_JKKP', catatan_semakan: null })
        .in('id_sisa', idsToApprove);

      if (error) throw error;

      alert(`Berjaya mengesahkan ${idsToApprove.length} rekod sisa!`);
      setSelectedWasteIds([]);
      if (typeof handleVerifyStatus === 'function') {
        handleVerifyStatus(idsToApprove[0], 'DISAHKAN_JKKP');
      }
    } catch (err) {
      console.error('Ralat pengesahan kelompok:', err);
      alert('Gagal mengesahkan rekod: ' + err.message);
    }
  }

  // HELPER LOKASI PENGUMPULAN DARI REKOD SISA PENJANA
  function getExactLokasiPengumpulan(firstItem) {
    if (firstItem.tapak_pengumpulan && firstItem.tapak_pengumpulan.trim() !== '') {
      return firstItem.tapak_pengumpulan;
    }
    if (firstItem.bangunan && firstItem.bangunan.trim() !== '') {
      return firstItem.bangunan.toLowerCase().includes('parkir') 
        ? firstItem.bangunan 
        : `Parkir ${firstItem.bangunan}`;
    }
    return profile?.tapak_pengumpulan || 'Parkir Bangunan Sains Kimia';
  }

  // 1. PRINT BORANG RINGKASAN PELUPUSAN (SISA KIMIA) - BO02
  function handlePrintBorangKimia() {
    const records = filteredRecords.filter((r) => r.kod_sw !== 'SW409');
    if (records.length === 0) {
      alert('Tiada rekod sisa kimia (selain SW409) ditemui dalam hasil tapisan semasa.');
      return;
    }

    const firstItem = records[0];
    const todayStr = new Date().toLocaleDateString('en-GB');
    const dateFormatted = formatMalayDate(firstItem.tarikh_pelupusan || firstItem.created_at);
    
    const programName = firstItem.program_jabatan || firstItem.jabatan || 'Unit Sains Kimia';
    const fakultiName = firstItem.fakulti || profile?.fakulti || 'FST';
    const lokasiPengumpulan = getExactLokasiPengumpulan(firstItem);
    const katMakmal = firstItem.kategori_makmal || 'Makmal Pengajaran/Perkhidmatan/Instrumentasi';

    const signatureElement = profile?.tandatangan_base64 
      ? `<img src="${profile.tandatangan_base64}" style="height: 45px; max-width: 140px; object-fit: contain; vertical-align: middle;" />`
      : `________________________________________`;

    let totB25 = 0, totB40 = 0, totKg = 0;
    records.forEach((r) => {
      totB25 += (r.botol_2_5l_kimia || 0);
      totB40 += (r.botol_4_0l_kimia || 0);
      totKg += (r.kilogram_kimia || 0);
    });

    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BORANG RINGKASAN PELUPUSAN BUANGAN TERJADUAL (SISA KIMIA)</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 15px; color: #000; font-size: 11px; line-height: 1.4; }
            .rosh-header-box { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 10px; }
            .rosh-header-box td { border: 2px solid #000; padding: 6px 10px; vertical-align: middle; }
            .logo-cell { width: 22%; text-align: center; background: #fff; }
            .doc-code-cell { width: 48%; font-weight: bold; font-size: 12px; }
            .effective-date-cell { width: 30%; font-weight: bold; font-size: 11px; }
            .doc-title-cell { font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .attention-text { font-weight: bold; font-size: 11px; margin-bottom: 12px; color: #000; text-transform: uppercase; }
            .meta-table { width: 100%; margin-bottom: 12px; font-size: 11px; line-height: 1.6; }
            .meta-table td { padding: 2px 0; vertical-align: top; }
            .meta-label { font-weight: bold; width: 250px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.data-table th, table.data-table td { border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 10px; }
            table.data-table th { background-color: #f2f2f2; font-weight: bold; }
            .signature-box { margin-top: 25px; font-size: 11px; line-height: 1.8; }
            .sig-line-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            .sig-line-table td { border: none !important; padding: 2px 0 !important; text-align: left; }
            .sig-line-label { font-weight: bold; width: 110px; }
          </style>
        </head>
        <body>
          <table class="rosh-header-box">
            <tr>
              <td rowspan="2" class="logo-cell">
                <img src="/ukm-logo.png" id="ukmLogoImg" alt="UKM Logo" style="height: 48px; width: auto; object-fit: contain;" />
              </td>
              <td class="doc-code-cell">UKM-SPKPPP-PT(P)07-ROSH-AK04-BO02</td>
              <td class="effective-date-cell">Tarikh Kuat kuasa: <span style="color: #0056b3;">01/01/2025</span></td>
            </tr>
            <tr>
              <td colspan="2" class="doc-title-cell">BORANG RINGKASAN PELUPUSAN BUANGAN TERJADUAL (SISA KIMIA)</td>
            </tr>
          </table>

          <div class="attention-text">PERHATIAN: SALINAN INI PERLU DIHANTAR KE PUSAT PENGURUSAN RISIKO, KESELAMATAN & KESIHATAN PEKERJAAN</div>

          <table class="meta-table">
            <tr><td class="meta-label">Inventori Buangan Terjadual Sehingga Tarikh</td><td>: ${todayStr}</td></tr>
            <tr><td class="meta-label">Tarikh Pelupusan</td><td>: ${dateFormatted}</td></tr>
            <tr><td class="meta-label">Program/ Jabatan</td><td>: ${programName}</td></tr>
            <tr><td class="meta-label">Fakulti/ Institut/ Pusat</td><td>: ${fakultiName}</td></tr>
            <tr><td class="meta-label">Lokasi Pengumpulan</td><td>: ${lokasiPengumpulan}</td></tr>
            <tr><td class="meta-label">Kategori Makmal (Sila tandakan)</td><td>: ${katMakmal}</td></tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 35px;">BIL.</th>
                <th rowspan="2">NAMA KOD BUANGAN & NAMA BAHAN KIMIA</th>
                <th rowspan="2" style="width: 90px;">KOD BUANGAN</th>
                <th colspan="3">KUANTITI</th>
              </tr>
              <tr>
                <th style="width: 80px;">Botol saiz 2.5 L</th>
                <th style="width: 80px;">Botol saiz 4 L</th>
                <th style="width: 80px;">Kilogram (kg)</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="text-align: left;">${r.nama_buangan || '-'}</td>
                  <td>${r.kod_sw}</td>
                  <td>${(r.botol_2_5l_kimia || 0).toFixed(2)}</td>
                  <td>${(r.botol_4_0l_kimia || 0).toFixed(2)}</td>
                  <td>${(r.kilogram_kimia || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #fafafa;">
                <td colspan="3" style="text-align: right; padding-right: 15px;">JUMLAH</td>
                <td>${totB25.toFixed(2)}</td>
                <td>${totB40.toFixed(2)}</td>
                <td>${totKg.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="signature-box">
            <strong>Disediakan oleh:</strong>
            <table class="sig-line-table">
              <tr><td class="sig-line-label">Tandatangan</td><td>: ${signatureElement}</td></tr>
              <tr><td class="sig-line-label">Nama</td><td>: <strong>${profile?.nama || '________________________________________'}</strong></td></tr>
              <tr><td class="sig-line-label">UKM (Per)</td><td>: <strong>${profile?.ukmper || '________________________________________'}</strong></td></tr>
              <tr><td class="sig-line-label">Jawatan</td><td>: <strong>${profile?.jawatan || '________________________________________'}</strong></td></tr>
              <tr><td class="sig-line-label">No. Tel.</td><td>: <strong>${profile?.no_tel || '________________________________________'}</strong></td></tr>
            </table>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  }

  // 2. PRINT BORANG RINGKASAN PELUPUSAN (PERALATAN KACA & BOTOL KOSONG SW409) - BO04
  function handlePrintBorangKaca() {
    const records = filteredRecords.filter((r) => r.kod_sw === 'SW409');
    if (records.length === 0) {
      alert('Tiada rekod sisa peralatan kaca / botol kosong (SW409) ditemui dalam hasil tapisan semasa.');
      return;
    }

    const firstItem = records[0];
    const todayStr = new Date().toLocaleDateString('en-GB');
    const dateFormatted = formatMalayDate(firstItem.tarikh_pelupusan || firstItem.created_at);

    const programName = firstItem.program_jabatan || firstItem.jabatan || 'Unit Sains Kimia';
    const fakultiName = firstItem.fakulti || profile?.fakulti || 'FST';
    const lokasiPengumpulan = getExactLokasiPengumpulan(firstItem);
    const katMakmal = firstItem.kategori_makmal || 'Makmal Pengajaran/Perkhidmatan/Instrumentasi';

    const signatureElement = profile?.tandatangan_base64 
      ? `<img src="${profile.tandatangan_base64}" style="height: 45px; max-width: 140px; object-fit: contain; vertical-align: middle;" />`
      : `________________________________________`;

    let totB25 = 0, totB40 = 0, totLain = 0, totKaca = 0;
    records.forEach((r) => {
      totB25 += (r.botol_2_5l_kosong || 0);
      totB40 += (r.botol_4_0l_kosong || 0);
      totLain += (r.lain_lain_kg || 0);
      totKaca += (r.peralatan_kaca_kg || 0);
    });

    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BORANG RINGKASAN PELUPUSAN BOTOL KOSONG & PERALATAN KACA</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 15px; color: #000; font-size: 11px; line-height: 1.4; }
            .rosh-header-box { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 10px; }
            .rosh-header-box td { border: 2px solid #000; padding: 6px 10px; vertical-align: middle; }
            .logo-cell { width: 22%; text-align: center; background: #fff; }
            .doc-code-cell { width: 48%; font-weight: bold; font-size: 12px; }
            .effective-date-cell { width: 30%; font-weight: bold; font-size: 11px; }
            .doc-title-cell { font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .attention-text { font-weight: bold; font-size: 11px; margin-bottom: 12px; color: #000; text-transform: uppercase; }
            .meta-table { width: 100%; margin-bottom: 12px; font-size: 11px; line-height: 1.6; }
            .meta-table td { padding: 2px 0; vertical-align: top; }
            .meta-label { font-weight: bold; width: 250px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.data-table th, table.data-table td { border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 10px; }
            table.data-table th { background-color: #f2f2f2; font-weight: bold; }
            .signature-box { margin-top: 25px; font-size: 11px; line-height: 1.8; }
            .sig-line-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            .sig-line-table td { border: none !important; padding: 2px 0 !important; text-align: left; }
            .sig-line-label { font-weight: bold; width: 110px; }
          </style>
        </head>
        <body>
          <table class="rosh-header-box">
            <tr>
              <td rowspan="2" class="logo-cell">
                <img src="/ukm-logo.png" id="ukmLogoImg" alt="UKM Logo" style="height: 48px; width: auto; object-fit: contain;" />
              </td>
              <td class="doc-code-cell">UKM-SPKPPP-PT(P)07-ROSH-AK04-BO04</td>
              <td class="effective-date-cell">Tarikh Kuat kuasa: <span style="color: #0056b3;">01/01/2025</span></td>
            </tr>
            <tr>
              <td colspan="2" class="doc-title-cell">BORANG RINGKASAN PELUPUSAN BOTOL KOSONG & PERALATAN KACA</td>
            </tr>
          </table>

          <div class="attention-text">PERHATIAN: SALINAN INI PERLU DIHANTAR KE PUSAT PENGURUSAN RISIKO, KESELAMATAN & KESIHATAN PEKERJAAN</div>

          <table class="meta-table">
            <tr><td class="meta-label">Kod Buangan Terjadual</td><td>: SW409</td></tr>
            <tr><td class="meta-label">Inventori Buangan Terjadual Sehingga Tarikh</td><td>: ${todayStr}</td></tr>
            <tr><td class="meta-label">Tarikh Pelupusan</td><td>: ${dateFormatted}</td></tr>
            <tr><td class="meta-label">Program/ Jabatan</td><td>: ${programName}</td></tr>
            <tr><td class="meta-label">Fakulti/ Institut/ Pusat</td><td>: ${fakultiName}</td></tr>
            <tr><td class="meta-label">Lokasi Pengumpulan</td><td>: ${lokasiPengumpulan}</td></tr>
            <tr><td class="meta-label">Kategori Makmal (Sila tandakan)</td><td>: ${katMakmal}</td></tr>
          </table>

          <table class="data-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 35px;">BIL.</th>
                <th colspan="4">KUANTITI</th>
              </tr>
              <tr>
                <th>Botol saiz 2.5 L</th>
                <th>Botol saiz 4 L</th>
                <th>Lain-lain Bekas (Kilogram (kg))</th>
                <th>Peralatan Kaca (Kilogram (kg))</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${(r.botol_2_5l_kosong || 0).toFixed(2)}</td>
                  <td>${(r.botol_4_0l_kosong || 0).toFixed(2)}</td>
                  <td>${(r.lain_lain_kg || 0).toFixed(2)}</td>
                  <td>${(r.peralatan_kaca_kg || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #fafafa;">
                <td>JUMLAH</td>
                <td>${totB25.toFixed(2)}</td>
                <td>${totB40.toFixed(2)}</td>
                <td>${totLain.toFixed(2)}</td>
                <td>${totKaca.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="signature-box">
            <strong>Disediakan oleh:</strong>
            <table class="sig-line-table">
              <tr><td class="sig-line-label">Tandatangan</td><td>: ${signatureElement}</td></tr>
              <tr><td class="sig-line-label">Nama</td><td>: <strong>${profile?.nama || '________________________________________'}</strong></td></tr>
              <tr><td class="sig-line-label">UKM (Per)</td><td>: <strong>${profile?.ukmper || '________________________________________'}</strong></td></tr>
              <tr><td class="sig-line-label">Jawatan</td><td>: <strong>${profile?.jawatan || '________________________________________'}</strong></td></tr>
              <tr><td class="sig-line-label">No. Tel.</td><td>: <strong>${profile?.no_tel || '________________________________________'}</strong></td></tr>
            </table>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  }

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>🏢 Modul JKKP Bangunan</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>
          ← Kembali ke Papan Pemuka
        </button>
      </div>

      {/* FILTER BAR CONTAINER */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> Penjejakan Status BT (JKKP Bangunan)
          </h3>
          {(filterTarikh || filterMakmal || filterPenjana) && (
            <button
              onClick={resetFilters}
              style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕ Set Semula Tapis
            </button>
          )}
        </div>

        {/* 3 DROPDOWNS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={filterLabelStyle}>Tarikh Pelupusan</label>
            <select value={filterTarikh} onChange={(e) => setFilterTarikh(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Tarikh</option>
              {tarikhOptions.map((t) => (
                <option key={t} value={t}>{formatMalayDate(t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Nama Makmal</label>
            <select value={filterMakmal} onChange={(e) => setFilterMakmal(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Makmal</option>
              {makmalOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Nama Penjana Sisa</label>
            <select value={filterPenjana} onChange={(e) => setFilterPenjana(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Penjana</option>
              {penjanaOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MONITORING TABLE CARD */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0056b3' }}>Senarai Semakan Permohonan Sisa Bangunan</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Memaparkan <strong>{filteredRecords.length}</strong> daripada {allWasteRecords.length} rekod sisa
            </span>
          </div>

          {filteredRecords.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handlePrintBorangKimia}
                style={{ ...styles.button, backgroundColor: '#0284c7', width: 'auto', padding: '8px 14px', fontSize: '12px' }}
              >
                📄 Borang Ringkasan Sisa Kimia (BO02)
              </button>

              <button
                onClick={handlePrintBorangKaca}
                style={{ ...styles.button, backgroundColor: '#28a745', width: 'auto', padding: '8px 14px', fontSize: '12px' }}
              >
                🧪 Borang Ringkasan Kaca & Botol Kosong (BO04)
              </button>
            </div>
          )}
        </div>

        {filteredRecords.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            Tiada rekod sisa dijumpai mengikut tapisan semasa.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredRecords.length > 0 && selectedWasteIds.length === filteredRecords.length} 
                      onChange={toggleSelectAll} 
                      title="Pilih Semua Sisa"
                    />
                  </th>
                  <th style={styles.th}>Bil.</th>
                  <th style={styles.th}>ID Sisa</th>
                  <th style={styles.th}>Tarikh</th>
                  <th style={styles.th}>Fakulti & Bangunan</th>
                  <th style={styles.th}>Makmal</th>
                  <th style={styles.th}>Kod SW</th>
                  <th style={styles.th}>Nama Bahan</th>
                  <th style={styles.th}>Kuantiti</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Tindakan Semakan JKKP</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item, idx) => {
                  const storageDays = calculateStorageDays(item.created_at || item.tarikh_pelupusan);
                  const isApproved = item.status === 'DISAHKAN_JKKP' || item.status === 'DISAHKAN' || item.status === 'SAH';
                  const isChecked = selectedWasteIds.includes(item.id_sisa);

                  return (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee', backgroundColor: isChecked ? '#f0f7ff' : '#fff' }}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => toggleSelectWaste(item.id_sisa)} 
                        />
                      </td>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                      <td style={styles.td}>{formatMalayDate(item.tarikh_pelupusan || item.created_at)}</td>
                      <td style={styles.td}>
                        <div><strong>{item.fakulti || 'FST'}</strong></div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.bangunan || '-'}</div>
                      </td>
                      <td style={styles.td}>{item.nama_makmal || '-'}</td>
                      <td style={styles.td}><strong>{item.kod_sw}</strong></td>
                      <td style={styles.td}>{item.nama_buangan}</td>
                      <td style={styles.td}>{getQuantityText(item)}</td>
                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                        <div style={{ fontSize: '11px', marginTop: '4px', color: storageDays > 180 ? '#dc2626' : '#475569' }}>
                          ⏱️ {storageDays} Hari Simpanan
                        </div>
                      </td>
                      <td style={styles.td}>
                        {!isApproved ? (
                          <button
                            onClick={() => handleVerifyStatus(item.id_sisa, 'DIKEMBALIKAN_KE_PENJANA')}
                            style={{ ...styles.smallButton, backgroundColor: '#dc3545', fontSize: '11px', width: '100%' }}
                          >
                            ↩️ Kembalikan
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#28a745', fontWeight: 'bold' }}>
                            ✓ Telah Disahkan JKKP
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* BOTTOM ACTION BAR FOR BATCH APPROVAL */}
        {filteredRecords.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eef2f7', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
              📌 Terpilih: <span style={{ color: '#0056b3' }}>{selectedWasteIds.length}</span> daripada {filteredRecords.length} rekod sisa
            </div>

            <button
              onClick={handleBatchApprove}
              disabled={selectedWasteIds.length === 0}
              style={{
                ...styles.button,
                backgroundColor: selectedWasteIds.length > 0 ? '#28a745' : '#94a3b8',
                padding: '10px 20px',
                fontSize: '13px',
                cursor: selectedWasteIds.length > 0 ? 'pointer' : 'not-allowed',
                opacity: selectedWasteIds.length > 0 ? 1 : 0.6,
                width: 'auto'
              }}
            >
              ✓ Sahkan Permohonan Terpilih (JKKP)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// STYLING HELPERS
const filterLabelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#475569',
  marginBottom: '4px'
};

const filterSelectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};