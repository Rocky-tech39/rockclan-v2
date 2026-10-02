export const C = window.RC_CONFIG;
export const TIERS = ['Stone', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Legend'];
export const TIER_COLOR = { Stone: '#8B8F99', Bronze: '#D49A66', Silver: '#C4C9D4', Gold: '#F2C94C', Diamond: '#6FE0F5', Legend: '#FF8A5B' };
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
  return `<span class="tier" style="color:${TIER_COLOR[t] || '#C4C9D4'}">${esc(t || '-')}</span>`;
}
export function raceBadge(r) {
  return `<span class="race" title="${esc(r || '')}">${esc((r || '?')[0])}</span>`;
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
