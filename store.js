// 쓰기 저장소: WRITE_URL이 있으면 Supabase, 없으면 이 브라우저에만 저장(시연 모드)
import { C, ls, uid } from './util.js?v=20261010d';

export const isDemo = !C.WRITE_URL || !C.WRITE_KEY;

async function api(method, path, body) {
  const res = await fetch(`${C.WRITE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: C.WRITE_KEY, ...(C.WRITE_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${C.WRITE_KEY}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store'
  });
  if (!res.ok) throw new Error(`저장 실패 (${res.status}) ${await res.text().catch(() => '')}`);
  return res.status === 204 ? null : res.json();
}

const local = {
  list(t) { return ls.get('rc.db.' + t, []); },
  save(t, v) { ls.set('rc.db.' + t, v); }
};

export const store = {
  async list(table, query = '') {
    if (isDemo) return local.list(table).slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return api('GET', `${table}?select=*&order=created_at.desc${query}`);
  },
  async insert(table, row) {
    const r = { id: uid(), created_at: new Date().toISOString(), ...row };
    if (isDemo) { const all = local.list(table); all.push(r); local.save(table, all); return r; }
    const out = await api('POST', table, r); return out[0];
  },
  async update(table, id, patch) {
    if (isDemo) { const all = local.list(table); const i = all.findIndex(x => x.id === id); if (i >= 0) { all[i] = { ...all[i], ...patch }; local.save(table, all); return all[i]; } return null; }
    const out = await api('PATCH', `${table}?id=eq.${encodeURIComponent(id)}`, patch); return out[0];
  },
  async remove(table, match) {
    if (isDemo) { local.save(table, local.list(table).filter(x => !Object.entries(match).every(([k, v]) => x[k] === v))); return; }
    const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    await api('DELETE', `${table}?${q}`);
  }
};
