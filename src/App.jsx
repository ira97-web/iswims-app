import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { styles } from './styles/styles';
import { formatPhoneNumber, calculateStorageDays, getQuantityText } from './utils/helpers';
import { jawatanList, programData, makmalData, lokasiData } from './constants/ukmData';

import PenjanaView from './components/views/PenjanaView';
import JkkpView from './components/views/JkkpView';
import PenyelarasView from './components/views/PenyelarasView';
import RoshView from './components/views/RoshView';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [publicModal, setPublicModal] = useState(null);
  const [activeTab, setActiveTab] = useState('HUB');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [ukmper, setUkmper] = useState('');
  const [jawatan, setJawatan] = useState('');
  const [noTel, setNoTel] = useState('');
  const [fakulti, setFakulti] = useState('FST');
  const [programJabatan, setProgramJabatan] = useState('');
  const [senaraiMakmal, setSenaraiMakmal] = useState(['']);
  const [tapakPengumpulan, setTapakPengumpulan] = useState('');
  const [role, setRole] = useState('Penjana');
  const [profile, setProfile] = useState(null);
  const [allWasteRecords, setAllWasteRecords] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchAllWasteRecords();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchAllWasteRecords();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      setNama(data.nama?.toUpperCase() || '');
      setUkmper(data.ukmper?.toUpperCase() || '');
      setJawatan(data.jawatan || '');
      setNoTel(data.no_tel ? formatPhoneNumber(data.no_tel) : '');
      if (data.fakulti) setFakulti(data.fakulti);
      if (data.program_jabatan) setProgramJabatan(data.program_jabatan);
      if (data.senarai_makmal && Array.isArray(data.senarai_makmal)) {
        setSenaraiMakmal(data.senarai_makmal.length > 0 ? data.senarai_makmal : ['']);
      }
      if (data.tapak_pengumpulan) setTapakPengumpulan(data.tapak_pengumpulan);
      if (data.role) setRole(data.role);
    }
  }

  async function fetchAllWasteRecords() {
    const { data, error } = await supabase.from('rekod_sisa').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setAllWasteRecords(data || []);
  }

  async function handleVerifyStatus(idSisa, newStatus) {
    let catatan = null;
    if (newStatus === 'DIKEMBALIKAN_KE_PENJANA') {
      catatan = prompt('Masukkan alasan pengembalian untuk tindakan Penjana Sisa:');
      if (!catatan) return;
    }
    const { error } = await supabase.from('rekod_sisa').update({ status: newStatus, catatan_semakan: catatan }).eq('id_sisa', idSisa);
    if (error) alert('Gagal kemaskini status: ' + error.message);
    else fetchAllWasteRecords();
  }

  function handlePrintSummaryPdf(title, records) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #000; padding: 6px; font-size: 12px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2 style="text-align:center;">i-SWIMS UKM - ${title}</h2>
          <p><strong>Tarikh Cetakan:</strong> ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>No</th><th>ID Sisa</th><th>Fakulti</th><th>Makmal</th><th>Kod SW</th>
                <th>Nama Buangan</th><th>Kuantiti</th><th>Tempoh Simpanan</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td><td>${r.id_sisa}</td><td>${r.fakulti}</td>
                  <td>${r.nama_makmal || '-'}</td><td>${r.kod_sw}</td><td>${r.nama_buangan}</td>
                  <td>${getQuantityText(r)}</td><td>${calculateStorageDays(r.created_at)} Hari</td><td>${r.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const roleHierarchy = { Penjana: 1, JKKP: 2, Penyelaras: 3, ROSH: 4 };
  function hasAccess(targetRole) {
    const userLevel = roleHierarchy[profile?.role] || 1;
    const targetLevel = roleHierarchy[targetRole] || 1;
    return userLevel >= targetLevel;
  }

  function handleNavigate(targetTab, targetRole) {
    if (hasAccess(targetRole)) setActiveTab(targetTab);
    else alert(`Akses Terhad! Peranan anda (${profile?.role || 'Penjana'}) tidak mempunyai kebenaran.`);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error) alert('Login failed: ' + error.message);
    else if (data?.session) {
      await fetchProfile(data.session.user.id);
      await fetchAllWasteRecords();
    }
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    const validMakmalList = senaraiMakmal.filter((m) => m.trim() !== '');
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: email.toLowerCase(), password });
    if (authError) alert('Registration failed: ' + authError.message);
    else if (authData?.user) {
      await supabase.from('profiles').upsert([{
        id: authData.user.id, ukmper: ukmper.toUpperCase(), nama: nama.toUpperCase(),
        email: email.toLowerCase(), jawatan, no_tel: formatPhoneNumber(noTel),
        fakulti, program_jabatan: programJabatan, senarai_makmal: validMakmalList,
        tapak_pengumpulan: tapakPengumpulan, role
      }]);
      alert('Akaun berjaya didaftarkan!');
      setIsRegistering(false);
      await fetchProfile(authData.user.id);
    }
    setLoading(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!session?.user) return;
    setLoading(true);
    const validMakmalList = senaraiMakmal.filter((m) => m.trim() !== '');
    const { error } = await supabase.from('profiles').upsert([{
      id: session.user.id, email: session.user.email.toLowerCase(),
      nama: nama.toUpperCase(), ukmper: ukmper.toUpperCase(), jawatan,
      no_tel: formatPhoneNumber(noTel), fakulti, program_jabatan: programJabatan,
      senarai_makmal: validMakmalList, tapak_pengumpulan: tapakPengumpulan, role
    }]);
    if (error) alert('Gagal simpan profil: ' + error.message);
    else {
      alert('Profil berjaya dikemaskini!');
      setIsEditingProfile(false);
      await fetchProfile(session.user.id);
    }
    setLoading(false);
  }

  function handleLogout() {
    supabase.auth.signOut();
    setProfile(null);
    setAllWasteRecords([]);
    setActiveTab('HUB');
  }

  const facultyWasteRecords = allWasteRecords.filter((r) => r.fakulti === (profile?.fakulti || 'FST'));
  const availablePrograms = programData[fakulti] || [];
  const availableLabs = makmalData[programJabatan] || [];
  const availableLocations = lokasiData[fakulti] || [];

  return (
    <div style={!session ? styles.loginWrapper : styles.container}>
      <style>{`html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; }`}</style>

      {!session && (
        <nav style={styles.publicNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/ukm-naratif.png" alt="UKM Naratif Logo" style={{ height: '36px' }} />
            <div style={{ height: '24px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.35)' }}></div>
            <img src="/tekad.png" alt="Tekad 57 Logo" style={{ height: '36px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setPublicModal('PENGENALAN')} style={styles.publicNavBtn}>ℹ️ Pengenalan i-SWIMS</button>
            <button onClick={() => setPublicModal('PANDUAN')} style={styles.publicNavBtn}>📖 Panduan Penggunaan</button>
          </div>
        </nav>
      )}

      {session && (
        <header style={styles.headerBar}>
          <div style={styles.profileLeftGroup}>
            <div style={styles.avatarIcon}>👤</div>
            <div>
              <div style={styles.profileName}>{profile?.nama || 'PENGGUNA UKM'}</div>
              <div style={styles.profileSubtext}>
                UKMPer: <strong>{profile?.ukmper || '-'}</strong> | Jawatan: <strong>{profile?.jawatan || '-'}</strong> | Fakulti: <strong>{profile?.fakulti || 'FST'}</strong> | Peranan: <span style={styles.roleBadge}>{profile?.role || 'Penjana'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab !== 'HUB' && <button onClick={() => setActiveTab('HUB')} style={{ ...styles.button, backgroundColor: '#6c757d' }}>🏠 Papan Pemuka</button>}
            <button onClick={() => setIsEditingProfile(!isEditingProfile)} style={{ ...styles.button, backgroundColor: '#17a2b8' }}>{isEditingProfile ? 'Batal' : 'Kemaskini Profil'}</button>
            <button onClick={handleLogout} style={{ ...styles.button, backgroundColor: '#d9534f' }}>Log Keluar</button>
          </div>
        </header>
      )}

      {!session ? (
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img src="/iswims-logo.png" alt="i-SWIMS Logo" style={{ height: '120px' }} />
          </div>
          <form onSubmit={isRegistering ? handleRegister : handleLogin} style={styles.form}>
            {isRegistering && (
              <>
                <input type="text" placeholder="NAMA PENUH" value={nama} onChange={(e) => setNama(e.target.value.toUpperCase())} required style={styles.input} />
                <input type="text" placeholder="UKMPER" value={ukmper} onChange={(e) => setUkmper(e.target.value.toUpperCase())} required style={styles.input} />
                <select value={jawatan} onChange={(e) => setJawatan(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH JAWATAN --</option>
                  {jawatanList.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
                <input type="text" placeholder="NO. TELEFON" value={noTel} onChange={(e) => setNoTel(formatPhoneNumber(e.target.value))} required style={styles.input} />
                <select value={fakulti} onChange={(e) => { setFakulti(e.target.value); setProgramJabatan(''); }} style={styles.input}>
                  {Object.keys(programData).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={programJabatan} onChange={(e) => setProgramJabatan(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH PROGRAM / JABATAN --</option>
                  {availablePrograms.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </>
            )}
            <input type="email" placeholder="E-mel Rasmi UKM" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} required style={styles.input} />
            <input type="password" placeholder="Kata Laluan" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
            <button type="submit" disabled={loading} style={styles.button}>{loading ? 'Memproses...' : isRegistering ? 'Daftar Pengguna' : 'Log Masuk'}</button>
          </form>
          <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
            <span onClick={() => setIsRegistering(!isRegistering)} style={styles.link}>{isRegistering ? 'Log Masuk di sini' : 'Daftar Akaun'}</span>
          </p>
        </div>
      ) : (
        <div>
          {activeTab === 'HUB' && (
            <div style={styles.portalGrid}>
              <div onClick={() => handleNavigate('PENJANA', 'Penjana')} style={{ ...styles.portalCard, borderColor: '#28a745' }}>
                <div style={styles.portalIcon}>🧪</div><h3>Penjana Sisa</h3>
              </div>
              <div onClick={() => handleNavigate('JKKP', 'JKKP')} style={{ ...styles.portalCard, borderColor: '#0056b3' }}>
                <div style={styles.portalIcon}>🏢</div><h3>JKKP Bangunan</h3>
              </div>
              <div onClick={() => handleNavigate('PENYELARAS', 'Penyelaras')} style={{ ...styles.portalCard, borderColor: '#6f42c1' }}>
                <div style={styles.portalIcon}>📊</div><h3>Penyelaras BT</h3>
              </div>
              <div onClick={() => handleNavigate('ROSH', 'ROSH')} style={{ ...styles.portalCard, borderColor: '#dc3545' }}>
                <div style={styles.portalIcon}>🛡️</div><h3>ROSH UKM</h3>
              </div>
            </div>
          )}

          {activeTab === 'PENJANA' && (
            <PenjanaView session={session} profile={profile} allWasteRecords={allWasteRecords} fetchAllWasteRecords={fetchAllWasteRecords} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'JKKP' && (
            <JkkpView allWasteRecords={allWasteRecords} handleVerifyStatus={handleVerifyStatus} handlePrintSummaryPdf={handlePrintSummaryPdf} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'PENYELARAS' && (
            <PenyelarasView profile={profile} facultyWasteRecords={facultyWasteRecords} handleVerifyStatus={handleVerifyStatus} handlePrintSummaryPdf={handlePrintSummaryPdf} setActiveTab={setActiveTab} />
          )}
          {activeTab === 'ROSH' && (
            <RoshView allWasteRecords={allWasteRecords} handleVerifyStatus={handleVerifyStatus} handlePrintSummaryPdf={handlePrintSummaryPdf} setActiveTab={setActiveTab} />
          )}
        </div>
      )}
    </div>
  );
}