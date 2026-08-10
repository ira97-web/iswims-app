export function formatPhoneNumber(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 11)}`;
}

export function formatMalayDate(dateStr) {
  if (!dateStr) return '12 Ogos 2026';
  if (dateStr.includes('Februari') || dateStr.includes('Mei') || dateStr.includes('Ogos') || dateStr.includes('November')) {
    return dateStr;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const monthNames = [
    'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
    'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
  ];
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

export function calculateStorageDays(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = now - created;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

export function getQuantityText(item) {
  if (item.kod_sw === 'SW409') {
    const parts = [];
    if (item.botol_2_5l_kosong > 0) parts.push(`${item.botol_2_5l_kosong}x 2.5L Kosong`);
    if (item.botol_4_0l_kosong > 0) parts.push(`${item.botol_4_0l_kosong}x 4.0L Kosong`);
    if (item.lain_lain_kg > 0) parts.push(`${item.lain_lain_kg} kg (Lain)`);
    if (item.peralatan_kaca_kg > 0) parts.push(`${item.peralatan_kaca_kg} kg (Kaca)`);
    return parts.join(', ') || '0';
  } else {
    const parts = [];
    if (item.botol_2_5l_kimia > 0) parts.push(`${item.botol_2_5l_kimia}x 2.5L`);
    if (item.botol_4_0l_kimia > 0) parts.push(`${item.botol_4_0l_kimia}x 4.0L`);
    if (item.kilogram_kimia > 0) parts.push(`${item.kilogram_kimia} kg`);
    return parts.join(', ') || '0';
  }
}

export function calculateTotalWeightKg(recordsList) {
  return recordsList.reduce((sum, item) => {
    const b25 = (item.botol_2_5l_kimia || 0) * 2.5 + (item.botol_2_5l_kosong || 0) * 0.3;
    const b40 = (item.botol_4_0l_kimia || 0) * 4.0 + (item.botol_4_0l_kosong || 0) * 0.5;
    const kg = (item.kilogram_kimia || 0) + (item.lain_lain_kg || 0) + (item.peralatan_kaca_kg || 0);
    return sum + b25 + b40 + kg;
  }, 0);
}

export function calculateDrumsNeeded(weightKg) {
  return Math.ceil(weightKg / 200) || 0;
}

export function getStatusBadgeStyle(status) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' };
  switch (status) {
    case 'SUBMITTED':
      return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
    case 'DISAHKAN_OLEH_JKKP':
      return { ...base, backgroundColor: '#cce5ff', color: '#004085' };
    case 'DISAHKAN_OLEH_PENYELARAS':
      return { ...base, backgroundColor: '#e2d9f3', color: '#4a154b' };
    case 'DISAHKAN_OLEH_ROSH_UKM':
      return { ...base, backgroundColor: '#d4edda', color: '#155724' };
    case 'STOR_PENGUMPULAN_BERPUSAT':
      return { ...base, backgroundColor: '#d6d8d9', color: '#1b1e21' };
    case 'DIKEMBALIKAN_KE_PENJANA':
      return { ...base, backgroundColor: '#f8d7da', color: '#721c24' };
    default:
      return { ...base, backgroundColor: '#e2e3e5', color: '#383d41' };
  }
}