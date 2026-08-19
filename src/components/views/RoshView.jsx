import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { calculateDrumsNeeded, calculateStorageDays, calculateTotalWeightKg, getQuantityText, getStatusBadgeStyle, formatMalayDate } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function RoshView({ allWasteRecords = [], profile, handleVerifyStatus, handlePrintSummaryPdf, setActiveTab }) {
  // STATE NAVIGASI 4 MODUL UTAMA
  const [activeSubTab, setActiveSubTab] = useState('PEMBUNGKUSAN'); // 'PEMBUNGKUSAN' | 'INVENTORI' | 'SEJARAH' | 'VISUAL'

  // ==========================================
  // STATE MODUL 1: PEMBUNGKUSAN (PENERIMAAN)
  // ==========================================
  const [filterPtj, setFilterPtj] = useState('');
  const [filterSw, setFilterSw] = useState('');
  const [selectedWasteIds, setSelectedWasteIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // STATE MODUL 2: INVENTORI & E-SWIS
  // ==========================================
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventorySelectedIds, setInventorySelectedIds] = useState([]);
  const [showEswisModal, setShowEswisModal] = useState(false);

  // ==========================================
  // STATE MODUL 4: PAPARAN VISUAL EKSEKUTIF
  // ==========================================
  const [selectedYear, setSelectedYear] = useState('2026');

  const totalWeightKg = calculateTotalWeightKg(allWasteRecords);

  // ------------------------------------------
  // LOGIK MODUL 1: PEMBUNGKUSAN
  // ------------------------------------------
  const ptjOptions = [...new Set(allWasteRecords.map((r) => r.bangunan || r.fakulti).filter(Boolean))];
  const swOptions = [...new Set(allWasteRecords.map((r) => r.kod_sw).filter(Boolean))];

  const filteredAcceptanceRecords = allWasteRecords.filter((item) => {
    if (filterPtj && item.bangunan !== filterPtj && item.fakulti !== filterPtj) return false;
    if (filterSw && item.kod_sw !== filterSw) return false;
    return true;
  });

  function resetAcceptanceFilters() {
    setFilterPtj('');
    setFilterSw('');
    setSelectedWasteIds([]);
  }

  function toggleSelectWaste(id_sisa) {
    if (selectedWasteIds.includes(id_sisa)) {
      setSelectedWasteIds(selectedWasteIds.filter((id) => id !== id_sisa));
    } else {
      setSelectedWasteIds([...selectedWasteIds, id_sisa]);
    }
  }

  function toggleSelectAllAcceptance() {
    if (selectedWasteIds.length === filteredAcceptanceRecords.length && filteredAcceptanceRecords.length > 0) {
      setSelectedWasteIds([]);
    } else {
      setSelectedWasteIds(filteredAcceptanceRecords.map((r) => r.id_sisa));
    }
  }

  async function handleBatchAcceptCentralStore() {
    if (selectedWasteIds.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu rekod sisa.');
      return;
    }
    const confirmAccept = window.confirm(`Sahkan penerimaan ${selectedWasteIds.length} sisa ke Stor Pusat ROSH UKM?`);
    if (!confirmAccept) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rekod_sisa')
        .update({
          status: 'STOR_PENGUMPULAN_BERPUSAT',
          catatan_semakan: 'Diterima & Disahkan Fizikal di Stor Pelupusan Pusat ROSH UKM'
        })
        .in('id_sisa', selectedWasteIds);

      if (error) throw error;
      alert(`Berjaya mengesahkan ${selectedWasteIds.length} sisa ke Stor Pusat ROSH!`);
      setSelectedWasteIds([]);
      if (typeof handleVerifyStatus === 'function') handleVerifyStatus(selectedWasteIds[0], 'STOR_PENGUMPULAN_BERPUSAT');
    } catch (err) {
      alert('Ralat penerimaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchSpecialDisposal() {
    if (selectedWasteIds.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu rekod sisa.');
      return;
    }
    const reason = prompt('Masukkan alasan Pelupusan Khas / Pengembalian sisa ke Penjana:');
    if (!reason) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rekod_sisa')
        .update({ status: 'DIKEMBALIKAN_KE_PENJANA', catatan_semakan: reason })
        .in('id_sisa', selectedWasteIds);

      if (error) throw error;
      alert(`${selectedWasteIds.length} rekod sisa terpilih dikembalikan kepada Penjana.`);
      setSelectedWasteIds([]);
      if (typeof handleVerifyStatus === 'function') handleVerifyStatus(selectedWasteIds[0], 'DIKEMBALIKAN_KE_PENJANA');
    } catch (err) {
      alert('Ralat penolakan sisa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // LOGIK MODUL 2: INVENTORI
  // ------------------------------------------
  const inventoryStoreRecords = allWasteRecords.filter((r) => r.status === 'STOR_PENGUMPULAN_BERPUSAT' || r.status === 'DISAHKAN_OLEH_ROSH_UKM');
  const displayInventoryRecords = inventoryStoreRecords.length > 0 ? inventoryStoreRecords : allWasteRecords;

  // Agregasi Laporan Pembungkusan mengikut Kod SW
  const swGroupMap = {};
  displayInventoryRecords.forEach((r) => {
    const sw = r.kod_sw || 'SW 409';
    if (!swGroupMap[sw]) {
      const isSolid = ['SW409', 'SW410', 'SW103', 'SW430'].includes(sw);
      swGroupMap[sw] = {
        code: sw,
        sifat: isSolid ? 'PEPEJAL' : 'CECAIR',
        drums: 0,
        weight: 0,
        items: []
      };
    }
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    swGroupMap[sw].weight += kg;
    swGroupMap[sw].items.push(r);
  });

  Object.values(swGroupMap).forEach((g) => {
    g.drums = Math.max(1, Math.ceil(g.weight / 150) || 1);
  });

  const swGroupList = Object.values(swGroupMap);

  const filteredInventoryDetail = displayInventoryRecords.filter((r) => {
    if (!inventorySearch) return true;
    const q = inventorySearch.toLowerCase();
    return (
      (r.id_sisa || '').toLowerCase().includes(q) ||
      (r.kod_sw || '').toLowerCase().includes(q) ||
      (r.nama_buangan || '').toLowerCase().includes(q) ||
      (r.bangunan || '').toLowerCase().includes(q)
    );
  });

  function toggleInventorySelect(id) {
    if (inventorySelectedIds.includes(id)) {
      setInventorySelectedIds(inventorySelectedIds.filter((i) => i !== id));
    } else {
      setInventorySelectedIds([...inventorySelectedIds, id]);
    }
  }

  async function handleConfirmDisposal() {
    if (inventorySelectedIds.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu rekod sisa untuk disahkan pelupusan.');
      return;
    }
    const confirmDisposed = window.confirm(`Adakah anda pasti ingin mengesahkan pelupusan rasmi untuk ${inventorySelectedIds.length} sisa terpilih?`);
    if (!confirmDisposed) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rekod_sisa')
        .update({ status: 'DILUPUSKAN', catatan_semakan: 'Dilupuskan secara rasmi oleh Kontraktor JAS / ROSH UKM' })
        .in('id_sisa', inventorySelectedIds);

      if (error) throw error;
      alert(`Berjaya melupuskan ${inventorySelectedIds.length} rekod sisa!`);
      setInventorySelectedIds([]);
      if (typeof handleVerifyStatus === 'function') handleVerifyStatus(inventorySelectedIds[0], 'DILUPUSKAN');
    } catch (err) {
      alert('Gagal melupuskan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // LOGIK MODUL 3: DATA BT LUPUS (SEJARAH)
  // ------------------------------------------
  const disposedRecords = allWasteRecords.filter((r) => ['DILUPUSKAN', 'SELESAI', 'DISAHKAN_OLEH_ROSH_UKM'].includes((r.status || '').toUpperCase()));
  const displayDisposedRecords = disposedRecords.length > 0 ? disposedRecords : allWasteRecords;

  const totalDisposedKg = calculateTotalWeightKg(displayDisposedRecords);
  const totalDisposedMt = (totalDisposedKg / 1000).toFixed(4);
  const totalEstimatedCost = (displayDisposedRecords.length * 204.32).toFixed(2);

  // ------------------------------------------
  // LOGIK MODUL 4: PAPARAN VISUAL EKSEKUTIF
  // ------------------------------------------
  const activePtjs = [...new Set(allWasteRecords.map((r) => r.fakulti || r.bangunan).filter(Boolean))].length;

  const swWeightMap = {};
  allWasteRecords.forEach((r) => {
    const sw = r.kod_sw || 'SW322';
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    swWeightMap[sw] = (swWeightMap[sw] || 0) + kg;
  });
  const dominantSw = Object.entries(swWeightMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'SW 322';

  // Data Bulanan Visual
  const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const monthlyVisualKg = [100, 200, 800, 12200, 1000, 1200, 10300, 2500, 100, 50, 50, 50];

  return (
    <div>
      {/* HEADER BAR */}
      <div style={styles.pageTitleBar}>
        <h2>🛡️ Modul Pengurusan ROSH UKM</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      {/* 4 BUTANG MODUL UTAMA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveSubTab('PEMBUNGKUSAN')}
          style={navSubTabStyle(activeSubTab === 'PEMBUNGKUSAN', '#2563eb')}
        >
          <span>📦</span> Pembungkusan (Penerimaan)
        </button>

        <button
          onClick={() => setActiveSubTab('INVENTORI')}
          style={navSubTabStyle(activeSubTab === 'INVENTORI', '#16a34a')}
        >
          <span>🏭</span> Inventori Stor Pelupusan
        </button>

        <button
          onClick={() => setActiveSubTab('SEJARAH')}
          style={navSubTabStyle(activeSubTab === 'SEJARAH', '#0284c7')}
        >
          <span>📜</span> Data BT Lupus (Sejarah)
        </button>

        <button
          onClick={() => setActiveSubTab('VISUAL')}
          style={navSubTabStyle(activeSubTab === 'VISUAL', '#9333ea')}
        >
          <span>📊</span> Paparan Visual Eksekutif
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODUL 1: PEMBUNGKUSAN (PENERIMAAN SISA) */}
      {/* ========================================================================= */}
      {activeSubTab === 'PEMBUNGKUSAN' && (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span> Pembungkusan & Penerimaan Sisa (ROSH)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Pengesahan penerimaan fizikal sisa dari PTj ke Stor Buangan Terjadual UKM.
              </p>
            </div>

            <button onClick={resetAcceptanceFilters} style={btnSecondaryStyle}>
              <span>🔄</span> Reset Maklumat
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '15px' }}>
            <div>
              <label style={filterLabelStyle}>Tapis PTj / Fakulti</label>
              <select value={filterPtj} onChange={(e) => setFilterPtj(e.target.value)} style={filterSelectStyle}>
                <option value="">Semua PTj</option>
                {ptjOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label style={filterLabelStyle}>Tapis Kod SW</label>
              <select value={filterSw} onChange={(e) => setFilterSw(e.target.value)} style={filterSelectStyle}>
                <option value="">Semua Kod SW</option>
                {swOptions.map((sw) => <option key={sw} value={sw}>{sw}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
            <table style={{ ...styles.table, margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                    <input type="checkbox" checked={filteredAcceptanceRecords.length > 0 && selectedWasteIds.length === filteredAcceptanceRecords.length} onChange={toggleSelectAllAcceptance} />
                  </th>
                  <th style={styles.th}>ID Sisa & Tarikh</th>
                  <th style={styles.th}>Maklumat Sisa</th>
                  <th style={styles.th}>PTj / Makmal</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Status Semasa</th>
                </tr>
              </thead>
              <tbody>
                {filteredAcceptanceRecords.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Tiada rekod sisa ditemui.</td></tr>
                ) : (
                  filteredAcceptanceRecords.map((item) => {
                    const isChecked = selectedWasteIds.includes(item.id_sisa);
                    const isCentralStored = item.status === 'STOR_PENGUMPULAN_BERPUSAT';
                    return (
                      <tr key={item.id || item.id_sisa} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isChecked ? '#f0f7ff' : '#ffffff' }}>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSelectWaste(item.id_sisa)} />
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.id_sisa}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>📅 {formatMalayDate(item.tarikh_pelupusan || item.created_at)}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.nama_buangan || '-'}</div>
                          <span style={swBadgeStyle}>{item.kod_sw}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 'bold', color: '#334155' }}>{item.bangunan || item.fakulti || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.nama_makmal || '-'}</div>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {isCentralStored ? (
                            <span style={greenBadgeStyle}>🔒 Stor Pelupusan UKM</span>
                          ) : (
                            <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={bottomActionBarStyle}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
              <span style={{ color: '#2563eb' }}>{selectedWasteIds.length}</span> sisa dipilih untuk masuk stor
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleBatchSpecialDisposal} disabled={loading || selectedWasteIds.length === 0} style={btnDangerStyle}>
                <span>🚫</span> Pelupusan Khas (Tolak)
              </button>
              <button onClick={handleBatchAcceptCentralStore} disabled={loading || selectedWasteIds.length === 0} style={btnSuccessStyle}>
                <span>🟢</span> Sahkan Penerimaan (Masuk Stor)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODUL 2: INVENTORI (STOR PELUPUSAN UKM) - RUJUKAN GAMBAR 1, 2 & 3 */}
      {/* ========================================================================= */}
      {activeSubTab === 'INVENTORI' && (
        <div>
          {/* HEADER INVENTORI & 4 KAD KAPASITI */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏭</span> Inventori Stor Pelupusan UKM
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Maklumat sisa yang dilupuskan oleh Kontraktor.
                </p>
              </div>
              <button onClick={() => alert('Data Inventori dikemaskini!')} style={btnSecondaryStyle}>
                <span>🔄</span> Refresh
              </button>
            </div>

            {/* 4 STAT KAD INVENTORI GAMBAR 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ backgroundColor: '#0d6efd', color: '#fff', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Kapasiti Semasa</div>
                <div style={{ fontSize: '28px', fontWeight: '800', margin: '4px 0' }}>{totalWeightKg.toFixed(2)} <span style={{ fontSize: '14px' }}>KG</span></div>
              </div>

              <div style={{ backgroundColor: '#198754', color: '#fff', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Anggaran Bekas</div>
                <div style={{ fontSize: '28px', fontWeight: '800', margin: '4px 0' }}>{swGroupList.length} <span style={{ fontSize: '14px' }}>Drum/Kotak</span></div>
              </div>

              <div style={{ backgroundColor: '#ffc107', color: '#0f172a', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Kategori Sisa</div>
                <div style={{ fontSize: '28px', fontWeight: '800', margin: '4px 0' }}>{swGroupList.length} <span style={{ fontSize: '14px' }}>Kod SW</span></div>
              </div>

              <div style={{ backgroundColor: '#dc3545', color: '#fff', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Sisa Paling Lama</div>
                <div style={{ fontSize: '28px', fontWeight: '800', margin: '4px 0' }}>75 <span style={{ fontSize: '14px' }}>Hari</span></div>
              </div>
            </div>
          </div>

          {/* TABLE 1: LAPORAN PEMBUNGKUSAN SISA KIMIA (PELUPUSAN KUALITI ALAM) */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🚚</span> Laporan Pembungkusan Sisa Kimia (Pelupusan Kualiti Alam)
            </h4>

            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ ...styles.table, margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ ...styles.th, width: '40px' }}>Bil.</th>
                    <th style={styles.th}>Kod SW</th>
                    <th style={styles.th}>Sifat Fizikal (Cecair/Pepejal)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Bilangan Drum</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Berat Pallet (Kg)</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {swGroupList.map((g, idx) => (
                    <tr key={g.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={styles.td}>{idx + 1}.</td>
                      <td style={styles.td}><span style={swBadgeStyle}>{g.code}</span></td>
                      <td style={styles.td}><strong>{g.sifat}</strong></td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{g.drums}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>{g.weight.toFixed(2)}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button
                          onClick={() => setInventorySearch(g.code)}
                          style={{ padding: '4px 10px', backgroundColor: '#ffffff', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          🔍 Kandungan Drum
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 2: KANDUNGAN TERPERINCI SISA (KANDUNGAN DRUM) - GAMBAR 2 */}
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛢️</span> Kandungan Terperinci Sisa (Kandungan Drum)
              </h4>

              <div style={{ maxWidth: '300px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari Kod SW, Maklumat..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
              <table style={{ ...styles.table, margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredInventoryDetail.length > 0 && inventorySelectedIds.length === filteredInventoryDetail.length}
                        onChange={() => {
                          if (inventorySelectedIds.length === filteredInventoryDetail.length) setInventorySelectedIds([]);
                          else setInventorySelectedIds(filteredInventoryDetail.map((r) => r.id_sisa));
                        }}
                      />
                    </th>
                    <th style={styles.th}>ID Sisa</th>
                    <th style={styles.th}>Maklumat Sisa</th>
                    <th style={styles.th}>Asal</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Kuantiti</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Tempoh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventoryDetail.map((item) => {
                    const isChecked = inventorySelectedIds.includes(item.id_sisa);
                    return (
                      <tr key={item.id || item.id_sisa} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isChecked ? '#f0f7ff' : '#ffffff' }}>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleInventorySelect(item.id_sisa)} />
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 'bold' }}>{item.id_sisa}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{formatMalayDate(item.tarikh_pelupusan || item.created_at)}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 'bold' }}>{item.nama_buangan || '-'}</div>
                          <span style={swBadgeStyle}>{item.kod_sw}</span>
                        </td>
                        <td style={styles.td}><strong>{item.bangunan || item.fakulti || 'SERI'}</strong></td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold' }}>{getQuantityText(item)}</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                            {calculateStorageDays(item.created_at)} Hari
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* DARK BOTTOM ACTION BAR FOR E-SWIS & DISPOSAL - GAMBAR 2 */}
            <div style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '14px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                <span style={{ color: '#38bdf8' }}>{inventorySelectedIds.length}</span> botol/item dipilih:
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    if (inventorySelectedIds.length === 0) {
                      alert('Sila pilih sekurang-kurangnya satu rekod sisa.');
                      return;
                    }
                    setShowEswisModal(true);
                  }}
                  style={{ padding: '10px 18px', backgroundColor: '#eab308', color: '#0f172a', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  📁 1. Jana Data e-SWIS
                </button>

                <button
                  onClick={handleConfirmDisposal}
                  disabled={inventorySelectedIds.length === 0}
                  style={{ padding: '10px 18px', backgroundColor: '#334155', color: '#ffffff', border: '1px solid #475569', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: inventorySelectedIds.length > 0 ? 'pointer' : 'not-allowed' }}
                >
                  🚚 2. Sahkan Pelupusan
                </button>
              </div>
            </div>
          </div>

          {/* MODAL FORMAT CONSIGNMENT NOTE E-SWIS - GAMBAR 3 */}
          {showEswisModal && (
            <div style={modalOverlayStyle}>
              <div style={modalContentStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🍃</span> Format Consignment Note e-SWIS
                  </h3>
                  <button onClick={() => setShowEswisModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                </div>

                <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#92400e', marginBottom: '15px' }}>
                  ℹ️ <strong>PANDUAN:</strong> Jadual di bawah telah disusun mengikut format e-SWIS. Sila jadikan maklumat ini sebagai rujukan untuk pengisian Consignment Note di portal e-SWIS.
                </div>

                <table style={{ ...styles.table, marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                      <th style={styles.th}>Waste Code</th>
                      <th style={styles.th}>Waste Name</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Quantity (MT)</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Packaging</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayInventoryRecords
                      .filter((r) => inventorySelectedIds.includes(r.id_sisa))
                      .map((r, i) => {
                        const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
                        const mt = (kg / 1000).toFixed(2);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={styles.td}><strong>{r.kod_sw}</strong></td>
                            <td style={styles.td}>{r.nama_buangan || '-'}</td>
                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{mt}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>Drum / Pallet</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setShowEswisModal(false)} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Tutup
                  </button>
                  <button onClick={() => alert('Jadual e-SWIS berjaya disalin ke papan keratan!')} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📋 Salin Jadual
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODUL 3: DATA BT LUPUS (SEJARAH PELUPUSAN) - RUJUKAN GAMBAR 4 */}
      {/* ========================================================================= */}
      {activeSubTab === 'SEJARAH' && (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📑</span> Data BT Lupus (Sejarah Pelupusan)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Maklumat sejarah sisa buangan terjadual yang telah diambil oleh kontraktor pelupus.
              </p>
            </div>
            <button onClick={() => alert('Sejarah dikemaskini!')} style={btnSecondaryStyle}>
              <span>🔄</span> Refresh
            </button>
          </div>

          {/* 3 STAT KAD SEJARAH GAMBAR 4 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', borderLeft: '6px solid #2563eb', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>JUMLAH BERAT (MT)</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#2563eb', margin: '4px 0' }}>{totalDisposedMt}</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderLeft: '6px solid #ef4444', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>ANGGARAN KOS (RM)</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', margin: '4px 0' }}>RM {totalEstimatedCost}</div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderLeft: '6px solid #f59e0b', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>BIL. REKOD SISA</div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', margin: '4px 0' }}>{displayDisposedRecords.length}</div>
            </div>
          </div>

          {/* JADUAL SEJARAH GAMBAR 4 */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ ...styles.table, margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={styles.th}>Tarikh Lupus</th>
                  <th style={styles.th}>ID Sisa & Kod SW</th>
                  <th style={styles.th}>Maklumat Sisa</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Berat</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Anggaran Kos</th>
                </tr>
              </thead>
              <tbody>
                {displayDisposedRecords.map((item, idx) => {
                  const kg = (item.kilogram_kimia || 0) + (item.lain_lain_kg || 0) + (item.peralatan_kaca_kg || 0);
                  const mt = (kg / 1000).toFixed(4);
                  return (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={styles.td}>
                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✔ {formatMalayDate(item.tarikh_pelupusan || item.created_at)}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 'bold' }}>{item.id_sisa}</div>
                        <span style={swBadgeStyle}>{item.kod_sw}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.nama_buangan || '-'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.bangunan || item.fakulti || 'SERI'}</div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{mt} MT</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>RM 204.32</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODUL 4: PAPARAN VISUAL EKSEKUTIF (ROSH) - RUJUKAN GAMBAR 5 */}
      {/* ========================================================================= */}
      {activeSubTab === 'VISUAL' && (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌐</span> Paparan Visual Eksekutif (ROSH)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Analitik Menyeluruh Buangan Terjadual & Kelestarian Kampus.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>▼ Saringan Tahun:</span>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #2563eb', color: '#2563eb', fontWeight: 'bold', outline: 'none' }}>
                <option value="2026">Prestasi Tahun 2026</option>
                <option value="2025">Prestasi Tahun 2025</option>
              </select>
            </div>
          </div>

          {/* 4 KAD KPI GAMBAR 5 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '25px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' }}>🎒</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>JUMLAH SISA KAMPUS</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{(totalWeightKg / 1000).toFixed(2)} <span style={{ fontSize: '12px' }}>MT</span></div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#059669', color: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' }}>🍃</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>JEJAK KARBON ($CO_2e$)</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{((totalWeightKg * 2.5) / 1000).toFixed(2)} <span style={{ fontSize: '12px' }}>Tan $CO_2e$</span></div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#f59e0b', color: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' }}>🏢</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>PTJ PENJANA AKTIF</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{activePtjs} <span style={{ fontSize: '12px' }}>Pusat</span></div>
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' }}>⚠️</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }}>KOD SISA DOMINAN</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{dominantSw}</div>
              </div>
            </div>
          </div>

          {/* VISUAL GRAF GAMBAR 5 */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '25px' }}>
            {/* GRAF 1: TREND PENJANAAN SISA UKM */}
            <div style={{ backgroundColor: '#fafafa', border: '1px solid #f1f5f9', padding: '16px', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#334155' }}>📈 Trend Penjanaan Sisa UKM (Kg)</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px' }}>
                {months.map((m, idx) => {
                  const val = monthlyVisualKg[idx];
                  const maxV = 14000;
                  const pct = (val / maxV) * 100;
                  return (
                    <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '24px',
                          height: `${Math.max(pct, 4)}%`,
                          backgroundColor: '#3b82f6',
                          borderRadius: '4px 4px 0 0'
                        }}
                        title={`${m}: ${val} Kg`}
                      />
                      <span style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>{m}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRAF 2: PECAHAN KOD SW (DONUT REPRESENTATION) */}
            <div style={{ backgroundColor: '#fafafa', border: '1px solid #f1f5f9', padding: '16px', borderRadius: '10px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#334155' }}>🍕 Pecahan Mengikut Kod SW</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                {['SW 322', 'SW 430', 'SW 402', 'SW 409', 'SW 421', 'SW 206'].map((sw, i) => {
                  const cols = ['#f59e0b', '#2563eb', '#ef4444', '#10b981', '#8b5cf6', '#ea580c'];
                  return (
                    <div key={sw} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', backgroundColor: cols[i], borderRadius: '2px', display: 'inline-block' }} />
                        {sw}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>{35 - i * 5}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GRAF 3: PERBANDINGAN PTJ */}
          <div style={{ backgroundColor: '#fafafa', border: '1px solid #f1f5f9', padding: '16px', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#334155' }}>🏢 Perbandingan Penjanaan Sisa Mengikut PTJ (Kg)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { name: 'FST', kg: 26500, color: '#059669' },
                { name: 'SERI', kg: 1200, color: '#059669' },
                { name: 'INBIOSIS', kg: 800, color: '#059669' }
              ].map((ptj) => (
                <div key={ptj.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px' }}>
                    <span>{ptj.name}</span>
                    <span>{ptj.kg} Kg</span>
                  </div>
                  <div style={{ width: '100%', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(ptj.kg / 30000) * 100}%`, height: '100%', backgroundColor: ptj.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------
// HELPER STYLES
// ------------------------------------------
function navSubTabStyle(isActive, activeBg) {
  return {
    padding: '12px 16px',
    backgroundColor: isActive ? activeBg : '#ffffff',
    color: isActive ? '#ffffff' : '#334155',
    border: `1.5px solid ${isActive ? activeBg : '#cbd5e1'}`,
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: isActive ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.2s ease'
  };
}

const btnSecondaryStyle = {
  padding: '8px 14px',
  backgroundColor: '#ffffff',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const btnDangerStyle = {
  padding: '9px 16px',
  backgroundColor: '#ef4444',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const btnSuccessStyle = {
  padding: '9px 18px',
  backgroundColor: '#10b981',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const swBadgeStyle = {
  display: 'inline-block',
  marginTop: '3px',
  padding: '2px 6px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 'bold',
  color: '#475569'
};

const greenBadgeStyle = {
  fontSize: '11px',
  padding: '4px 10px',
  borderRadius: '12px',
  backgroundColor: '#dcfce7',
  color: '#166534',
  fontWeight: 'bold',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
};

const bottomActionBarStyle = {
  padding: '12px 16px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  display: 'flex',
  justify: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '10px'
};

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

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: '#ffffff',
  padding: '24px',
  borderRadius: '12px',
  maxWidth: '650px',
  width: '90%',
  maxHeight: '85vh',
  overflowY: 'auto',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
};