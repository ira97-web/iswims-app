import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { calculateDrumsNeeded, calculateStorageDays, calculateTotalWeightKg, getQuantityText, getStatusBadgeStyle, formatMalayDate } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function RoshView({ allWasteRecords = [], profile, handleVerifyStatus, handlePrintSummaryPdf, setActiveTab }) {
  // FILTER STATES UNTUK PEMBUNGKUSAN & PENERIMAAN SISA
  const [filterPtj, setFilterPtj] = useState('');
  const [filterSw, setFilterSw] = useState('');
  const [selectedWasteIds, setSelectedWasteIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const totalWeightKg = calculateTotalWeightKg(allWasteRecords);

  // SENARAI PILIHAN DROPDOWN UNTUK PENAPIS ROSH
  const ptjOptions = [...new Set(allWasteRecords.map((r) => r.bangunan || r.fakulti).filter(Boolean))];
  const swOptions = [...new Set(allWasteRecords.map((r) => r.kod_sw).filter(Boolean))];

  // TAPIS REKOD UNTUK SEKSYEN PENERIMAAN SISA
  const filteredAcceptanceRecords = allWasteRecords.filter((item) => {
    if (filterPtj && (item.bangunan !== filterPtj && item.fakulti !== filterPtj)) return false;
    if (filterSw && item.kod_sw !== filterSw) return false;
    return true;
  });

  function resetAcceptanceFilters() {
    setFilterPtj('');
    setFilterSw('');
    setSelectedWasteIds([]);
  }

  // FUNGSI TANDAKAN REKOD SISA (CHECKBOX)
  function toggleSelectWaste(id_sisa) {
    if (selectedWasteIds.includes(id_sisa)) {
      setSelectedWasteIds(selectedWasteIds.filter((id) => id !== id_sisa));
    } else {
      setSelectedWasteIds([...selectedWasteIds, id_sisa]);
    }
  }

  function toggleSelectAll() {
    if (selectedWasteIds.length === filteredAcceptanceRecords.length && filteredAcceptanceRecords.length > 0) {
      setSelectedWasteIds([]);
    } else {
      setSelectedWasteIds(filteredAcceptanceRecords.map((r) => r.id_sisa));
    }
  }

  // TINDAKAN KELOMPOK 1: SAHKAN PENERIMAAN (MASUK STOR)
  async function handleBatchAcceptCentralStore() {
    if (selectedWasteIds.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu rekod sisa daripada senarai.');
      return;
    }

    const confirmAccept = window.confirm(
      `Adakah anda pasti ingin mengesahkan penerimaan ${selectedWasteIds.length} sisa ke Stor Pelupusan Pusat ROSH UKM?`
    );
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

      alert(`Berjaya mengesahkan penerimaan ${selectedWasteIds.length} rekod sisa ke Stor Pusat ROSH!`);
      setSelectedWasteIds([]);
      if (typeof handleVerifyStatus === 'function') {
        handleVerifyStatus(selectedWasteIds[0], 'STOR_PENGUMPULAN_BERPUSAT');
      }
    } catch (err) {
      console.error('Ralat penerimaan stor pusat:', err);
      alert('Gagal mengemaskini status penerimaan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // TINDAKAN KELOMPOK 2: PELUPUSAN KHAS / TOLAK KE PENJANA
  async function handleBatchSpecialDisposal() {
    if (selectedWasteIds.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu rekod sisa daripada senarai.');
      return;
    }

    const reason = prompt('Masukkan alasan Pelupusan Khas / Pengembalian sisa ke Penjana:');
    if (!reason) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rekod_sisa')
        .update({
          status: 'DIKEMBALIKAN_KE_PENJANA',
          catatan_semakan: reason
        })
        .in('id_sisa', selectedWasteIds);

      if (error) throw error;

      alert(`${selectedWasteIds.length} rekod sisa terpilih telah dikembalikan kepada Penjana.`);
      setSelectedWasteIds([]);
      if (typeof handleVerifyStatus === 'function') {
        handleVerifyStatus(selectedWasteIds[0], 'DIKEMBALIKAN_KE_PENJANA');
      }
    } catch (err) {
      console.error('Ralat penolakan sisa:', err);
      alert('Gagal mengemaskini status: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>🛡️ Halaman Utama ROSH UKM Admin</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      {/* 4 KAD STATISTIK UTAMA INDUK ROSH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{allWasteRecords.length}</div>
          <div style={styles.statLabel}>Jumlah Keseluruhan Rekod</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{(totalWeightKg / 1000).toFixed(2)}</div>
          <div style={styles.statLabel}>Jumlah Sisa UKM (Metric Tonne)</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{calculateDrumsNeeded(totalWeightKg)}</div>
          <div style={styles.statLabel}>Keperluan Tong Kontraktor JAS</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statNumber, color: '#dc3545' }}>
            {(totalWeightKg * 1.5).toFixed(1)} kg
          </div>
          <div style={styles.statLabel}>Anggaran Pelepasan CO2</div>
        </div>
      </div>

      {/* MODUL 1: PEMBUNGKUSAN & PENERIMAAN SISA (ROSH) */}
      <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📦</span> Pembungkusan & Penerimaan Sisa (ROSH)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Pengesahan penerimaan fizikal sisa dari PTj ke Stor Buangan Terjadual UKM.
            </p>
          </div>

          <button
            onClick={resetAcceptanceFilters}
            style={{
              padding: '8px 14px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span> Reset Maklumat
          </button>
        </div>

        {/* PENAPIS PTJ & KOD SW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end', marginBottom: '15px' }}>
          <div>
            <label style={roshLabelStyle}>Tapis PTj / Fakulti</label>
            <select value={filterPtj} onChange={(e) => setFilterPtj(e.target.value)} style={roshSelectStyle}>
              <option value="">Semua PTj</option>
              {ptjOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={roshLabelStyle}>Tapis Kod SW</label>
            <select value={filterSw} onChange={(e) => setFilterSw(e.target.value)} style={roshSelectStyle}>
              <option value="">Semua Kod SW</option>
              {swOptions.map((sw) => (
                <option key={sw} value={sw}>{sw}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={resetAcceptanceFilters}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🔒</span> Reset Filter
            </button>
          </div>
        </div>

        {/* JADUAL TIK PENERIMAAN FIZIKAL SISA */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
          <table style={{ ...styles.table, margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredAcceptanceRecords.length > 0 && selectedWasteIds.length === filteredAcceptanceRecords.length}
                    onChange={toggleSelectAll}
                    title="Pilih Semua Sisa"
                  />
                </th>
                <th style={styles.th}>ID Sisa & Tarikh</th>
                <th style={styles.th}>Maklumat Sisa</th>
                <th style={styles.th}>PTj / Makmal</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Status Semasa</th>
              </tr>
            </thead>
            <tbody>
              {filteredAcceptanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    Tiada rekod sisa ditemui mengikut penapis semasa.
                  </td>
                </tr>
              ) : (
                filteredAcceptanceRecords.map((item) => {
                  const isChecked = selectedWasteIds.includes(item.id_sisa);
                  const isCentralStored = item.status === 'STOR_PENGUMPULAN_BERPUSAT';

                  return (
                    <tr key={item.id || item.id_sisa} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isChecked ? '#f0f7ff' : '#ffffff' }}>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectWaste(item.id_sisa)}
                        />
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.id_sisa}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📅</span> {formatMalayDate(item.tarikh_pelupusan || item.created_at)}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.nama_buangan || '-'}</div>
                        <span style={{ display: 'inline-block', marginTop: '3px', padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>
                          {item.kod_sw}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 'bold', color: '#334155' }}>{item.bangunan || item.fakulti || '-'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.nama_makmal || '-'}</div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {isCentralStored ? (
                          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🔒 Stor Pelupusan UKM
                          </span>
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

        {/* BOTTOM ACTION BAR FOR ROSH BATCH PROCESS */}
        <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
            <span style={{ color: '#2563eb' }}>{selectedWasteIds.length}</span> sisa dipilih untuk masuk stor
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleBatchSpecialDisposal}
              disabled={loading || selectedWasteIds.length === 0}
              style={{
                padding: '9px 16px',
                backgroundColor: selectedWasteIds.length > 0 ? '#ef4444' : '#fca5a5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: selectedWasteIds.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🚫</span> Pelupusan Khas (Tolak)
            </button>

            <button
              onClick={handleBatchAcceptCentralStore}
              disabled={loading || selectedWasteIds.length === 0}
              style={{
                padding: '9px 18px',
                backgroundColor: selectedWasteIds.length > 0 ? '#10b981' : '#6ee7b7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: selectedWasteIds.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🟢</span> Sahkan Penerimaan (Masuk Stor)
            </button>
          </div>
        </div>
      </div>

      {/* MODUL 2: JADUAL PEMANTAUAN INDUK & LAPORAN ROSH */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          <h3>Pemantauan Induk & Pelupusan Sisa Terjadual UKM</h3>
          <button onClick={() => handlePrintSummaryPdf('Laporan Induk ROSH UKM', allWasteRecords)} style={{ ...styles.button, backgroundColor: '#dc3545', width: 'auto' }}>
            📄 Muat Turun Laporan Induk ROSH
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={styles.th}>Bil.</th>
                <th style={styles.th}>ID Sisa</th>
                <th style={styles.th}>Fakulti & Bangunan</th>
                <th style={styles.th}>Makmal</th>
                <th style={styles.th}>Kod SW</th>
                <th style={styles.th}>Nama Buangan</th>
                <th style={styles.th}>Kuantiti</th>
                <th style={styles.th}>Tempoh Simpanan</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Pengesahan Akhir ROSH</th>
              </tr>
            </thead>
            <tbody>
              {allWasteRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Tiada rekod sisa dijumpai.
                  </td>
                </tr>
              ) : (
                allWasteRecords.map((item, idx) => (
                  <tr key={item.id || item.id_sisa || idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                    <td style={styles.td}>
                      <div><strong>{item.fakulti || 'FST'}</strong></div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{item.bangunan || '-'}</div>
                    </td>
                    <td style={styles.td}>{item.nama_makmal || '-'}</td>
                    <td style={styles.td}><strong>{item.kod_sw}</strong></td>
                    <td style={styles.td}>{item.nama_buangan}</td>
                    <td style={styles.td}>{getQuantityText(item)}</td>
                    <td style={styles.td}><strong>{calculateStorageDays(item.created_at || item.tarikh_pelupusan)} Hari</strong></td>
                    <td style={styles.td}>
                      <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button onClick={() => handleVerifyStatus(item.id_sisa, 'DISAHKAN_OLEH_ROSH_UKM')} style={{ ...styles.smallButton, backgroundColor: '#28a745' }}>
                          ✅ Sahkan ROSH
                        </button>
                        <button onClick={() => handleVerifyStatus(item.id_sisa, 'STOR_PENGUMPULAN_BERPUSAT')} style={{ ...styles.smallButton, backgroundColor: '#6c757d' }}>
                          🏭 Ke Stor Pusat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// DRUM / ROSH FILTER STYLING HELPERS
const roshLabelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#475569',
  marginBottom: '4px'
};

const roshSelectStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};