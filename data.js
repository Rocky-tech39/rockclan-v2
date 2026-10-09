import { C } from './util.js?v=20261009a';

async function rest(path) {
  const res = await fetch(`${C.READ_URL}/rest/v1/${path}`, {
    headers: { apikey: C.READ_KEY, Authorization: `Bearer ${C.READ_KEY}` }, cache: 'no-store'
  });
  if (!res.ok) throw new Error(`데이터 로드 실패 (${res.status})`);
  return res.json();
}

export async function loadOfficial() {
  const [players, snaps, maps] = await Promise.all([
    rest('players?select=*'),
    rest('player_seasons?select=*').catch(() => []),
    rest('season_maps?select=*&order=sort_order').catch(() => [])
  ]);
  let rows = [], from = 0;
  for (;;) {
    const page = await rest(`matches?select=*&order=match_date.asc,seq.asc&offset=${from}&limit=1000`);
    rows = rows.concat(page);
    if (page.length < 1000) break;
    from += 1000;
  }
  return { players, snaps, maps, rows };
}

const normMap = m => { m = (m || '').trim(); if (m === 'Match') return m; if (m.includes('에결')) return '투혼(에결)'; return m; };

// 원본 행 → 정규화된 경기
export function normalize(rows) {
  const out = [];
  let header = null;
  for (const r of rows) {
    const isTeam = Array.isArray(r.team1) && r.team1.length > 0;
    const base = { id: r.id, date: r.match_date, seq: r.seq ?? 0, map: normMap(r.map), score: r.score || '', src: r.src || 'official', fixed: r.fixed || '' };
    if (r.map === 'Match' && isTeam) {
      const w = r.winner_arr || [];
      header = { ...base, kind: 'pro', t1: r.team1, t2: r.team2 || [], win1: w.some(x => r.team1.includes(x)), sets: [] };
      out.push(header);
      continue;
    }
    let m;
    if (r.player1 && r.player2) {
      if (!r.winner) continue;
      m = { ...base, kind: 'solo', p1: r.player1, p2: r.player2, win1: r.winner === r.player1 };
    } else if (isTeam && Array.isArray(r.team2) && r.team2.length) {
      const w = r.winner_arr || [];
      m = { ...base, kind: 'team', t1: r.team1, t2: r.team2, win1: w.some(x => r.team1.includes(x)) };
    } else continue;
    // 프로리그 세트 소속 판정: 같은 날 직전 헤더의 출전 선수만으로 이뤄진 경기
    if (header && header.date === m.date) {
      const roster = new Set([...header.t1, ...header.t2]);
      const ps = m.kind === 'solo' ? [m.p1, m.p2] : [...m.t1, ...m.t2];
      if (ps.every(p => roster.has(p))) { m.parent = header.id; header.sets.push(m); }
    }
    out.push(m);
  }
  // 수정된 세트가 있는 프로리그는 스코어·승패를 세트 결과로 다시 계산
  for (const h of out.filter(m => m.kind === 'pro' && (m.fixed || m.sets.some(x => x.fixed)))) {
    const w1 = h.sets.filter(x => x.win1).length, w2 = h.sets.length - w1;
    h.win1 = w1 > w2; h.score = `${w1}:${w2}`; h.fixed = h.fixed || 'edit';
  }
  // 프로리그 중복 의심: 같은 날·같은 팀·같은 세트 구성
  const sig = new Map();
  for (const h of out.filter(m => m.kind === 'pro')) {
    const s2 = [h.date, [...h.t1, ...h.t2].sort().join(','), h.sets.length,
      h.sets.map(x => x.kind === 'solo' ? `${x.map}:${[x.p1, x.p2].sort()}:${x.win1 ? x.p1 : x.p2}` : `${x.map}`).join('|')].join('#');
    const key = s2;
    if (sig.has(key)) { h.dupOf = sig.get(key); for (const x of h.sets) x.dup = true; }
    else sig.set(key, h.id);
  }
  return out;
}

// 제출된 결과(확정) → 원본 행 형태로 변환. 공식 기록에 이미 있으면 제외
export function submissionsToRows(subs, officialRows) {
  const offKey = new Set(officialRows.filter(r => r.player1).map(r => `${r.match_date}|${[r.player1, r.player2].sort()}|${r.winner}`));
  const rows = [];
  let seq = 1e7;
  for (const s of subs) {
    if (!isConfirmed(s)) continue;
    const sets = s.sets || [];
    const soloKeys = sets.filter(x => x.p1).map(x => `${s.match_date}|${[x.p1, x.p2].sort()}|${x.winner}`);
    if (soloKeys.length && soloKeys.every(k => offKey.has(k))) continue; // 이미 공식 반영
    if (s.kind === 'pro') {
      const w1 = sets.filter(x => x.side === 1).length, w2 = sets.length - w1;
      rows.push({ id: 's-' + s.id, match_date: s.match_date, seq: seq++, map: 'Match', team1: s.team1, team2: s.team2,
        winner_arr: w1 > w2 ? s.team1 : s.team2, score: `${w1}:${w2}`, src: 'submitted' });
    }
    sets.forEach((x, i) => {
      if (x.p1) rows.push({ id: `s-${s.id}-${i}`, match_date: s.match_date, seq: seq++, map: x.map, player1: x.p1, player2: x.p2, winner: x.winner, score: '', src: 'submitted' });
      else rows.push({ id: `s-${s.id}-${i}`, match_date: s.match_date, seq: seq++, map: x.map, team1: x.t1, team2: x.t2, winner_arr: x.side === 1 ? x.t1 : x.t2, score: '', src: 'submitted' });
    });
  }
  return rows;
}

export function isConfirmed(s) {
  if (s.status === 'confirmed') return true;
  if (s.status === 'pending') {
    const h = (Date.now() - new Date(s.created_at).getTime()) / 3600000;
    return h >= C.AUTO_CONFIRM_HOURS;
  }
  return false;
}

// ── 수정·삭제 요청 ──────────────────────────────────────────
// submissions 테이블에 sets = { fix: { del: [rowId], edit: { rowId: { swap, map } }, summary } } 형태로 저장
export const isFix = s => s && s.sets && !Array.isArray(s.sets) && s.sets.fix;
// 신규 선수 등록도 submissions에 저장: sets = { player: { id, race, tier } }, team1 = [id]
export const isReg = s => s && s.sets && !Array.isArray(s.sets) && s.sets.player && s.sets.player.id;

export function applyFixes(rows, fixes) {
  const del = new Set(), edit = new Map();
  for (const f of fixes) {
    if (!isConfirmed(f)) continue;
    const fx = f.sets.fix;
    (fx.del || []).forEach(id => del.add(String(id)));
    Object.entries(fx.edit || {}).forEach(([id, e]) => edit.set(String(id), e));
  }
  if (!del.size && !edit.size) return rows;
  const out = [];
  for (const r of rows) {
    const id = String(r.id);
    if (del.has(id)) continue;
    const e = edit.get(id);
    if (!e) { out.push(r); continue; }
    const n = { ...r, fixed: 'edit' };
    if (e.map) n.map = e.map;
    if (e.swap) {
      if (n.player1) n.winner = n.winner === n.player1 ? n.player2 : n.player1;
      else if (Array.isArray(n.team1)) { const w1 = (n.winner_arr || []).some(x => n.team1.includes(x)); n.winner_arr = w1 ? n.team2 : n.team1; }
    }
    out.push(n);
  }
  return out;
}
