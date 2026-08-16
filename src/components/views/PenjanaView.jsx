import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { siriPelupusanList, kategoriMakmalList } from '../../constants/ukmData';
import { calculateStorageDays, formatMalayDate, getQuantityText, getStatusBadgeStyle } from '../../utils/helpers';
import { styles } from '../../styles/styles';
import { handlePrintBatchRoshLabels } from '../../utils/printRoshLabel';

// ==========================================
// SENARAI STATUS TERKUNCI & PENGESAHAN JKKP
// ==========================================
const RESTRICTED_STATUSES = [
  'DISAHKAN_JKKP',
  'DISAHKAN',
  'SAH',
  'APPROVED',
  'DISAHKAN OLEH JKKP BANGUNAN',
  'DIPULANGKAN OLEH JKKP BANGUNAN',
  'DISAHKAN OLEH PENYELARAS BT',
  'DISAHKAN OLEH PENYELARAS',
  'DISAHKAN OLEH ROSH UKM',
  'DILUPUSKAN',
  'SELESAI'
];

function canModifyOrDelete(status) {
  if (!status) return true;
  const upperStatus = status.toUpperCase();
  return !RESTRICTED_STATUSES.some((restricted) => upperStatus.includes(restricted));
}

// SEMAK SAMADA REKOD TELAH DISAHKAN OLEH JKKP BANGUNAN
function isRecordApproved(status) {
  if (!status) return false;
  const upper = status.toUpperCase();
  return RESTRICTED_STATUSES.some((approved) => upper.includes(approved));
}

