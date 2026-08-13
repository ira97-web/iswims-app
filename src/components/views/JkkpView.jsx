import React, { useState } from 'react';
import { calculateStorageDays, formatMalayDate, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function JkkpView({
  allWasteRecords = [],
  handleVerifyStatus,
  handlePrintSummaryPdf,
  setActiveTab
}) {
  // FILTER STATES
  const [filterTarikh, setFilterTarikh] = useState('');
  const [filterFakulti, setFilterFakulti] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  const [filterBangunan, setFilterBangunan] = useState('');
  const [filterMakmal, setFilterMakmal] = useState('');
  const [filterPenjana, setFilterPenjana] = useState('');

  // EXTRACT DYNAMIC OPTIONS FOR FILTER DROPDOWNS
  const tarikhOptions = [...new Set(allWasteRecords.map((r) => r.tarikh_pelupusan).filter(Boolean))];
  const fakultiOptions = [...new Set(allWasteRecords.map((r) => r.fakulti).filter(Boolean))];
  const jabatanOptions = [...new Set(allWasteRecords.map((r) => r.program_jabatan || r.jabatan).filter(Boolean))];
  const bangunanOptions = [...new Set(allWasteRecords.map((r) => r.bangunan).filter(Boolean))];
  const makmalOptions = [...new Set(allWasteRecords.map((r) => r.nama_makmal).filter(Boolean))];
  const penjanaOptions = [...new Set(allWasteRecords.map((r) => r.nama_penjana || r.email || r.user_id).filter(Boolean))];

  // FILTERED RECORDS LOGIC
  const filteredRecords = allWasteRecords.filter((item) => {
    if (filterTarikh && item.tarikh_pelupusan !== filterTarikh) return false;
    if (filterFakulti && item.fakulti !== filterFakulti) return false;
    if (filterJabatan && (item.program_jabatan || item.jabatan) !== filterJabatan) return false;
    if (filterBangunan && item.bangunan !== filterBangunan) return false;
    if (filterMakmal && item.nama_makmal !== filterMakmal) return false;
    if (filterPenjana && (item.nama_penjana || item.email || item.user_id) !== filterPenjana) return false;
    return true;
  });

  function resetFilters() {
    setFilterTarikh('');
    setFilterFakulti('');
    setFilterJabatan('');
    setFilterBangunan('');
    setFilterMakmal('');
    setFilterPenjana('');
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
          {(filterTarikh || filterFakulti || filterJabatan || filterBangunan || filterMakmal || filterPenjana) && (
            <button
              onClick={resetFilters}
              style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕ Set Semula Tapis
            </button>
          )}
        </div>

        {/* 6 DROPDOWNS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          {/* 1. Tarikh Pelupusan */}
          <div>
            <label style={filterLabelStyle}>Tarikh Pelupusan</label>
            <select value={filterTarikh} onChange={(e) => setFilterTarikh(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Tarikh</option>
              {tarikhOptions.map((t) => (
                <option key={t} value={t}>{formatMalayDate(t)}</option>
              ))}
            </select>
          </div>

          {/* 2. PTj / Fakulti */}
          <div>
            <label style={filterLabelStyle}>PTj / Fakulti</label>
            <select value={filterFakulti} onChange={(e) => setFilterFakulti(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua PTj / Fakulti</option>
              {fakultiOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* 3. Jabatan / Program */}
          <div>
            <label style={filterLabelStyle}>Jabatan / Program</label>
            <select value={filterJabatan} onChange={(e) => setFilterJabatan(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Jabatan</option>
              {jabatanOptions.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* 4. Bangunan */}
          <div>
            <label style={filterLabelStyle}>Bangunan</label>
            <select value={filterBangunan} onChange={(e) => setFilterBangunan(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Bangunan</option>
              {bangunanOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* 5. Nama Makmal */}
          <div>
            <label style={filterLabelStyle}>Nama Makmal</label>
            <select value={filterMakmal} onChange={(e) => setFilterMakmal(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Makmal</option>
              {makmalOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 6. Nama Penjana Sisa */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#0056b3' }}>Senarai Semakan Permohonan Sisa Bangunan</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Memaparkan <strong>{filteredRecords.length}</strong> daripada {allWasteRecords.length} rekod sisa
            </span>
          </div>

          {filteredRecords.length > 0 && (
            <button
              onClick={() => handlePrintSummaryPdf('BORANG RINGKASAN SISA JKKP BANGUNAN', filteredRecords)}
              style={{ ...styles.button, backgroundColor: '#0284c7', width: 'auto', padding: '8px 16px', fontSize: '13px' }}
            >
              📄 Cetak Borang Ringkasan (Hasil Tapisan)
            </button>
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

                  return (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                      <td style={styles.td}>{formatMalayDate(item.tarikh_pelupusan || item.created_at)}</td>
                      <td style={styles.td}>
                        <div><strong>{item.fakulti || 'FST'}</strong></div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.bangunan || 'Bangunan Utama'}</div>
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
                          <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
                            <button
                              onClick={() => handleVerifyStatus(item.id_sisa, 'DISAHKAN_JKKP')}
                              style={{ ...styles.smallButton, backgroundColor: '#28a745', fontSize: '11px' }}
                            >
                              ✓ Sahkan (JKKP)
                            </button>
                            <button
                              onClick={() => handleVerifyStatus(item.id_sisa, 'DIKEMBALIKAN_KE_PENJANA')}
                              style={{ ...styles.smallButton, backgroundColor: '#dc3545', fontSize: '11px' }}
                            >
                              ↩️ Kembalikan
                            </button>
                          </div>
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