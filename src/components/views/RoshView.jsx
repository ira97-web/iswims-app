import React from 'react';
import { calculateDrumsNeeded, calculateStorageDays, calculateTotalWeightKg, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function RoshView({ allWasteRecords, handleVerifyStatus, handlePrintSummaryPdf, setActiveTab }) {
  const totalWeightKg = calculateTotalWeightKg(allWasteRecords);

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>🛡️ Halaman Utama ROSH UKM Admin</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
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

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Pemantauan Induk & Pelupusan Sisa Terjadual UKM</h3>
          <button onClick={() => handlePrintSummaryPdf('Laporan Induk ROSH UKM', allWasteRecords)} style={{ ...styles.button, backgroundColor: '#dc3545', width: 'auto' }}>
            📄 Muat Turun Laporan Induk ROSH
          </button>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '15px' }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={styles.th}>ID Sisa</th>
                <th style={styles.th}>Fakulti</th>
                <th style={styles.th}>Makmal</th>
                <th style={styles.th}>Kod SW</th>
                <th style={styles.th}>Nama Buangan</th>
                <th style={styles.th}>Kuantiti</th>
                <th style={styles.th}>Tempoh Simpanan</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Pengesahan Akhir ROSH</th>
              </tr>
            </thead>
            <tbody>
              {allWasteRecords.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                  <td style={styles.td}>{item.fakulti}</td>
                  <td style={styles.td}>{item.nama_makmal || '-'}</td>
                  <td style={styles.td}>{item.kod_sw}</td>
                  <td style={styles.td}>{item.nama_buangan}</td>
                  <td style={styles.td}>{getQuantityText(item)}</td>
                  <td style={styles.td}><strong>{calculateStorageDays(item.created_at)} Hari</strong></td>
                  <td style={styles.td}>
                    <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleVerifyStatus(item.id_sisa, 'DISAHKAN_OLEH_ROSH_UKM')} style={{ ...styles.smallButton, backgroundColor: '#28a745' }}>
                        ✅ Sahkan ROSH
                      </button>
                      <button onClick={() => handleVerifyStatus(item.id_sisa, 'STOR_PENGUMPULAN_BERPUSAT')} style={{ ...styles.smallButton, backgroundColor: '#6c757d' }}>
                        🏭 Ke Stor Pusat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}