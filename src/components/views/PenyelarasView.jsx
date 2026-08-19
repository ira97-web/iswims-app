import React from 'react';
import { calculateDrumsNeeded, calculateStorageDays, calculateTotalWeightKg, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function PenyelarasView({ profile, facultyWasteRecords = [], handleVerifyStatus, handlePrintSummaryPdf, setActiveTab }) {
  const totalWeightKg = calculateTotalWeightKg(facultyWasteRecords);

  // SEMAK PERANAN PENGGUNA (PENYELARAS BT VS ROSH / LAIN-LAIN)
  const userRole = (profile?.role || profile?.peranan || 'Penyelaras').toString().toUpperCase();
  const isPenyelarasApprover = userRole.includes('PENYELARAS');

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>📊 Halaman Penyelaras Buangan Terjadual</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      {/* NOTIS PAPARAN SAHAJA JIKA BUKAN PENYELARAS BT (E.G. ROSH UKM) */}
      {!isPenyelarasApprover && (
        <div style={{ ...styles.card, backgroundColor: '#f0f9ff', border: '1px solid #0284c7', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> Mod Paparan Sahaja ({userRole})
          </h3>
          <p style={{ margin: '8px 0 0 0', color: '#0369a1', fontSize: '13px', lineHeight: '1.5' }}>
            Sebagai pengguna berperanan <strong>{userRole}</strong>, anda hanya dibenarkan melihat dan memantau rekod sisa serta memuat turun borang ringkasan fakulti. Pengesahan status permohonan hanya boleh dilakukan oleh Penyelaras BT PTJ/Fakulti.
          </p>
        </div>
      )}

      {/* STATISTIK SISA FAKULTI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{facultyWasteRecords.length}</div>
          <div style={styles.statLabel}>Jumlah Rekod Fakulti ({profile?.fakulti || 'FST'})</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{(totalWeightKg / 1000).toFixed(2)}</div>
          <div style={styles.statLabel}>Jumlah Sisa (Metric Tonne)</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{calculateDrumsNeeded(totalWeightKg)}</div>
          <div style={styles.statLabel}>Anggaran Tong / Drum (200L)</div>
        </div>
      </div>

      {/* MONITORING TABLE CARD */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3>Pemantauan & Pengesahan Sisa Fakulti</h3>
          <button 
            onClick={() => handlePrintSummaryPdf(`Borang Ringkasan Fakulti ${profile?.fakulti || 'FST'}`, facultyWasteRecords)} 
            style={{ ...styles.button, backgroundColor: '#6f42c1', width: 'auto' }}
          >
            📄 Muat Turun Borang Ringkasan Fakulti
          </button>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={styles.th}>ID Sisa</th>
                <th style={styles.th}>Makmal</th>
                <th style={styles.th}>Kod SW</th>
                <th style={styles.th}>Nama Buangan</th>
                <th style={styles.th}>Kuantiti</th>
                <th style={styles.th}>Tempoh Simpanan</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Tindakan Penyelaras</th>
              </tr>
            </thead>
            <tbody>
              {facultyWasteRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Tiada rekod sisa fakulti dijumpai.
                  </td>
                </tr>
              ) : (
                facultyWasteRecords.map((item) => {
                  const isApprovedByPenyelaras = ['DISAHKAN_OLEH_PENYELARAS', 'DISAHKAN_PENYELARAS', 'DISAHKAN_ROSH', 'DISAHKAN_OLEH_ROSH_UKM'].includes((item.status || '').toUpperCase());

                  return (
                    <tr key={item.id || item.id_sisa} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                      <td style={styles.td}>{item.nama_makmal || '-'}</td>
                      <td style={styles.td}>{item.kod_sw}</td>
                      <td style={styles.td}>{item.nama_buangan}</td>
                      <td style={styles.td}>{getQuantityText(item)}</td>
                      <td style={styles.td}><strong>{calculateStorageDays(item.created_at)} Hari</strong></td>
                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {isPenyelarasApprover ? (
                          !isApprovedByPenyelaras ? (
                            <button 
                              onClick={() => handleVerifyStatus(item.id_sisa, 'DISAHKAN_OLEH_PENYELARAS')} 
                              style={{ ...styles.smallButton, backgroundColor: '#6f42c1' }}
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