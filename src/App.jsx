import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// IMPORT SEMUA KOMPONEN VIEW
import HubView from './components/views/HubView';
import PenjanaView from './components/views/PenjanaView';
import JkkpView from './components/views/JkkpView';
import PenyelarasView from './components/views/PenyelarasView';
import RoshView from './components/views/RoshView';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [allWasteRecords, setAllWasteRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('HUB');
  const [loading, setLoading] = useState(true);

  // 1. SEMAK SESI PENGGUNA (AUTH) & ATUR LISTENER
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. AMBIL SEMUA REKOD SISA APABILA SESI WUJUD
  useEffect(() => {
    if (session) {
      fetchAllWasteRecords();
    }
  }, [session]);

  // 3. FUNGSI AMBIL PROFIL PENGGUNA DARI JADUAL 'profiles'
  async function fetchUserProfile(userId) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Ralat profil:', error);
      } else if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Ralat fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }

  // 4. FUNGSI AMBIL REKOD SISA & SERAP DATA PROFIL PENJANA (ENRICH)
  async function fetchAllWasteRecords() {
    try {
      // Ambil semua rekod sisa daripada 'rekod_sisa'
      const { data: wasteData, error: wasteError } = await supabase
        .from('rekod_sisa')
        .select('*')
        .order('created_at', { ascending: false });

      if (wasteError) throw wasteError;

      // Ambil semua data profil pengguna daripada 'profiles'
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Gabungkan maklumat profil Penjana Sisa secara tepat
      const enrichedRecords = (wasteData || []).map((record) => {
        const userProf = (profilesData || []).find((p) => p.id === record.user_id);

        return {
          ...record,
          // Petik Nama Penjana dari profiles
          nama_penjana: userProf?.nama || record.nama_penjana || 'Penjana Sisa',
          
          // Petik Program / Jabatan dari profiles
          program_jabatan: userProf?.program_jabatan || record.program_jabatan || '-',
          
          // Petik Bangunan dari profiles
          bangunan: userProf?.bangunan || record.bangunan || '-',
          
          // Petik Tapak Pengumpulan Sisa tepat dari profil Penjana (e.g. Parkir Bangunan Sains Kimia)
          tapak_pengumpulan: 
            userProf?.tapak_pengumpulan || 
            userProf?.tapak_pengumpulan_sisa || 
            record.tapak_pengumpulan || 
            '-',
            
          // Maklumat tambahan untuk borang cetakan
          no_tel_penjana: userProf?.no_tel || record.no_tel || '-',
          ukmper_penjana: userProf?.ukmper || record.ukmper || '-'
        };
      });

      // Simpan ke dalam state
      setAllWasteRecords(enrichedRecords);
    } catch (err) {
      console.error('Ralat mengambil rekod sisa:', err);
    }
  }

  // 5. FUNGSI PENGESAHAN STATUS (JKKP, PENYELARAS, ROSH)
  async function handleVerifyStatus(id_sisa, newStatus, catatan = null) {
    try {
      const payload = {
        status: newStatus,
        catatan_semakan: catatan
      };

      const { error } = await supabase
        .from('rekod_sisa')
        .update(payload)
        .eq('id_sisa', id_sisa);

      if (error) throw error;

      alert(`Status rekod ${id_sisa} berjaya dikemaskini kepada: ${newStatus}`);
      fetchAllWasteRecords();
    } catch (err) {
      console.error('Ralat mengemaskini status:', err);
      alert(`Gagal mengemaskini status: ${err.message}`);
    }
  }

  // 6. FUNGSI LOG KELUAR
  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setActiveTab('HUB');
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
        <h3>Memuatkan i-SWIMS UKM...</h3>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'Arial, sans-serif' }}>
      {/* PAPARKAN VIEW MENGIKUT ACTIVE TAB */}
      {activeTab === 'HUB' && (
        <HubView
          session={session}
          profile={profile}
          allWasteRecords={allWasteRecords}
          setActiveTab={setActiveTab}
          handleLogout={handleLogout}
        />
      )}

      {activeTab === 'PENJANA' && (
        <PenjanaView
          session={session}
          profile={profile}
          allWasteRecords={allWasteRecords}
          fetchAllWasteRecords={fetchAllWasteRecords}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'JKKP' && (
        <JkkpView
          allWasteRecords={allWasteRecords}
          profile={profile}
          handleVerifyStatus={handleVerifyStatus}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'PENYELARAS' && (
        <PenyelarasView
          allWasteRecords={allWasteRecords}
          profile={profile}
          handleVerifyStatus={handleVerifyStatus}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'ROSH' && (
        <RoshView
          allWasteRecords={allWasteRecords}
          profile={profile}
          handleVerifyStatus={handleVerifyStatus}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
}