import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { styles } from './styles/styles';
import { formatPhoneNumber, calculateStorageDays, getQuantityText } from './utils/helpers';
import { jawatanList, programData, makmalData, lokasiData } from './constants/ukmData';

import HubView from './components/views/HubView';
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

  // Auth Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Extended Profile State
  const [nama, setNama] = useState('');
  const [ukmper, setUkmper] = useState('');
  const [jawatan, setJawatan] = useState('');
  const [noTel, setNoTel] = useState('');
  const [fakulti, setFakulti] = useState('');
  const [programJabatan, setProgramJabatan] = useState('');
  const [senaraiMakmal, setSenaraiMakmal] = useState(['']);
  const [tapakPengumpulan, setTapakPengumpulan] = useState('');
  const [role, setRole] = useState('');
  const [tandatangan, setTandatangan] = useState('');
  
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
      if (data.tandatangan_base64) setTandatangan(data.tandatangan_base64);
    }
  }

  async function fetchAllWasteRecords() {
    const { data, error } = await supabase.from('rekod_sisa').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setAllWasteRecords(data || []);
  }

  function handleFakultiChange(newFakulti) {
    setFakulti(newFakulti);
    setProgramJabatan('');
    setSenaraiMakmal(['']);
    setTapakPengumpulan('');
  }

  function handleProgramChange(newProgram) {
    setProgramJabatan(newProgram);
    setSenaraiMakmal(['']);
  }

  function handleMakmalChange(index, value) {
    const updated = [...senaraiMakmal];
    updated[index] = value;
    setSenaraiMakmal(updated);
  }

  function handleAddMakmalSlot() {
    if (senaraiMakmal.length < 5) {
      setSenaraiMakmal([...senaraiMakmal, '']);
    }
  }

  function handleRemoveMakmalSlot(index) {
    if (senaraiMakmal.length > 1) {
      const updated = senaraiMakmal.filter((_, idx) => idx !== index);
      setSenaraiMakmal(updated);
    }
  }

  function handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('Saiz fail tandatangan mestilah bawah 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTandatangan(reader.result);
      };
      reader.readAsDataURL(file);
    }
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
    if (error) alert('Log masuk gagal: ' + error.message);
    else if (data?.session) {
      await fetchProfile(data.session.user.id);
      await fetchAllWasteRecords();
    }
    setLoading(false);
  }

  // SHORTENED REGISTRATION HANDLER
  async function handleRegister(e) {
    e.preventDefault();
    if (!role) {
      alert('Sila pilih Peranan Pengguna terlebih dahulu.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Kata laluan dan pengesahan kata laluan tidak padan!');
      return;
    }

    setLoading(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password
    });

    if (authError) {
      alert('Pendaftaran gagal: ' + authError.message);
    } else if (authData?.user) {
      await supabase.from('profiles').upsert([{
        id: authData.user.id,
        email: email.toLowerCase(),
        role: role
      }]);
      alert('Akaun berjaya didaftarkan! Sila log masuk dan kemaskini profil anda.');
      setIsRegistering(false);
      setPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!session?.user) return;
    setLoading(true);
    const validMakmalList = senaraiMakmal.filter((m) => m.trim() !== '');
    const { error } = await supabase.from('profiles').upsert([{
      id: session.user.id,
      email: session.user.email.toLowerCase(),
      nama: nama.toUpperCase(),
      ukmper: ukmper.toUpperCase(),
      jawatan,
      no_tel: formatPhoneNumber(noTel),
      fakulti,
      program_jabatan: programJabatan,
      senarai_makmal: validMakmalList,
      tapak_pengumpulan: tapakPengumpulan,
      role,
      tandatangan_base64: tandatangan
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

      {/* PUBLIC NAVBAR */}
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

      {/* SUB-VIEW HEADER */}
      {session && activeTab !== 'HUB' && (
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
            <button onClick={() => setActiveTab('HUB')} style={{ ...styles.button, backgroundColor: '#6c757d' }}>🏠 Papan Pemuka</button>
            <button onClick={() => setIsEditingProfile(!isEditingProfile)} style={{ ...styles.button, backgroundColor: '#17a2b8' }}>{isEditingProfile ? 'Batal' : 'Kemaskini Profil'}</button>
            <button onClick={handleLogout} style={{ ...styles.button, backgroundColor: '#d9534f' }}>Log Keluar</button>
          </div>
        </header>
      )}

      {/* EDIT PROFILE FORM CARD */}
      {session && isEditingProfile && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#0056b3' }}>✏️ Kemaskini Profil & Makmal Pengurusan</h3>
          <form onSubmit={handleSaveProfile} style={styles.form}>
            <div style={styles.gridTwo}>
              <div>
                <label style={styles.label}>Nama Penuh</label>
                <input type="text" value={nama} onChange={(e) => setNama(e.target.value.toUpperCase())} required style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>UKMPer / No. Matrik</label>
                <input type="text" value={ukmper} onChange={(e) => setUkmper(e.target.value.toUpperCase())} required style={styles.input} />
              </div>
            </div>

            <div style={styles.gridTwo}>
              <div>
                <label style={styles.label}>Jawatan</label>
                <select value={jawatan} onChange={(e) => setJawatan(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH JAWATAN --</option>
                  {jawatanList.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>No. Telefon</label>
                <input type="text" value={noTel} onChange={(e) => setNoTel(formatPhoneNumber(e.target.value))} required style={styles.input} />
              </div>
            </div>

            <div style={styles.gridTwo}>
              <div>
                <label style={styles.label}>Fakulti / Institusi / Pusat</label>
                <select value={fakulti} onChange={(e) => handleFakultiChange(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH FAKULTI --</option>
                  {Object.keys(programData).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Program / Jabatan / Unit</label>
                <select value={programJabatan} onChange={(e) => handleProgramChange(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH PROGRAM / JABATAN --</option>
                  {availablePrograms.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...styles.label, margin: 0 }}>🧪 Senarai Makmal Penyeliaan (Maksimum 5 Makmal)</label>
                {senaraiMakmal.length < 5 && (
                  <button type="button" onClick={handleAddMakmalSlot} style={{ ...styles.smallButton, backgroundColor: '#28a745' }}>+ Tambah Makmal</button>
                )}
              </div>
              {senaraiMakmal.map((labVal, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select value={labVal} onChange={(e) => handleMakmalChange(idx, e.target.value)} required={idx === 0} style={styles.input}>
                    <option value="">-- PILIH MAKMAL {idx + 1} --</option>
                    {availableLabs.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {senaraiMakmal.length > 1 && (
                    <button type="button" onClick={() => handleRemoveMakmalSlot(idx)} style={{ ...styles.smallButton, backgroundColor: '#dc3545' }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div style={styles.gridTwo}>
              <div>
                <label style={styles.label}>Tapak Pengumpulan Sisa</label>
                <select value={tapakPengumpulan} onChange={(e) => setTapakPengumpulan(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH TAPAK PENGUMPULAN --</option>
                  {availableLocations.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={styles.label}>Peranan Pengguna</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH PERANAN --</option>
                  <option value="Penjana">Penjana Sisa (Lab User)</option>
                  <option value="JKKP">JKKP Bangunan</option>
                  <option value="Penyelaras">Penyelaras BT</option>
                  <option value="ROSH">ROSH-UKM Admin</option>
                </select>
              </div>
            </div>

            <div style={{ backgroundColor: '#eef2f5', padding: '12px', borderRadius: '6px', border: '1px solid #ced4da' }}>
              <label style={styles.label}>🖋️ Muat Naik Tandatangan Digital (PNG / JPG, Bawah 1MB)</label>
              <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleSignatureUpload} style={styles.input} />
              {tandatangan && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>Pratonton Tandatangan Current:</span>
                  <img src={tandatangan} alt="Digital Signature Preview" style={{ height: '50px', border: '1px solid #ccc', backgroundColor: '#fff', padding: '4px', borderRadius: '4px' }} />
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.button, backgroundColor: '#28a745' }}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </form>
        </div>
      )}

      {/* LOGIN & STREAMLINED REGISTRATION FORM */}
      {!session ? (
        <div style={styles.loginCard}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img src="/iswims-logo.png" alt="i-SWIMS Logo" style={{ height: '110px' }} />
            <h3 style={{ margin: '10px 0 0 0', color: '#0f172a' }}>
              {isRegistering ? 'Daftar Akaun Baru' : 'Log Masuk i-SWIMS'}
            </h3>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} style={styles.form}>
            {isRegistering ? (
              <>
                <div>
                  <label style={styles.label}>Pilih Peranan Pengguna</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required style={styles.input}>
                    <option value="">-- PILIH PERANAN --</option>
                    <option value="Penjana">Penjana Sisa (Penyelia / Staf Makmal)</option>
                    <option value="JKKP">JKKP Bangunan</option>
                    <option value="Penyelaras">Penyelaras BT</option>
                    <option value="ROSH">ROSH-UKM Admin</option>
                  </select>
                </div>

                <div>
                  <label style={styles.label}>E-mel Rasmi UKM</label>
                  <input
                    type="email"
                    placeholder="e.g. user@ukm.edu.my"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    required
                    style={{ ...styles.input, textTransform: 'lowercase' }}
                  />
                </div>

                <div>
                  <label style={styles.label}>Cipta Kata Laluan</label>
                  <input
                    type="password"
                    placeholder="Masukkan kata laluan"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>Sahkan Kata Laluan</label>
                  <input
                    type="password"
                    placeholder="Sahkan kata laluan sekali lagi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>
              </>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="E-mel Rasmi UKM (lowercase)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  style={{ ...styles.input, textTransform: 'lowercase' }}
                />
                <input
                  type="password"
                  placeholder="Kata Laluan"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                />
              </>
            )}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Memproses...' : isRegistering ? 'Daftar Akaun' : 'Log Masuk'}
            </button>
          </form>

          <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '13px' }}>
            {isRegistering ? 'Sudah ada akaun?' : 'Belum ada akaun?'}{' '}
            <span 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setPassword('');
                setConfirmPassword('');
              }} 
              style={styles.link}
            >
              {isRegistering ? 'Log Masuk di sini' : 'Daftar Akaun Baru'}
            </span>
          </p>
        </div>
      ) : (
        <div>
          {/* PORTAL ROUTER */}
          {activeTab === 'HUB' && (
            <HubView
              session={session}
              profile={profile}
              allWasteRecords={allWasteRecords}
              setActiveTab={setActiveTab}
              handleLogout={handleLogout}
              setShowProfileModal={setIsEditingProfile}
              handleNavigate={handleNavigate}
            />
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