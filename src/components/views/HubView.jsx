import React, { useState } from 'react';
import { calculateStorageDays } from '../../utils/helpers';

export default function HubView({
  session,
  profile,
  allWasteRecords = [],
  setActiveTab,
  handleLogout,
  setShowProfileModal,
  handleNavigate
}) {
  const [showGuideModal, setShowGuideModal] = useState(false);

  // 1. STAT METRICS CALCULATIONS
  // Total available SW categories in the system dropdown
  const totalKodSW = 16; 
  
  const totalPtj = new Set(allWasteRecords.map((r) => r.fakulti || profile?.fakulti).filter(Boolean)).size || 1;
  const totalMakmal = new Set(allWasteRecords.map((r) => r.nama_makmal).filter(Boolean)).size || 1;

  // Calculate SW Dominan (Most frequent SW code in DB)
  const swCounts = {};
  allWasteRecords.forEach((r) => {
    if (r.kod_sw) swCounts[r.kod_sw] = (swCounts[r.kod_sw] || 0) + 1;
  });
  let swDominan = 'SW206';
  let maxCount = 0;
  Object.entries(swCounts).forEach(([sw, count]) => {
    if (count > maxCount) {
      maxCount = count;
      swDominan = sw;
    }
  });

  // Calculate Max Storage Days
  let maksSimpanan = 0;
  allWasteRecords.forEach((r) => {
    const days = calculateStorageDays(r.created_at || r.tarikh_pelupusan);
    if (days > maksSimpanan) maksSimpanan = days;
  });

  // Calculate Total Weight in Metric Tons (MT)
  let totalKg = 0;
  allWasteRecords.forEach((r) => {
    const kg = (r.kilogram_kimia || 0) + (r.lain_lain_kg || 0) + (r.peralatan_kaca_kg || 0);
    totalKg += kg;
  });
  const jumlahBeratMT = (totalKg / 1000).toFixed(2);

  return (
    <div style={{ backgroundColor: '#f4f6f9', minHeight: '100vh', paddingBottom: '40px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src="/ukm-logo.png" 
            alt="UKM Logo" 
            style={{ height: '52px', objectFit: 'contain' }} 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <div style={{ height: '38px', width: '1px', backgroundColor: '#cbd5e1', margin: '0 2px' }}></div>
          <img 
            src="/iswims-logo.png" 
            alt="i-SWIMS Logo" 
            style={{ height: '68px', objectFit: 'contain' }} 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a' }}>
              {profile?.nama || session?.user?.email || 'PENGGUNA SYSTEM'}
            </div>
            <div style={{ fontSize: '11px', color: '#475569' }}>
              {profile?.peranan || profile?.role || 'ROSH'} - {profile?.fakulti || 'FST'}
            </div>
            <div style={{ fontSize: '11px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '2px', fontWeight: 'bold', color: '#0056b3' }}>
              ID: {profile?.ukmper || 'K025997'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowProfileModal && setShowProfileModal(true)}
              style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Kemaskini Profil
            </button>
            <button
              onClick={handleLogout}
              style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Log Keluar
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px' }}>

        {/* 2. HERO BANNER */}
        <div style={{ backgroundColor: '#1d7f68', color: '#ffffff', padding: '30px', borderRadius: '12px', position: 'relative', overflow: 'hidden', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ backgroundColor: '#fbbf24', color: '#000', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '12px' }}>
            ✔ Portal Rasmi | Sistem Aktif
          </div>
          
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '800',
            lineHeight: 1.3,
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            Sistem Maklumat & Pemantauan<br />Buangan Terjadual Berpusat
          </h1>

          <p style={{ margin: 0, fontSize: '14px', opacity: 0.95, fontWeight: '500' }}>
            Fakulti Sains & Teknologi, Universiti Kebangsaan Malaysia
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', fontStyle: 'italic', opacity: 0.85 }}>
            "Penghantaran Rekod Lebih Pantas & Bersepadu"
          </p>
        </div>

        {/* 3. NOTICE ALERT BOX */}
        <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '15px 20px', display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '8px', borderRadius: '50%', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            📣
          </div>
          <div style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.5 }}>
            <strong>Perhatian:</strong>
            <br />
            1. Tarikh akhir penghantaran rekod buangan terjadual siri 3/2026 adalah pada <strong>31 Julai 2026</strong>. Pastikan pengkelasan sisa dijalankan dengan tepat sebelum membuat permohonan.
            <br />
            2. <strong>Sisa yang mengandungi ASID PIKRIK perlu melalui pelupusan khas.</strong> Kakitangan boleh berhubung dengan Penyelaras Buangan Terjadual masing-masing.
          </div>
        </div>

        {/* 4. STAT METRICS INDICATORS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '25px' }}>
          <div style={statCardStyle}>
            <div style={iconCircleStyle('#dbeafe', '#2563eb')}>🧪</div>
            <div style={statLabelStyle}>BIL. KOD SW</div>
            <div style={statValueStyle('#0f172a')}>{totalKodSW}</div>
          </div>

          <div style={statCardStyle}>
            <div style={iconCircleStyle('#dcfce7', '#16a34a')}>🏛️</div>
            <div style={statLabelStyle}>BIL. PTJ AKTIF</div>
            <div style={statValueStyle('#0f172a')}>{totalPtj}</div>
          </div>

          <div style={statCardStyle}>
            <div style={iconCircleStyle('#e0f2fe', '#0284c7')}>📦</div>
            <div style={statLabelStyle}>SW DOMINAN</div>
            <div style={statValueStyle('#0f172a')}>{swDominan}</div>
          </div>

          <div style={statCardStyle}>
            <div style={iconCircleStyle('#fef3c7', '#d97706')}>🔬</div>
            <div style={statLabelStyle}>BIL. MAKMAL</div>
            <div style={statValueStyle('#0f172a')}>{totalMakmal}</div>
          </div>

          <div style={statCardStyle}>
            <div style={iconCircleStyle('#ffe4e6', '#e11d48')}>📅</div>
            <div style={statLabelStyle}>MAKS. SIMPANAN</div>
            <div style={statValueStyle('#0f172a')}>{maksSimpanan} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Hari</span></div>
          </div>

          <div style={statCardStyle}>
            <div style={iconCircleStyle('#f3e8ff', '#9333ea')}>⚖️</div>
            <div style={statLabelStyle}>JUMLAH BERAT</div>
            <div style={statValueStyle('#dc2626')}>{jumlahBeratMT} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>MT</span></div>
          </div>
        </div>

        {/* 5. MAIN ROLE MODULE BUTTONS */}
        <h3 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '12px', fontWeight: 'bold' }}>Modul Pengurusan Sisa</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <button onClick={() => handleNavigate ? handleNavigate('PENJANA', 'Penjana') : setActiveTab('PENJANA')} style={moduleButtonStyle('#16a34a')}>
            <span style={{ fontSize: '28px' }}>🧪</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Penjana Sisa</span>
          </button>

          <button onClick={() => handleNavigate ? handleNavigate('JKKP', 'JKKP') : setActiveTab('JKKP')} style={moduleButtonStyle('#0284c7')}>
            <span style={{ fontSize: '28px' }}>🏢</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>JKKP Bangunan</span>
          </button>

          <button onClick={() => handleNavigate ? handleNavigate('PENYELARAS', 'Penyelaras') : setActiveTab('PENYELARAS')} style={moduleButtonStyle('#9333ea')}>
            <span style={{ fontSize: '28px' }}>📊</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Penyelaras BT</span>
          </button>

          <button onClick={() => handleNavigate ? handleNavigate('ROSH', 'ROSH') : setActiveTab('ROSH')} style={moduleButtonStyle('#dc2626')}>
            <span style={{ fontSize: '28px' }}>🛡️</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>ROSH UKM</span>
          </button>
        </div>

        {/* 6. BUTTON: TATACARA PENGGUNAAN SISTEM i-SWIMS */}
        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <button
            onClick={() => setShowGuideModal(true)}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
            }}
          >
            📖 Tatacara Penggunaan Sistem i-SWIMS
          </button>
        </div>

      </div>

      {/* 7. TATACARA PENGGUNAAN MODAL */}
      {showGuideModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '25px', maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📖 Tatacara Penggunaan Sistem i-SWIMS</h3>
              <button onClick={() => setShowGuideModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
              <h4 style={{ color: '#0284c7', marginTop: 0 }}>1. Modul Penjana Sisa (Penyelia / Staf Makmal)</h4>
              <ul>
                <li>Daftar masuk dan isi Borang Pendaftaran Sisa Terjadual mengikut Makmal & Kod SW yang tepat.</li>
                <li>Muatnaik fail Safety Data Sheet (SDS) PDF khusus untuk kod <strong>SW430</strong>.</li>
                <li>Tandakan sisa pada senarai dan cetak Borang Pelupusan PDF serta Label ROSH UKM (4 label / A4).</li>
              </ul>

              <h4 style={{ color: '#0284c7' }}>2. Modul JKKP Bangunan & Penyelaras BT</h4>
              <ul>
                <li>Semak senarai permohonan sisa daripada Penjana Sisa di bawah bangunan / PTJ masing-masing.</li>
                <li>Sahkan permohonan atau kembalikan permohonan kepada penjana jika maklumat perlu dipinda.</li>
              </ul>

              <h4 style={{ color: '#0284c7' }}>3. Modul ROSH UKM</h4>
              <ul>
                <li>Verifikasi akhir dan pemantauan inventori sisa berpusat seluruh UKM.</li>
                <li>Eksport laporan keseluruhan untuk tujuan auditan Jabatan Alam Sekitar (JAS).</li>
              </ul>
            </div>

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// STYLING HELPERS
const statCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  padding: '16px',
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  border: '1px solid #e2e8f0'
};

const iconCircleStyle = (bgColor, textColor) => ({
  backgroundColor: bgColor,
  color: textColor,
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 8px auto',
  fontSize: '18px'
});

const statLabelStyle = {
  fontSize: '10px',
  fontWeight: 'bold',
  color: '#64748b',
  letterSpacing: '0.5px',
  marginBottom: '4px'
};

const statValueStyle = (color) => ({
  fontSize: '20px',
  fontWeight: '800',
  color: color
});

const moduleButtonStyle = (borderColor) => ({
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderLeft: `6px solid ${borderColor}`,
  borderRadius: '10px',
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  transition: 'transform 0.15s ease, boxShadow 0.15s ease'
});