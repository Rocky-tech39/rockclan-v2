export const C = window.RC_CONFIG;
export const TIERS = ['Stone', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Legend'];
export const TIER_COLOR = { Stone: '#6B7280', Bronze: '#A8642E', Silver: '#6E7A8C', Gold: '#B38600', Diamond: '#0B8FA8', Legend: '#D9480F' };
export const RACE_KO = { Protoss: '프로토스', Terran: '테란', Zerg: '저그', Random: '랜덤' };
export const tierIdx = t => { const i = TIERS.indexOf(t); return i < 0 ? 2 : i; };

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const pct = (w, n) => n ? Math.round(100 * w / n) : 0;
export const fmtD = d => d ? d.slice(5).replace('-', '.') : '';
export const sign = (v, dp = 0) => { const n = +v; const s = Math.abs(n).toFixed(dp); return n > 0 ? '+' + s : n < 0 ? '−' + s : (0).toFixed(dp); };
export const signColor = v => v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--mute2)';

export function todayKST() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function seasonOf(date) {
  return C.SEASONS.find(s => date >= s.start && date <= s.end) || null;
}
export function currentSeason() {
  const t = todayKST();
  return C.SEASONS.find(s => t >= s.start && t <= s.end) || C.SEASONS[C.SEASONS.length - 1];
}
export function expected(ra, rb) { return 1 / (1 + Math.pow(10, (rb - ra) / 400)); }

export function tierBadge(t) {
  return `<span class="tier" style="color:${TIER_COLOR[t] || '#6E7A8C'}">${esc(t || '-')}</span>`;
}
// 종족 아이콘 — 락클랜 v2 자체 제작(단순 도형). T=육각 볼트, P=크리스털, Z=알
const RACE_SVG = {
  t: '<path d="M12 2.5 20.2 7.2v9.6L12 21.5 3.8 16.8V7.2z" fill="currentColor"/><circle cx="12" cy="12" r="3.6" fill="var(--rc)"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  p: '<path d="M12 2 18.5 12 12 22 5.5 12z" fill="currentColor"/><path d="M12 2v20M5.5 12h13" stroke="var(--rc)" stroke-width="1.4" opacity=".55"/>',
  z: '<path d="M12 2.5c4.3 0 7 5.4 7 10.2 0 4.7-3.1 8.8-7 8.8s-7-4.1-7-8.8C5 7.9 7.7 2.5 12 2.5z" fill="currentColor"/><circle cx="9.6" cy="11" r="1.7" fill="var(--rc)"/><circle cx="14.2" cy="14.6" r="1.3" fill="var(--rc)"/><circle cx="13.6" cy="8.4" r="1" fill="var(--rc)"/>',
  r: '<path d="M8.6 9.2a3.4 3.4 0 1 1 5 3c-1 .6-1.6 1.2-1.6 2.4v.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18.6" r="1.5" fill="currentColor"/>'
};
export function raceKey(r) { const k = String(r || '').trim().toLowerCase()[0]; return RACE_SVG[k] ? k : 'r'; }
export function raceBadge(r, size = '') {
  const k = raceKey(r), name = RACE_KO[r] || r || '종족 미상';
  return `<span class="race race-${k}${size ? ' ' + size : ''}" title="${esc(name)}" role="img" aria-label="${esc(name)}"><svg viewBox="0 0 24 24" aria-hidden="true">${RACE_SVG[k]}</svg></span>`;
}
export function raceLabel(r, size = 'sm') {
  return `<span class="rlabel">${raceBadge(r, size)}${esc(RACE_KO[r] || r || '')}</span>`;
}
export function formPills(list, small) {
  return `<span class="form${small ? ' sm' : ''}">` + list.map(w => `<i class="${w ? 'w' : 'l'}">${small ? '' : (w ? 'W' : 'L')}</i>`).join('') + '</span>';
}
export function sparkline(vals, w = 88, h = 24) {
  if (!vals || vals.length < 2) return `<svg width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const lo = Math.min(...vals), hi = Math.max(...vals), rg = Math.max(hi - lo, 1);
  const pts = vals.map((v, i) => `${(i * (w - 2) / (vals.length - 1) + 1).toFixed(1)},${(h - 2 - (v - lo) / rg * (h - 4)).toFixed(1)}`).join(' ');
  const col = vals[vals.length - 1] >= vals[0] ? 'var(--up)' : 'var(--down)';
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
export function sample(list, n) {
  if (list.length <= n) return list;
  const out = []; for (let i = 0; i < n; i++) out.push(list[Math.round(i * (list.length - 1) / (n - 1))]);
  return out;
}
export function qs() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, q] = h.split('?');
  const params = new URLSearchParams(q || '');
  return { path: path || 'ranking', params };
}
export function go(path, params) {
  const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString() : '';
  location.hash = '#/' + path + (q.length > 1 ? q : '');
}
export const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
};
export function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now()); }
export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '방금'; if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전'; return Math.floor(s / 86400) + '일 전';
}