export default function PenjanaView({ session, profile, allWasteRecords, fetchAllWasteRecords, setActiveTab }) {
  const [loading, setLoading] = useState(false);
  const [editingWasteId, setEditingWasteId] = useState(null);
  const [sisaMakmal, setSisaMakmal] = useState('');
  const [kategoriMakmal, setKategoriMakmal] = useState('');
  const [siriPelupusan, setSiriPelupusan] = useState('');
  const [tarikhPelupusan, setTarikhPelupusan] = useState('');
  const [penjelasanKod, setPenjelasanKod] = useState('Sisa pelarut organik terpakai');

  const [selectedWasteIds, setSelectedWasteIds] = useState([]);

  const [wasteItems, setWasteItems] = useState([
    {
      id: Date.now(), kodSw: '', namaBuangan: '', botol25L: '', botol40L: '',
      kilogramKimia: '', botol25LKosong: '', botol40LKosong: '', lainLainKg: '', peralatanKacaKg: ''
    }
  ]);

  // SEMAK PERANAN PENGGUNA (JKKP BANGUNAN VS PENJANA)
  const userRole = (profile?.role || profile?.peranan || 'Penjana').toString().toUpperCase();
  const isJkkpRole = userRole.includes('JKKP');

  // TAPIS REKOD: JIKA JKKP, PAPAR SEMUA SISA DALAM BANGUNAN YANG SAMA. JIKA PENJANA, PAPAR SISA SENDIRI SAHAJA.
  const myWasteRecords = allWasteRecords.filter((r) => {
    if (isJkkpRole) {
      if (!profile?.bangunan) return true;
      return (r.bangunan || '').trim().toLowerCase() === (profile?.bangunan || '').trim().toLowerCase();
    }
    return r.user_id === session?.user?.id;
  });

  function toggleSelectWaste(id) {
    if (selectedWasteIds.includes(id)) {
      setSelectedWasteIds(selectedWasteIds.filter((item) => item !== id));
    } else {
      setSelectedWasteIds([...selectedWasteIds, id]);
    }
  }

  function toggleSelectAll() {
    if (selectedWasteIds.length === myWasteRecords.length && myWasteRecords.length > 0) {
      setSelectedWasteIds([]);
    } else {
      setSelectedWasteIds(myWasteRecords.map((r) => r.id_sisa));
    }
  }

  function handleSiriChange(newSiri) {
    setSiriPelupusan(newSiri);
    const matched = siriPelupusanList.find((s) => s.id === newSiri);
    setTarikhPelupusan(matched ? matched.isoDate : '');
  }

  function handleTarikhChange(newIsoDate) {
    setTarikhPelupusan(newIsoDate);
    const matched = siriPelupusanList.find((s) => s.isoDate === newIsoDate);
    setSiriPelupusan(matched ? matched.id : '');
  }

  function handleAddWasteItemRow() {
    setWasteItems([
      ...wasteItems,
      {
        id: Date.now() + Math.random(), kodSw: '', namaBuangan: '', botol25L: '', botol40L: '',
        kilogramKimia: '', botol25LKosong: '', botol40LKosong: '', lainLainKg: '', peralatanKacaKg: ''
      }
    ]);
  }

  function handleRemoveWasteItemRow(id) {
    if (wasteItems.length > 1) {
      setWasteItems(wasteItems.filter((item) => item.id !== id));
    }
  }

  function handleWasteItemChange(id, field, value) {
    setWasteItems(
      wasteItems.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: field === 'namaBuangan' ? value.toUpperCase() : value };
        }
        return item;
      })
    );
  }

  function resetWasteForm() {
    setEditingWasteId(null);
    setSisaMakmal('');
    setKategoriMakmal('');
    setSiriPelupusan('');
    setTarikhPelupusan('');
    setWasteItems([
      {
        id: Date.now(), kodSw: '', namaBuangan: '', botol25L: '', botol40L: '',
        kilogramKimia: '', botol25LKosong: '', botol40LKosong: '', lainLainKg: '', peralatanKacaKg: ''
      }
    ]);
  }

  function handleEditWasteItem(item) {
    if (isJkkpRole) {
      alert("Akses Terhad: Pengguna JKKP Bangunan tidak dibenarkan meminda rekod sisa Penjana.");
      return;
    }
    if (!canModifyOrDelete(item.status)) {
      alert("Tindakan tidak dibenarkan: Rekod telah diproses oleh pihak atasan. Sila hubungi Pegawai/Admin i-SWIMS untuk bantuan.");
      return;
    }

    setEditingWasteId(item.id_sisa);
    setSisaMakmal(item.nama_makmal || '');
    setKategoriMakmal(item.kategori_makmal || '');
    setSiriPelupusan(item.siri_pelupusan || '');
    setTarikhPelupusan(item.tarikh_pelupusan || '');

    setWasteItems([
      {
        id: Date.now(),
        kodSw: item.kod_sw || '',
        namaBuangan: item.nama_buangan || '',
        botol25L: item.botol_2_5l_kimia ? String(item.botol_2_5l_kimia) : '',
        botol40L: item.botol_4_0l_kimia ? String(item.botol_4_0l_kimia) : '',
        kilogramKimia: item.kilogram_kimia ? String(item.kilogram_kimia) : '',
        botol25LKosong: item.botol_2_5l_kosong ? String(item.botol_2_5l_kosong) : '',
        botol40LKosong: item.botol_4_0l_kosong ? String(item.botol_4_0l_kosong) : '',
        lainLainKg: item.lain_lain_kg ? String(item.lain_lain_kg) : '',
        peralatanKacaKg: item.peralatan_kaca_kg ? String(item.peralatan_kaca_kg) : ''
      }
    ]);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  }

  // FUNGSI HAPUS REKOD SISA
  async function handleDeleteWaste(id_sisa, status) {
    if (isJkkpRole) {
      alert("Akses Terhad: Pengguna JKKP Bangunan tidak dibenarkan memadam rekod sisa Penjana.");
      return;
    }
    if (!canModifyOrDelete(status)) {
      alert("Tindakan tidak dibenarkan: Rekod ini telah diproses oleh pihak atasan. Sila hubungi Pegawai/Admin i-SWIMS untuk bantuan.");
      return;
    }

    const confirmDelete = window.confirm(
      `Adakah anda pasti ingin menghapus rekod sisa "${id_sisa}"?\n\nTindakan ini tidak boleh dibatalkan.`
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('rekod_sisa')
        .delete()
        .eq('id_sisa', id_sisa);

      if (error) throw error;

      alert(`Rekod sisa ${id_sisa} berjaya dihapuskan.`);
      setSelectedWasteIds((prev) => prev.filter((id) => id !== id_sisa));
      if (editingWasteId === id_sisa) {
        resetWasteForm();
      }
      fetchAllWasteRecords();
    } catch (err) {
      console.error("Ralat memadam rekod sisa:", err);
      alert(`Gagal menghapus rekod: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadSds(id_sisa, file) {
    if (isJkkpRole) {
      alert("Akses Terhad: Pengguna JKKP Bangunan tidak dibenarkan memuat naik fail SDS.");
      return;
    }
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Sila muatnaik fail format PDF sahaja.');
      return;
    }

    setLoading(true);
    try {
      const fileExt = 'pdf';
      const fileName = `SDS_${id_sisa}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('sds-files')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert('Gagal muatnaik SDS. Pastikan bucket "sds-files" telah dicipta di Supabase Storage: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('sds-files')
        .getPublicUrl(fileName);

      const sdsUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase
        .from('rekod_sisa')
        .update({ sds_url: sdsUrl })
        .eq('id_sisa', id_sisa);

      if (dbError) {
        alert('Gagal simpan URL SDS: ' + dbError.message);
      } else {
        alert(`Fail SDS untuk sisa ${id_sisa} berjaya dimuatnaik! QR SDS telah dijana.`);
        fetchAllWasteRecords();
      }
    } catch (err) {
      alert('Ralat muatnaik fail: ' + err.message);
    }
    setLoading(false);
  }

  async function handleAddOrUpdateWaste(e) {
    e.preventDefault();
    if (isJkkpRole) {
      alert("Akses Terhad: Pengguna JKKP Bangunan tidak dibenarkan mendaftarkan sisa.");
      return;
    }
    setLoading(true);

    const fakultiCode = profile?.fakulti || 'FST';
    const buildingName = profile?.bangunan || '';
    const collectionSite = profile?.tapak_pengumpulan || '';

    if (editingWasteId) {
      const item = wasteItems[0];
      const payload = {
        nama_makmal: sisaMakmal,
        kategori_makmal: kategoriMakmal,
        siri_pelupusan: siriPelupusan,
        tarikh_pelupusan: tarikhPelupusan,
        kod_sw: item.kodSw,
        nama_buangan: item.namaBuangan.toUpperCase(),
        penjelasan_kod_sw: penjelasanKod,
        fakulti: fakultiCode,
        bangunan: buildingName,
        tapak_pengumpulan: collectionSite,
        status: 'DIKEMASKINI',
        catatan_semakan: null
      };

      if (item.kodSw === 'SW409') {
        payload.botol_2_5l_kosong = parseInt(item.botol25LKosong, 10) || 0;
        payload.botol_4_0l_kosong = parseInt(item.botol40LKosong, 10) || 0;
        payload.lain_lain_kg = parseFloat(item.lainLainKg) || 0;
        payload.peralatan_kaca_kg = parseFloat(item.peralatanKacaKg) || 0;
      } else {
        payload.botol_2_5l_kimia = parseInt(item.botol25L, 10) || 0;
        payload.botol_4_0l_kimia = parseInt(item.botol40L, 10) || 0;
        payload.kilogram_kimia = parseFloat(item.kilogramKimia) || 0;
      }

      const { error } = await supabase.from('rekod_sisa').update(payload).eq('id_sisa', editingWasteId);
      if (error) alert('Gagal pinda sisa: ' + error.message);
      else {
        alert(`Rekod sisa ${editingWasteId} berjaya dikemaskini!`);
        resetWasteForm();
        fetchAllWasteRecords();
      }
    } else {
      const payloads = wasteItems.map((item) => {
        const payload = {
          user_id: session.user.id,
          nama_makmal: sisaMakmal,
          kategori_makmal: kategoriMakmal,
          siri_pelupusan: siriPelupusan,
          tarikh_pelupusan: tarikhPelupusan,
          kod_sw: item.kodSw,
          nama_buangan: item.namaBuangan.toUpperCase(),
          penjelasan_kod_sw: penjelasanKod,
          fakulti: fakultiCode,
          bangunan: buildingName,
          tapak_pengumpulan: collectionSite,
          status: 'DIKEMASKINI',
          catatan_semakan: null
        };

        if (item.kodSw === 'SW409') {
          payload.botol_2_5l_kosong = parseInt(item.botol25LKosong, 10) || 0;
          payload.botol_4_0l_kosong = parseInt(item.botol40LKosong, 10) || 0;
          payload.lain_lain_kg = parseFloat(item.lainLainKg) || 0;
          payload.peralatan_kaca_kg = parseFloat(item.peralatanKacaKg) || 0;
        } else {
          payload.botol_2_5l_kimia = parseInt(item.botol25L, 10) || 0;
          payload.botol_4_0l_kimia = parseInt(item.botol40L, 10) || 0;
          payload.kilogram_kimia = parseFloat(item.kilogramKimia) || 0;
        }
        return payload;
      });

      const { error } = await supabase.from('rekod_sisa').insert(payloads);
      if (error) alert('Gagal daftar sisa: ' + error.message);
      else {
        alert(`Berjaya mendaftarkan ${payloads.length} rekod sisa!`);
        resetWasteForm();
        fetchAllWasteRecords();
      }
    }
    setLoading(false);
  }

  // FUNGSI CETAK BORANG PDF (BESERTA AUTO-GENERATE TANDATANGAN JKKP)
  function handlePrintSelectedPdf() {
    const selectedRecords = myWasteRecords.filter((r) => selectedWasteIds.includes(r.id_sisa));
    if (selectedRecords.length === 0) {
      alert('Sila tandakan (tick) sekurang-kurangnya satu sisa daripada senarai untuk dicetak.');
      return;
    }

    // SEKATAN: HALANG CETAKAN JIKA ADA REKOD BELUM DISAHKAN JKKP
    const unapproved = selectedRecords.filter((r) => !isRecordApproved(r.status));
    if (unapproved.length > 0) {
      alert(
        `Tindakan tidak dibenarkan: Terdapat ${unapproved.length} rekod sisa terpilih yang belum disahkan oleh JKKP Bangunan.\n\nBorang PDF hanya boleh dicetak setelah permohonan disahkan oleh JKKP Bangunan.`
      );
      return;
    }

    const printWindow = window.open('', '_blank');
    const firstItem = selectedRecords[0];
    const isSw409 = firstItem.kod_sw === 'SW409';
    const docCode = isSw409 ? 'UKM-SPKPPP-PT(P)07-ROSH-AK04-BO04' : 'UKM-SPKPPP-PT(P)07-ROSH-AK04-BO01';
    const docTitle = isSw409 
      ? 'BORANG RINGKASAN PELUPUSAN BOTOL KOSONG & PERALATAN KACA' 
      : 'BORANG PELUPUSAN BUANGAN TERJADUAL (SISA KIMIA)';

    const dateFormatted = formatMalayDate(firstItem.tarikh_pelupusan);
    const monthFormatted = dateFormatted.split(' ').slice(1).join(' ') || 'Ogos 2026';
    const makmalName = firstItem.nama_makmal || profile?.senarai_makmal?.[0] || 'Makmal Utama';
    const programName = firstItem.program_jabatan || profile?.program_jabatan || 'Unit Sains Kimia';
    const lokasiPengumpulan = firstItem.tapak_pengumpulan || profile?.tapak_pengumpulan || `Parkir Bangunan ${firstItem.fakulti || 'FST'}`;
    const katMakmal = firstItem.kategori_makmal || 'Makmal Pengajaran/Perkhidmatan/Instrumentasi';

    let totB25 = 0, totB40 = 0, totKg = 0, totLain = 0, totKaca = 0;
    selectedRecords.forEach((r) => {
      totB25 += (r.botol_2_5l_kimia || r.botol_2_5l_kosong || 0);
      totB40 += (r.botol_4_0l_kimia || r.botol_4_0l_kosong || 0);
      totKg += (r.kilogram_kimia || 0);
      totLain += (r.lain_lain_kg || 0);
      totKaca += (r.peralatan_kaca_kg || 0);
    });

    // TANDATANGAN DIGITAL PENJANA
    const signatureElement = profile?.tandatangan_base64 
      ? `<img src="${profile.tandatangan_base64}" style="height: 45px; max-width: 140px; object-fit: contain; vertical-align: middle;" />`
      : `___________________________`;

    // TANDATANGAN DIGITAL JKKP BANGUNAN (AUTO-GENERATED)
    const jkkpSigElement = firstItem.jkkp_tandatangan 
      ? `<img src="${firstItem.jkkp_tandatangan}" style="height: 45px; max-width: 140px; object-fit: contain; vertical-align: middle;" />`
      : `___________________________`;

    const htmlContent = `
<html>
<head>
<title>${docTitle} - ${selectedRecords.length} Item</title>
<style>
body { font-family: Arial, sans-serif; padding: 20px; color: #000; font-size: 12px; line-height: 1.4; }
.rosh-header-box { width: 100%; border-collapse: collapse; border: 2px solid #555; background-color: #dcd8c0; margin-bottom: 15px; }
.rosh-header-box td { border: 2px solid #555; padding: 6px 10px; vertical-align: middle; }
.logo-cell { width: 25%; background-color: #ffffff; text-align: center; padding: 8px !important; }
.doc-code-cell { width: 45%; font-weight: bold; font-size: 13px; color: #000; }
.effective-date-cell { width: 30%; font-weight: bold; font-size: 12px; color: #000; }
.effective-date-cell span { color: #0056b3; }
.doc-title-cell { font-weight: bold; font-size: 13px; color: #000; text-transform: uppercase; }
.attention-text { font-weight: bold; font-size: 13px; margin-bottom: 15px; text-transform: uppercase; }
.meta-table { width: 100%; margin-bottom: 15px; font-size: 12px; line-height: 1.6; }
.meta-table td { padding: 2px 0; vertical-align: top; }
.meta-label { font-weight: bold; width: 260px; }
table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
table.data-table th, table.data-table td { border: 1px solid #000; padding: 6px 8px; text-align: center; font-size: 11px; }
table.data-table th { background-color: #f2f2f2; font-weight: bold; }
.verification-box { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-top: 30px; }
.verification-box td { width: 50%; border-right: 2px solid #000; padding: 12px 15px; vertical-align: top; font-size: 12px; line-height: 1.8; }
.verification-box td:last-child { border-right: none; }
.sig-line-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.sig-line-table td { border: none !important; padding: 2px 0 !important; }
.sig-line-label { font-weight: bold; width: 95px; }
</style>
</head>
<body>
<table class="rosh-header-box">
<tr>
<td rowspan="2" class="logo-cell">
<img src="/ukm-logo.png" id="ukmLogoImg" alt="UKM Logo" style="height: 52px; width: auto; object-fit: contain;" />
</td>
<td class="doc-code-cell">${docCode}</td>
<td class="effective-date-cell">Tarikh Kuat kuasa: <span>01/01/2025</span></td>
</tr>
<tr>
<td colspan="2" class="doc-title-cell">${docTitle}</td>
</tr>
</table>

${!isSw409 ? '<div class="attention-text">PERHATIAN: SALINAN INI UNTUK SIMPANAN MAKMAL</div>' : ''}

<table class="meta-table">
${isSw409 ? `<tr><td class="meta-label">Kod Buangan Terjadual</td><td>: SW409</td></tr>` : ''}
<tr>
<td class="meta-label">
Inventori Buangan Terjadual Bulan<br/>
<span style="font-style: italic; font-weight: normal; font-size: 10px; color: #333;">(dilengkapkan mengikut bulan bagi setiap makmal)</span>
</td>
<td style="vertical-align: top;">: ${monthFormatted}</td>
</tr>
<tr><td class="meta-label">Tarikh Pelupusan</td><td>: ${dateFormatted}</td></tr>
<tr><td class="meta-label">Makmal</td><td>: ${makmalName}</td></tr>
<tr><td class="meta-label">Program/ Jabatan</td><td>: ${programName}</td></tr>
<tr><td class="meta-label">Fakulti/ Institut/ Pusat</td><td>: ${firstItem.fakulti || profile?.fakulti || 'FST'}</td></tr>
<tr><td class="meta-label">Lokasi Pengumpulan</td><td>: ${lokasiPengumpulan}</td></tr>
<tr>
<td class="meta-label">Kategori Makmal <span style="color: #0056b3; font-style: italic;">(Sila tandakan)</span></td>
<td>: ${katMakmal}</td>
</tr>
</table>

${isSw409 ? `
<table class="data-table">
<thead>
<tr>
<th rowspan="2" style="width: 40px;">BIL.</th>
<th colspan="4">KUANTITI</th>
</tr>
<tr>
<th>Botol saiz 2.5 L</th>
<th>Botol saiz 4 L</th>
<th>Lain-lain Bekas (Kilogram (kg))</th>
<th>Peralatan Kaca (Kilogram (kg))</th>
</tr>
</thead>
<tbody>
${selectedRecords.map((r, idx) => `
<tr>
<td>${idx + 1}</td>
<td>${(r.botol_2_5l_kosong || 0).toFixed(2)}</td>
<td>${(r.botol_4_0l_kosong || 0).toFixed(2)}</td>
<td>${(r.lain_lain_kg || 0).toFixed(2)}</td>
<td>${(r.peralatan_kaca_kg || 0).toFixed(2)}</td>
</tr>
`).join('')}
<tr style="font-weight: bold; background-color: #fafafa;">
<td>JUMLAH</td>
<td>${totB25.toFixed(2)}</td>
<td>${totB40.toFixed(2)}</td>
<td>${totLain.toFixed(2)}</td>
<td>${totKaca.toFixed(2)}</td>
</tr>
</tbody>
</table>
` : `
<table class="data-table">
<thead>
<tr>
<th rowspan="2" style="width: 40px;">BIL.</th>
<th rowspan="2">NAMA KOD BUANGAN & NAMA BAHAN KIMIA</th>
<th rowspan="2" style="width: 100px;">KOD BUANGAN</th>
<th colspan="3">KUANTITI</th>
</tr>
<tr>
<th style="width: 90px;">Botol saiz 2.5 L</th>
<th style="width: 90px;">Botol saiz 4 L</th>
<th style="width: 90px;">Kilogram (kg)</th>
</tr>
</thead>
<tbody>
${selectedRecords.map((r, idx) => `
<tr>
<td>${idx + 1}</td>
<td style="text-align: left;">${r.nama_buangan || '-'}</td>
<td>${r.kod_sw}</td>
<td>${(r.botol_2_5l_kimia || 0).toFixed(2)}</td>
<td>${(r.botol_4_0l_kimia || 0).toFixed(2)}</td>
<td>${(r.kilogram_kimia || 0).toFixed(2)}</td>
</tr>
`).join('')}
<tr style="font-weight: bold; background-color: #fafafa;">
<td colspan="3" style="text-align: right; padding-right: 15px;">JUMLAH</td>
<td>${totB25.toFixed(2)}</td>
<td>${totB40.toFixed(2)}</td>
<td>${totKg.toFixed(2)}</td>
</tr>
</tbody>
</table>
`}

<table class="verification-box">
<tr>
<td>
<strong style="font-size: 13px;">Disediakan oleh:</strong>
<table class="sig-line-table">
<tr><td class="sig-line-label">Tandatangan</td><td>: ${signatureElement}</td></tr>
<tr><td class="sig-line-label">Nama</td><td>: <strong>${profile?.nama || '-'}</strong></td></tr>
<tr><td class="sig-line-label">UKM (Per)</td><td>: <strong>${profile?.ukmper || '-'}</strong></td></tr>
<tr><td class="sig-line-label">Jawatan</td><td>: <strong>${profile?.jawatan || '-'}</strong></td></tr>
<tr><td class="sig-line-label">No. Tel.</td><td>: <strong>${profile?.no_tel || '-'}</strong></td></tr>
</table>
</td>
<td>
<strong style="font-size: 13px;">Disahkan oleh (JKKP Bangunan):</strong>
<table class="sig-line-table">
<tr><td class="sig-line-label">Tandatangan</td><td>: ${jkkpSigElement}</td></tr>
<tr><td class="sig-line-label">Nama</td><td>: <strong>${firstItem.jkkp_nama || '-'}</strong></td></tr>
<tr><td class="sig-line-label">UKM (Per)</td><td>: <strong>${firstItem.jkkp_ukmper || '-'}</strong></td></tr>
<tr><td class="sig-line-label">Jawatan</td><td>: <strong>${firstItem.jkkp_jawatan || '-'}</strong></td></tr>
<tr><td class="sig-line-label">No. Tel.</td><td>: <strong>${firstItem.jkkp_no_tel || '-'}</strong></td></tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    const img = printWindow.document.getElementById('ukmLogoImg');
    if (img) {
      img.onload = () => { printWindow.focus(); printWindow.print(); };
      img.onerror = () => { printWindow.focus(); printWindow.print(); };
    } else {
      printWindow.focus(); printWindow.print();
    }
  }

  // FUNGSI CETAK LABEL ROSH (DENGAN SEKATAN REKOD UNAPPROVED)
  function handlePrintSelectedLabels() {
    const selectedRecords = myWasteRecords.filter((r) => selectedWasteIds.includes(r.id_sisa));
    if (selectedRecords.length === 0) {
      alert('Sila tandakan (tick) sekurang-kurangnya satu sisa daripada senarai untuk mencetak label.');
      return;
    }

    // SEKATAN: HALANG CETAKAN LABEL JIKA ADA REKOD BELUM DISAHKAN JKKP
    const unapproved = selectedRecords.filter((r) => !isRecordApproved(r.status));
    if (unapproved.length > 0) {
      alert(
        `Tindakan tidak dibenarkan: Terdapat ${unapproved.length} rekod sisa terpilih yang belum disahkan oleh JKKP Bangunan.\n\nLabel ROSH hanya boleh dicetak setelah permohonan disahkan oleh JKKP Bangunan.`
      );
      return;
    }

    handlePrintBatchRoshLabels(selectedRecords, profile);
  }

  return (
    <div>
      <div style={styles.pageTitleBar}>
        <h2>🧪 Halaman Penjana Sisa</h2>
        <button onClick={() => setActiveTab('HUB')} style={styles.backButton}>← Kembali ke Papan Pemuka</button>
      </div>

      {/* FORM SECTION (DISEMBUNYIKAN UNTUK JKKP BANGUNAN) */}
      {isJkkpRole ? (
        <div style={{ ...styles.card, backgroundColor: '#f0f9ff', border: '1px solid #0284c7' }}>
          <h3 style={{ margin: 0, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> Mod Paparan Sahaja (JKKP Bangunan)
          </h3>
          <p style={{ margin: '8px 0 0 0', color: '#0369a1', fontSize: '13px', lineHeight: '1.5' }}>
            Sebagai pegawai <strong>JKKP Bangunan ({profile?.bangunan || 'Semua Bangunan'})</strong>, anda hanya dibenarkan melihat dan memantau rekod sisa yang didaftarkan oleh Penjana Sisa di bawah bangunan anda. Anda tidak dibenarkan menambah atau mengemas kini borang di halaman ini.
          </p>
        </div>
      ) : (
        <div style={styles.card}>
          <h3>{editingWasteId ? `Kemaskini Sisa (${editingWasteId})` : 'Borang Pendaftaran Sisa Terjadual'}</h3>
          {editingWasteId && (
            <p style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px' }}>
              Sila kemaskini makmal, kod SW, nama bahan, atau kuantiti dan tekan Hantar Pembetulan Rekod.
            </p>
          )}

          <form onSubmit={handleAddOrUpdateWaste} style={styles.form}>
            <div style={styles.gridFour}>
              <div>
                <label style={styles.label}>Makmal Sumber Sisa</label>
                <select value={sisaMakmal} onChange={(e) => setSisaMakmal(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH MAKMAL SUMBER --</option>
                  {(profile?.senarai_makmal || []).map((m, idx) => (
                    m ? <option key={idx} value={m}>{m}</option> : null
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Kategori Makmal</label>
                <select value={kategoriMakmal} onChange={(e) => setKategoriMakmal(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH KATEGORI MAKMAL --</option>
                  {kategoriMakmalList.map((kat) => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Siri Pelupusan</label>
                <select value={siriPelupusan} onChange={(e) => handleSiriChange(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH SIRI --</option>
                  {siriPelupusanList.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Tarikh Pelupusan</label>
                <select value={tarikhPelupusan} onChange={(e) => handleTarikhChange(e.target.value)} required style={styles.input}>
                  <option value="">-- PILIH TARIKH --</option>
                  {siriPelupusanList.map((s) => (
                    <option key={s.isoDate} value={s.isoDate}>{s.date}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: '#0056b3' }}>🧪 Senarai Bahan / Sisa Kimia ({wasteItems.length} Item)</h4>
                {!editingWasteId && (
                  <button type="button" onClick={handleAddWasteItemRow} style={{ ...styles.button, backgroundColor: '#28a745', padding: '6px 12px', fontSize: '13px' }}>
                    + Tambah Bahan Sisa
                  </button>
                )}
              </div>

              {wasteItems.map((item, idx) => (
                <div key={item.id} style={{ backgroundColor: '#f8f9fa', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#4a5568' }}>Item #{idx + 1}</span>
                    {wasteItems.length > 1 && !editingWasteId && (
                      <button type="button" onClick={() => handleRemoveWasteItemRow(item.id)} style={{ ...styles.smallButton, backgroundColor: '#dc3545' }}>
                        ✕ Padam Item
                      </button>
                    )}
                  </div>

                  <div style={styles.gridTwo}>
                    <div>
                      <label style={styles.label}>Kod SW</label>
                      <select value={item.kodSw} onChange={(e) => handleWasteItemChange(item.id, 'kodSw', e.target.value)} required style={styles.input}>
                        <option value="">-- PILIH KOD SW --</option>
                        <option value="SW103">SW103 - Buangan Bateri Kadmium/Nikel/Raksa</option>
                        <option value="SW109">SW109 - Buangan Mengandungi Raksa</option>
                        <option value="SW206">SW206 - Asid Tidak Organik Terpakai</option>
                        <option value="SW301">SW301 - Asid Organik Terpakai (pH ≤ 2)</option>
                        <option value="SW305">SW305 - Minyak Pelincir Terpakai</option>
                        <option value="SW320">SW320 - Buangan Mengandungi Formaldehid</option>
                        <option value="SW322">SW322 - Buangan Pelarut Organik Bukan Terhalogen</option>
                        <option value="SW323">SW323 - Buangan Pelarut Organik Terhalogen</option>
                        <option value="SW402">SW402 - Alkali Terpakai With pH ≥ 11.5</option>
                        <option value="SW405">SW405 - Buangan Farmaseutikal</option>
                        <option value="SW409">SW409 - Bekas, Beg atau Kelengkapan Tercemar / Peralatan Kaca</option>
                        <option value="SW410">SW410 - Bahan Tercemar: Kain, Plastik, Sarung Tangan</option>
                        <option value="SW421">SW421 - Campuran Buangan Terjadual</option>
                        <option value="SW422">SW422 - Campuran Buangan Terjadual dan Tidak Terjadual</option>
                        <option value="SW423">SW423 - Larutan Pemprosesan Terpakai / Fotografi</option>
                        <option value="SW430">SW430 - Bahan Kimia Makmal Usang</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Nama Bahan / Sisa Kimia</label>
                      <input type="text" placeholder="e.g. TRIS(2-AMINOETHYL)AMINE" value={item.namaBuangan} onChange={(e) => handleWasteItemChange(item.id, 'namaBuangan', e.target.value)} required style={{ ...styles.input, textTransform: 'uppercase' }} />
                    </div>
                  </div>

                  {item.kodSw === 'SW409' ? (
                    <div style={{ ...styles.gridFour, marginTop: '8px' }}>
                      <div><label style={styles.label}>Botol 2.5L Kosong</label><input type="number" min="0" placeholder="0" value={item.botol25LKosong} onChange={(e) => handleWasteItemChange(item.id, 'botol25LKosong', e.target.value)} style={styles.input} /></div>
                      <div><label style={styles.label}>Botol 4.0L Kosong</label><input type="number" min="0" placeholder="0" value={item.botol40LKosong} onChange={(e) => handleWasteItemChange(item.id, 'botol40LKosong', e.target.value)} style={styles.input} /></div>
                      <div><label style={styles.label}>Lain-lain (Kg)</label><input type="number" step="0.01" min="0" placeholder="0.00" value={item.lainLainKg} onChange={(e) => handleWasteItemChange(item.id, 'lainLainKg', e.target.value)} style={styles.input} /></div>
                      <div><label style={styles.label}>Peralatan Kaca (Kg)</label><input type="number" step="0.01" min="0" placeholder="0.00" value={item.peralatanKacaKg} onChange={(e) => handleWasteItemChange(item.id, 'peralatanKacaKg', e.target.value)} style={styles.input} /></div>
                    </div>
                  ) : (
                    <div style={{ ...styles.gridThree, marginTop: '8px' }}>
                      <div><label style={styles.label}>Botol 2.5L (Kimia)</label><input type="number" min="0" placeholder="0" value={item.botol25L} onChange={(e) => handleWasteItemChange(item.id, 'botol25L', e.target.value)} style={styles.input} /></div>
                      <div><label style={styles.label}>Botol 4.0L (Kimia)</label><input type="number" min="0" placeholder="0" value={item.botol40L} onChange={(e) => handleWasteItemChange(item.id, 'botol40L', e.target.value)} style={styles.input} /></div>
                      <div><label style={styles.label}>Berat (Kilogram)</label><input type="number" step="0.01" min="0" placeholder="0.00" value={item.kilogramKimia} onChange={(e) => handleWasteItemChange(item.id, 'kilogramKimia', e.target.value)} style={styles.input} /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" disabled={loading} style={{ ...styles.button, backgroundColor: '#28a745', flex: 1 }}>
                {loading ? 'Memproses...' : editingWasteId ? 'Hantar Pembetulan Rekod' : `Hantar ${wasteItems.length} Rekod Sisa`}
              </button>
              {editingWasteId && (
                <button type="button" onClick={resetWasteForm} style={{ ...styles.button, backgroundColor: '#6c757d', width: 'auto' }}>Batal</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* MONITORING TABLE CARD */}
      <div style={{ ...styles.card, marginTop: '20px' }}>
        <h3>
          {isJkkpRole 
            ? `Status Pemantauan Sisa Bangunan (${profile?.bangunan || 'Semua Bangunan'})` 
            : 'Status Pemantauan Sisa Peribadi'}
        </h3>
        {myWasteRecords.length === 0 ? (
          <p style={{ color: '#666' }}>
            {isJkkpRole 
              ? `Tiada rekod sisa didaftarkan di bawah bangunan ${profile?.bangunan || 'anda'} lagi.` 
              : 'Tiada rekod sisa didaftarkan oleh anda lagi.'}
          </p>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ ...styles.th, width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={myWasteRecords.length > 0 && selectedWasteIds.length === myWasteRecords.length} 
                        onChange={toggleSelectAll} 
                        title="Pilih Semua Sisa"
                      />
                    </th>
                    <th style={styles.th}>ID Sisa</th>
                    {isJkkpRole && <th style={styles.th}>Penjana Sisa</th>}
                    <th style={styles.th}>Makmal</th>
                    <th style={styles.th}>Kod SW</th>
                    <th style={styles.th}>Nama Bahan</th>
                    <th style={styles.th}>Kuantiti</th>
                    <th style={styles.th}>Tempoh Simpanan</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Pinda / Tindakan</th>
                    <th style={styles.th}>Status & Muatnaik SDS</th>
                  </tr>
                </thead>
                <tbody>
                  {myWasteRecords.map((item) => {
                    const daysElapsed = calculateStorageDays(item.created_at);
                    const isChecked = selectedWasteIds.includes(item.id_sisa);
                    const isSw430 = item.kod_sw === 'SW430';
                    const isEditableOrDeletable = canModifyOrDelete(item.status);

                    return (
                      <tr key={item.id || item.id_sisa} style={{ borderBottom: '1px solid #eee', backgroundColor: isChecked ? '#f0f7ff' : '#fff' }}>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => toggleSelectWaste(item.id_sisa)} 
                          />
                        </td>
                        <td style={styles.td}><strong>{item.id_sisa}</strong></td>
                        {isJkkpRole && (
                          <td style={styles.td}>
                            <div><strong>{item.nama_penjana || 'Penjana'}</strong></div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{item.program_jabatan || '-'}</div>
                          </td>
                        )}
                        <td style={styles.td}>{item.nama_makmal || '-'}</td>
                        <td style={styles.td}>{item.kod_sw}</td>
                        <td style={styles.td}>{item.nama_buangan}</td>
                        <td style={styles.td}>{getQuantityText(item)}</td>
                        <td style={styles.td}>
                          {daysElapsed > 180 ? (
                            <span style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>⚠️ {daysElapsed} Hari (&gt;180 Hari)</span>
                          ) : daysElapsed > 150 ? (
                            <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>⚠️ {daysElapsed} Hari</span>
                          ) : (
                            <span style={{ fontWeight: 'bold', color: '#212529' }}>{daysElapsed} Hari</span>
                          )}
                        </td>

                        {/* PINDA / HAPUS COLUMN */}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          {isJkkpRole ? (
                            <span 
                              style={{ fontSize: '11px', color: '#0284c7', fontWeight: 'bold', backgroundColor: '#e0f2fe', padding: '4px 8px', borderRadius: '4px' }}
                              title="Mod paparan sahaja untuk JKKP Bangunan."
                            >
                              👁️ Paparan Sahaja
                            </span>
                          ) : isEditableOrDeletable ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleEditWasteItem(item)} 
                                style={{ ...styles.smallButton, backgroundColor: '#ffc107', color: '#000' }}
                                title="Pinda Rekod"
                              >
                                ✏️ Pinda
                              </button>
                              <button 
                                onClick={() => handleDeleteWaste(item.id_sisa, item.status)} 
                                style={{ ...styles.smallButton, backgroundColor: '#dc3545', color: '#fff' }}
                                title="Hapus Rekod"
                              >
                                🗑️ Hapus
                              </button>
                            </div>
                          ) : (
                            <span 
                              style={{ fontSize: '11px', color: '#6c757d', fontWeight: 'bold', backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px' }}
                              title="Rekod telah diproses dan tidak boleh dihapus/dipinda. Sila hubungi Pegawai i-SWIMS."
                            >
                              🔒 Terkunci
                            </span>
                          )}
                        </td>

                        {/* STATUS & SDS UPLOAD BOX COLUMN */}
                        <td style={styles.td}>
                          <span style={getStatusBadgeStyle(item.status)}>{item.status}</span>
                          {item.catatan_semakan && <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px' }}>Catatan: {item.catatan_semakan}</div>}

                          {/* SPECIAL UPLOAD BOX FOR SW430 */}
                          {isSw430 && (
                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#eef6ff', border: '1px dashed #0056b3', borderRadius: '6px', fontSize: '11px' }}>
                              <div style={{ fontWeight: 'bold', color: '#0056b3', marginBottom: '4px' }}>📄 Muatnaik SDS (SW430)</div>
                              {item.sds_url ? (
                                <div>
                                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ SDS Dimuatnaik</span>
                                  <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                                    <a href={item.sds_url} target="_blank" rel="noreferrer" style={{ color: '#0056b3', textDecoration: 'underline' }}>Lihat SDS</a>
                                    {!isJkkpRole && (
                                      <label style={{ color: '#dc3545', cursor: 'pointer', textDecoration: 'underline' }}>
                                        Tukar
                                        <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleUploadSds(item.id_sisa, e.target.files[0])} />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                !isJkkpRole && (
                                  <input 
                                    type="file" 
                                    accept="application/pdf" 
                                    onChange={(e) => handleUploadSds(item.id_sisa, e.target.files[0])}
                                    style={{ fontSize: '10px', width: '100%' }}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BOTTOM ACTION BAR FOR TICKED ITEMS */}
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eef2f7', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                📌 Terpilih: <span style={{ color: '#0056b3' }}>{selectedWasteIds.length}</span> daripada {myWasteRecords.length} rekod sisa
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handlePrintSelectedPdf} 
                  style={{ ...styles.button, backgroundColor: '#0056b3', padding: '8px 14px', fontSize: '13px' }}
                >
                  📄 Cetak Borang PDF (Pilihan)
                </button>

                <button 
                  onClick={handlePrintSelectedLabels} 
                  style={{ ...styles.button, backgroundColor: '#17a2b8', padding: '8px 14px', fontSize: '13px' }}
                >
                  🏷️ Cetak Label ROSH (4 Label / Muka Surat A4)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}