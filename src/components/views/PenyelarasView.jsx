import React, { useState } from 'react';
import { calculateDrumsNeeded, calculateStorageDays, calculateTotalWeightKg, getQuantityText, getStatusBadgeStyle, formatMalayDate } from '../../utils/helpers';
import { styles } from '../../styles/styles';

const ALL_SW_CODES = [
  'SW109', 'SW206', 'SW301', 'SW305', 'SW320', 'SW322', 'SW323',
  'SW402', 'SW405', 'SW409', 'SW410', 'SW421', 'SW422', 'SW430'
];

export default function PenyelarasView({ profile, facultyWasteRecords = [], handleVerifyStatus, setActiveTab }) {
  const [showVisuals, setShowVisuals] = useState(false);
  const [showDrumCalc, setShowDrumCalc] = useState(false);

  // DRUM CALCULATION FILTER STATES
  const [drumTarikh, setDrumTarikh] = useState('');
  const [drumFakulti, setDrumFakulti] = useState('');
  const [drumBangunan, setDrumBangunan] = useState('');

  // JADUAL DATA FILTER STATES (TARIKH & BANGUNAN)
  const [filterTarikh, setFilterTarikh] = useState('');
  const [filterBangunan, setFilterBangunan] = useState('');

  // SEMAK PERANAN PENGGUNA (PENYELARAS BT VS LAIN-LAIN)
  const userRole = (profile?.role || profile?.peranan || 'Penyelaras').toString().toUpperCase();
  const isPenyelarasApprover = userRole.includes('PENYELARAS');
  const userFaculty = profile?.fakulti || 'FST';

  // 1. TAPISAN KETAT FAKULTI: HANYA PAPAR DATA FAKULTI PENYELARAS BT SAHAJA
  const strictFacultyRecords = facultyWasteRecords.filter((r) => {
    if (!profile?.fakulti) return true;
    return (r.fakulti || '').trim().toLowerCase() === profile.fakulti.trim().toLowerCase();
  });

  // 2. KIRAAN 4 KAD STATISTIK UTAMA (FAKULTI PENYELARAS)
  const totalWeightKg = calculateTotalWeightKg(strictFacultyRecords);

  const totalBottles = strictFacultyRecords.reduce((sum, r) => {
    return sum + (r.botol_2_5l_kimia || 0) + (r.botol_4_0l_kimia || 0) + (r.botol_2_5l_kosong || 0) + (r.botol_4_0l_kosong || 0);
  }, 0);

  const drumsNeeded = calculateDrumsNeeded ? calculateDrumsNeeded(totalWeightKg) : Math.ceil(totalWeightKg / 200);

  const warningStatusCount = strictFacultyRecords.filter((r) => calculateStorageDays(r.created_at || r.tarikh_pelupusan) > 120).length;

  // 3. LOGIK PENAPISAN JADUAL SEMAKAN DATA (TARIKH & BANGUNAN)
  const filteredTableRecords = strictFacultyRecords.filter((r) => {
    if (filterTarikh && r.tarikh_pelupusan !== filterTarikh) return false;
    if (filterBangunan && (r.bangunan || '').trim().toLowerCase() !== filterBangunan.trim().toLowerCase()) return false;
    return true;
  });

  // DROPDOWN OPTIONS UNTUK PENAPIS JADUAL
  const tableTarikhOptions = [...new Set(strictFacultyRecords.map((r) => r.tarikh_pelupusan).filter(Boolean))];
  const tableBangunanOptions = [...new Set(strictFacultyRecords.map((r) => r.bangunan).filter(Boolean))];

  // 4. LOGIK PENAPISAN PENGIRAAN DRUM
  const drumFilteredRecords = strictFacultyRecords.filter((r) => {
    if (drumTarikh && r.tarikh_pelupusan !== drumTarikh) return false;
    if (drumFakulti && r.fakulti !== drumFakulti) return false;
    if (drumBangunan && r.bangunan !== drumBangunan) return false;
    return true;
  });

  const tarikhOpt = [...new Set(strictFacultyRecords.map((r) => r.tarikh_pelupusan).filter(Boolean))];
  const fakultiOpt = [...new Set(strictFacultyRecords.map((r) => r.fakulti).filter(Boolean))];
  const bngOpt = [...new Set(strictFacultyRecords.map((r) => r.bangunan).filter(Boolean))];

  function resetDrumFilters() {
    setDrumTarikh('');
    setDrumFakulti('');
    setDrumBangunan('');
  }

  // 5. AGREGASI DATA MENGIKUT KOD SW UNTUK PENGIRAAN DRUM
  const swCodeList = [...new Set([...ALL_SW_CODES, ...drumFilteredRecords.map((r) => r.kod_sw).filter(Boolean)])].sort();

  let totalGrandDrums = 0;
  const swDrumTableData = swCodeList.map((code) => {
    const recordsForCode = drumFilteredRecords.filter((r) => r.kod_sw === code);

    const b25 = recordsForCode.reduce((sum, r) => sum + (r.botol_2_5l_kimia || 0) + (r.botol_2_5l_kosong || 0), 0);
    const b40 = recordsForCode.reduce((sum, r) => sum + (r.botol_4_0l_kimia || 0) + (r.botol_4_0l_kosong || 0), 0);
    const kg = recordsForCode.reduce((sum, r) => sum + (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0), 0);

    const d25 = b25 > 0 ? Math.ceil(b25 / 24) : 0;
    const d40 = b40 > 0 ? Math.ceil(b40 / 16) : 0;
    const dKg = kg > 0 ? Math.ceil(kg / 150) : 0;
    const estDrums = d25 + d40 + dKg;

    totalGrandDrums += estDrums;

    return { code, b25, b40, kg, estDrums };
  });

  // 6. AGREGASI DATA UNTUK GRAF VISUAL
  const monthsList = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const monthlyKg = Array(12).fill(0);
  strictFacultyRecords.forEach((r) => {
    const d = new Date(r.created_at || r.tarikh_pelupusan);
    if (!isNaN(d)) {
      const m = d.getMonth();
      const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
      monthlyKg[m] += kg;
    }
  });
  const maxMonthlyKg = Math.max(...monthlyKg, 10);

  const swMap = {};
  strictFacultyRecords.forEach((r) => {
    const code = r.kod_sw || 'Lain-lain';
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    swMap[code] = (swMap[code] || 0) + kg;
  });
  const swSorted = Object.entries(swMap).sort((a, b) => b[1] - a[1]);
  const maxSwKg = Math.max(...Object.values(swMap), 10);

  const catMap = {};
  strictFacultyRecords.forEach((r) => {
    const cat = r.kategori_makmal || 'Tidak Dinyatakan';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });

  const bngMap = {};
  strictFacultyRecords.forEach((r) => {
    const bng = r.bangunan || 'Bangunan Sains Kimia';
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    bngMap[bng] = (bngMap[bng] || 0) + kg;
  });
  const bngSorted = Object.entries(bngMap).sort((a, b) => b[1] - a[1]);
  const maxBngKg = Math.max(...Object.values(bngMap), 10);

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>📊 Halaman Penyelaras Buangan Terjadual ({userFaculty})</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      {/* NOTIS READ-ONLY JIKA BUKAN PENYELARAS BT */}
      {!isPenyelarasApprover && (
        <div style={{ ...styles.card, backgroundColor: '#f0f9ff', border: '1px solid #0284c7', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> Mod Paparan Sahaja ({userRole})
          </h3>
          <p style={{ margin: '8px 0 0 0', color: '#0369a1', fontSize: '13px', lineHeight: '1.5' }}>
            Sebagai pengguna berperanan <strong>{userRole}</strong>, anda hanya dibenarkan melihat dan memantau rekod sisa fakulti {userFaculty}. Pengesahan status permohonan hanya boleh dilakukan oleh Penyelaras BT PTJ/Fakulti.
          </p>
        </div>
      )}

      {/* 4 KAD STATISTIK UTAMA (FAKULTI PENYELARAS SAHAJA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#0d6efd', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎒</span> JUM. BERAT SISA (KG)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{totalWeightKg.toFixed(2)}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>Terkumpul tahun ini ({userFaculty})</div>
        </div>

        <div style={{ backgroundColor: '#198754', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🧪</span> JUM. BOTOL (2.5L & 4L)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{totalBottles}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>Sedia untuk dilupus ({userFaculty})</div>
        </div>

        <div style={{ backgroundColor: '#ffc107', color: '#0f172a', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🛢️</span> ANGGARAN DRUM
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{drumsNeeded}</div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>Keperluan logistik ROSH</div>
        </div>

        <div style={{ backgroundColor: '#dc3545', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> STATUS AMARAN
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{warningStatusCount}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>Sisa melebihi 120 hari</div>
        </div>
      </div>

      {/* TWO ACTION BUTTONS: PAPARAN VISUAL & PENGIRAAN DRUM */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setShowVisuals(!showVisuals)}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: showVisuals ? '#0284c7' : '#ffffff',
            color: showVisuals ? '#ffffff' : '#0284c7',
            border: '2px solid #0284c7',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          <span>📈</span> Paparan Visual {showVisuals ? '▲ (Sembunyi Graf Analitik)' : '▼ (Papar Graf Analitik)'}
        </button>

        <button
          onClick={() => setShowDrumCalc(!showDrumCalc)}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: showDrumCalc ? '#d97706' : '#ffffff',
            color: showDrumCalc ? '#ffffff' : '#d97706',
            border: '2px solid #d97706',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🧮</span> Pengiraan Drum {showDrumCalc ? '▲ (Sembunyi Kapasiti Drum)' : '▼ (Papar Kapasiti Drum)'}
        </button>
      </div>

      {/* SEKSYEN GRAF ANALITIK */}
      {showVisuals && (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📉</span> Dashboard Analitik PTj ({userFaculty})
          </h3>

          <div style={{ marginBottom: '30px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '14px' }}>📈 Trend Penjanaan Sisa Bulanan (Kg)</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '8px', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px' }}>
              {monthsList.map((m, idx) => {
                const kgVal = monthlyKg[idx];
                const heightPercent = maxMonthlyKg > 0 ? (kgVal / maxMonthlyKg) * 100 : 0;
                return (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginBottom: '4px' }}>
                      {kgVal > 0 ? kgVal.toFixed(1) : ''}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '32px',
                        height: `${Math.max(heightPercent, kgVal > 0 ? 6 : 0)}%`,
                        backgroundColor: '#60a5fa',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease'
                      }}
                      title={`${m}: ${kgVal.toFixed(2)} Kg`}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', marginTop: '6px' }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '14px' }}>📊 Penjanaan Sisa Mengikut Kod SW (Kg)</h4>
              {swSorted.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Tiada data Kod SW.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '160px', gap: '8px', borderBottom: '2px solid #cbd5e1', paddingBottom: '8px' }}>
                  {swSorted.map(([code, kgVal]) => {
                    const heightPercent = maxSwKg > 0 ? (kgVal / maxSwKg) * 100 : 0;
                    return (
                      <div key={code} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>{kgVal.toFixed(1)}</span>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '28px',
                            height: `${Math.max(heightPercent, 8)}%`,
                            backgroundColor: '#818cf8',
                            borderRadius: '4px 4px 0 0'
                          }}
                          title={`${code}: ${kgVal.toFixed(2)} Kg`}
                        />
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155', marginTop: '4px', transform: 'rotate(-30deg)', transformOrigin: 'top left' }}>{code}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '14px' }}>🍕 Kategori Makmal</h4>
              {Object.keys(catMap).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Tiada data kategori makmal.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(catMap).map(([cat, count], idx) => {
                    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                    const bgCol = colors[idx % colors.length];
                    const percent = Math.round((count / strictFacultyRecords.length) * 100);
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#334155' }}>
                          <span>{cat}</span>
                          <span>{count} Rekod ({percent}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: bgCol }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '14px' }}>🏢 Penjanaan Sisa Tertinggi Mengikut Bangunan (Kg)</h4>
            {bngSorted.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Tiada data bangunan.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bngSorted.map(([bngName, kgVal]) => {
                  const widthPercent = maxBngKg > 0 ? (kgVal / maxBngKg) * 100 : 0;
                  return (
                    <div key={bngName}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: '#334155' }}>
                        <span>{bngName}</span>
                        <span>{kgVal.toFixed(2)} Kg</span>
                      </div>
                      <div style={{ width: '100%', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(widthPercent, 2)}%`, height: '100%', backgroundColor: '#fb923c' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEKSYEN PENGIRAAN KAPASITI DRUM */}
      {showDrumCalc && (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #cbd5e1' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🧮</span> Pengiraan Kapasiti Drum (Penyelaras BT)
          </h3>

          <div style={{ backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', padding: '14px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#0369a1', lineHeight: '1.6' }}>
            <strong style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>ℹ️ Formula Pengiraan Kapasiti Drum:</strong>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>Botol 2.5L:</strong> 1 Drum memuatkan 24 botol.</li>
              <li><strong>Botol 4.0L:</strong> 1 Drum memuatkan 16 botol.</li>
              <li><strong>Lain-lain Bekas / Pepejal:</strong> 1 Drum memuatkan 150 kg.</li>
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '15px' }}>
            <div>
              <label style={drumFilterLabelStyle}>Tarikh Pelupusan</label>
              <select value={drumTarikh} onChange={(e) => setDrumTarikh(e.target.value)} style={drumFilterSelectStyle}>
                <option value="">Semua Tarikh</option>
                {tarikhOpt.map((t) => <option key={t} value={t}>{formatMalayDate(t)}</option>)}
              </select>
            </div>

            <div>
              <label style={drumFilterLabelStyle}>PTJ / Fakulti</label>
              <select value={drumFakulti} onChange={(e) => setDrumFakulti(e.target.value)} style={drumFilterSelectStyle}>
                <option value="">Semua PTJ</option>
                {fakultiOpt.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label style={drumFilterLabelStyle}>Bangunan</label>
              <select value={drumBangunan} onChange={(e) => setDrumBangunan(e.target.value)} style={drumFilterSelectStyle}>
                <option value="">Semua Bangunan</option>
                {bngOpt.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={resetDrumFilters}
              style={{ padding: '8px 16px', backgroundColor: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🔄 Reset
            </button>
            <button
              style={{ padding: '8px 18px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🧮 Kira Anggaran Drum
            </button>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ ...styles.table, margin: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>Kod SW</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Jum. Botol 2.5L</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Jum. Botol 4.0L</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Jum. Berat (Kg)</th>
                  <th style={{ ...styles.th, textAlign: 'center', backgroundColor: '#fef08a', color: '#854d0e', fontWeight: '800' }}>🛢️ Anggaran Drum</th>
                </tr>
              </thead>
              <tbody>
                {swDrumTableData.map((row) => (
                  <tr key={row.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{ backgroundColor: '#475569', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        {row.code}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{row.b25}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{row.b40}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{row.kg.toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: 'center', backgroundColor: '#fefce8', fontWeight: 'bold', color: '#854d0e', fontSize: '14px' }}>
                      {row.estDrums}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#fef08a', fontWeight: '800' }}>
                  <td colSpan="4" style={{ ...styles.td, textAlign: 'right', paddingRight: '20px', color: '#854d0e', fontSize: '13px' }}>
                    JUMLAH KESELURUHAN DRUM DIPERLUKAN:
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#854d0e', fontSize: '18px', fontWeight: '900' }}>
                    {totalGrandDrums} 🛢️
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FILTER BAR CONTAINER FOR DATA TABLE */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> Penapis Semakan Sisa ({userFaculty})
          </h3>
          {(filterTarikh || filterBangunan) && (
            <button
              onClick={() => { setFilterTarikh(''); setFilterBangunan(''); }}
              style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕ Set Semula Tapis
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={filterLabelStyle}>Tarikh Pelupusan</label>
            <select value={filterTarikh} onChange={(e) => setFilterTarikh(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Tarikh</option>
              {tableTarikhOptions.map((t) => (
                <option key={t} value={t}>{formatMalayDate(t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={filterLabelStyle}>Bangunan</label>
            <select value={filterBangunan} onChange={(e) => setFilterBangunan(e.target.value)} style={filterSelectStyle}>
              <option value="">Semua Bangunan</option>
              {tableBangunanOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* JADUAL SEMAKAN & PENGESAHAN PENYELARAS BT */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#0056b3' }}>Semakan Permohonan Sisa Fakulti ({userFaculty})</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Memaparkan <strong>{filteredTableRecords.length}</strong> daripada {strictFacultyRecords.length} rekod sisa
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={styles.th}>Bil.</th>
                <th style={styles.th}>ID Sisa</th>
                <th style={styles.th}>Makmal</th>
                <th style={styles.th}>Kod SW</th>
                <th style={styles.th}>Nama Buangan</th>
                <th style={styles.th}>Kuantiti</th>
                <th style={styles.th}>Tempoh Simpanan</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Tindakan Penyelaras BT</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Tiada rekod sisa fakulti dijumpai mengikut penapis semasa.
                  </td>
                </tr>
              ) : (
                filteredTableRecords.map((item, idx) => {
                  const storageDays = calculateStorageDays(item.created_at || item.tarikh_pelupusan);
                  const isApprovedByPenyelaras = ['DISAHKAN_OLEH_PENYELARAS', 'DISAHKAN_PENYELARAS', 'DISAHKAN_ROSH', 'DISAHKAN_OLEH_ROSH_UKM'].includes((item.status || '').toUpperCase());

                  return (
                    <tr key={item.id || item.id_sisa || idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                      <td style={styles.td}>{item.nama_makmal || '-'}</td>
                      <td style={styles.td}><strong>{item.kod_sw}</strong></td>
                      <td style={styles.td}>{item.nama_buangan}</td>
                      <td style={styles.td}>{getQuantityText(item)}</td>
                      <td style={styles.td}>
                        <strong style={{ color: storageDays > 120 ? '#dc3545' : '#1e293b' }}>
                          ⏱️ {storageDays} Hari
                        </strong>
                      </td>
                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {isPenyelarasApprover ? (
                          !isApprovedByPenyelaras ? (
                            <button 
                              onClick={() => handleVerifyStatus(item.id_sisa, 'DISAHKAN_OLEH_PENYELARAS')} 
                              style={{ ...styles.smallButton, backgroundColor: '#6f42c1', fontWeight: 'bold' }}
                            >
                              ✅ Sahkan Penyelaras
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#28a745', fontWeight: 'bold' }}>
                              ✓ Telah Disahkan Penyelaras
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 'bold', backgroundColor: '#e0f2fe', padding: '4px 8px', borderRadius: '4px' }}>
                            👁️ Paparan Sahaja
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

const drumFilterLabelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#0369a1',
  marginBottom: '4px'
};

const drumFilterSelectStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};