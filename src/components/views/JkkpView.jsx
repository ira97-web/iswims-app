import React from 'react';
import { calculateStorageDays, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';

export default function JkkpView({ allWasteRecords, handleVerifyStatus, handlePrintSummaryPdf, setActiveTab }) {
  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>🏢 Halaman JKKP Bangunan</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Semakan & Pengesahan Sisa Bangunan</h3>
          <button onClick={() => handlePrintSummaryPdf('Borang Ringkasan JKKP Bangunan', allWasteRecords)} style={{ ...styles.button, backgroundColor: '#0056b3', width: 'auto' }}>
            📄 Muat Turun Borang Ringkasan JKKP
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
                <th style={styles.th}>Status Semasa</th>
                <th style={styles.th}>Tindakan JKKP</th>
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
                      <button onClick={() => handleVerifyStatus(item.id_sisa, 'DISAHKAN_OLEH_JKKP')} style={{ ...styles.smallButton, backgroundColor: '#28a745' }}>
                        ✅ Sahkan
                      </button>
                      <button onClick={() => handleVerifyStatus(item.id_sisa, 'DIKEMBALIKAN_KE_PENJANA')} style={{ ...styles.smallButton, backgroundColor: '#dc3545' }}>
                        🔄 Pulangkan
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