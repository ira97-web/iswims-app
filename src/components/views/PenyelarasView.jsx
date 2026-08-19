import React, { useState } from 'react';
import { calculateDrumsNeeded, calculateStorageDays, calculateTotalWeightKg, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function PenyelarasView({ profile, facultyWasteRecords = [], handleVerifyStatus, setActiveTab }) {
  const [showVisuals, setShowVisuals] = useState(false);

  // SEMAK PERANAN PENGGUNA (PENYELARAS BT VS LAIN-LAIN)
  const userRole = (profile?.role || profile?.peranan || 'Penyelaras').toString().toUpperCase();
  const isPenyelarasApprover = userRole.includes('PENYELARAS');

  // 1. KIRAAN 4 KAD STATISTIK UTAMA
  const totalWeightKg = calculateTotalWeightKg(facultyWasteRecords);

  const totalBottles = facultyWasteRecords.reduce((sum, r) => {
    return sum + (r.botol_2_5l_kimia || 0) + (r.botol_4_0l_kimia || 0) + (r.botol_2_5l_kosong || 0) + (r.botol_4_0l_kosong || 0);
  }, 0);

  const drumsNeeded = calculateDrumsNeeded ? calculateDrumsNeeded(totalWeightKg) : Math.ceil(totalWeightKg / 200);

  const warningStatusCount = facultyWasteRecords.filter((r) => calculateStorageDays(r.created_at || r.tarikh_pelupusan) > 120).length;

  // 2. AGREGASI DATA UNTUK GRAF VISUAL
  // A. Trend Penjanaan Sisa Bulanan (Jan - Dis)
  const monthsList = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const monthlyKg = Array(12).fill(0);
  facultyWasteRecords.forEach((r) => {
    const d = new Date(r.created_at || r.tarikh_pelupusan);
    if (!isNaN(d)) {
      const m = d.getMonth();
      const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
      monthlyKg[m] += kg;
    }
  });
  const maxMonthlyKg = Math.max(...monthlyKg, 10);

  // B. Penjanaan Sisa Mengikut Kod SW (Kg)
  const swMap = {};
  facultyWasteRecords.forEach((r) => {
    const code = r.kod_sw || 'Lain-lain';
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    swMap[code] = (swMap[code] || 0) + kg;
  });
  const swSorted = Object.entries(swMap).sort((a, b) => b[1] - a[1]);
  const maxSwKg = Math.max(...Object.values(swMap), 10);

  // C. Pecahan Kategori Makmal
  const catMap = {};
  facultyWasteRecords.forEach((r) => {
    const cat = r.kategori_makmal || 'Tidak Dinyatakan';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });

  // D. Penjanaan Sisa Tertinggi Mengikut Bangunan (Kg)
  const bngMap = {};
  facultyWasteRecords.forEach((r) => {
    const bng = r.bangunan || 'Bangunan Sains Kimia';
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    bngMap[bng] = (bngMap[bng] || 0) + kg;
  });
  const bngSorted = Object.entries(bngMap).sort((a, b) => b[1] - a[1]);
  const maxBngKg = Math.max(...Object.values(bngMap), 10);

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>📊 Halaman Penyelaras Buangan Terjadual</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      {/* NOTIS READ-ONLY JIKA BUKAN PENYELARAS BT */}
      {!isPenyelarasApprover && (
        <div style={{ ...styles.card, backgroundColor: '#f0f9ff', border: '1px solid #0284c7', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> Mod Paparan Sahaja ({userRole})
          </h3>
          <p style={{ margin: '8px 0 0 0', color: '#0369a1', fontSize: '13px', lineHeight: '1.5' }}>
            Sebagai pengguna berperanan <strong>{userRole}</strong>, anda hanya dibenarkan melihat dan memantau rekod sisa fakulti. Pengesahan status permohonan hanya boleh dilakukan oleh Penyelaras BT PTJ/Fakulti.
          </p>
        </div>
      )}

      {/* 4 KAD STATISTIK UTAMA (DI BAHAGIAN ATAS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* BOX 1: JUM. BERAT SISA */}
        <div style={{ backgroundColor: '#0d6efd', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎒</span> JUM. BERAT SISA (KG)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{totalWeightKg.toFixed(2)}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>Terkumpul tahun ini ({profile?.fakulti || 'FST'})</div>
        </div>

        {/* BOX 2: JUM. BOTOL */}
        <div style={{ backgroundColor: '#198754', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🧪</span> JUM. BOTOL (2.5L & 4L)
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{totalBottles}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>Sedia untuk dilupus</div>
        </div>

        {/* BOX 3: ANGGARAN DRUM */}
        <div style={{ backgroundColor: '#ffc107', color: '#0f172a', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🛢️</span> ANGGARAN DRUM
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{drumsNeeded}</div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>Keperluan logistik ROSH</div>
        </div>

        {/* BOX 4: STATUS AMARAN */}
        <div style={{ backgroundColor: '#dc3545', color: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span> STATUS AMARAN
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', margin: '8px 0 2px 0' }}>{warningStatusCount}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>Sisa melebihi 120 hari</div>
        </div>
      </div>

      {/* BUTANG PAPARAN VISUAL */}
      <div style={{ marginBottom: '20px' }}>
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
      </div>

      {/* SEKSYEN GRAF ANALITIK (DAPAT DIPAPARKAN / DISEMBUNYIKAN) */}
      {showVisuals && (
        <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📉</span> Dashboard Analitik PTj ({profile?.fakulti || 'FST'})
          </h3>

          {/* GRAF 1: TREND PENJANAAN SISA BULANAN */}
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

          {/* GRID UNTUK GRAF 2 & GRAF 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {/* GRAF 2: KOD SW */}
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

            {/* GRAF 3: KATEGORI MAKMAL */}
            <div style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#334155', fontSize: '14px' }}>🍕 Kategori Makmal</h4>
              {Object.keys(catMap).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Tiada data kategori makmal.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(catMap).map(([cat, count], idx) => {
                    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
                    const bgCol = colors[idx % colors.length];
                    const percent = Math.round((count / facultyWasteRecords.length) * 100);
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

          {/* GRAF 4: TINGGI MENGIKUT BANGUNAN (HORIZONTAL BARS) */}
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

      {/* JADUAL SEMAKAN & PENGESAHAN PENYELARAS BT */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#0056b3' }}>Semakan Permohonan Sisa Fakulti ({profile?.fakulti || 'FST'})</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Jumlah: <strong>{facultyWasteRecords.length}</strong> rekod sisa
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
              {facultyWasteRecords.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Tiada rekod sisa fakulti dijumpai.
                  </td>
                </tr>
              ) : (
                facultyWasteRecords.map((item, idx) => {
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