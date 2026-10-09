import { C, tierIdx, expected, seasonOf } from './util.js?v=20261007a';

// 한 경기 → 양쪽 선수 목록
export const sides = m => m.kind === 'solo' ? [[m.p1], [m.p2]] : [m.t1, m.t2];

/**
 * 레이팅 엔진
 * method: 'v2' | 'legacy'
 * filter: 'all' | 'solo' | 'team'
 * 반환: { events: Map(matchId → {e, pre, delta}), hist: Map(id → [{date, r, win, d, mid}]) , rAt(id, date) }
 */
// 전체 시즌 통합: 시즌 리셋 없이 첫 경기부터 이어서 계산
export const ALL_SEASON = { key: 'all', label: '전체 시즌 통합', start: C.SEASONS[0].start, end: C.SEASONS[C.SEASONS.length - 1].end };

export function runEngine(matches, ctx, method = 'v2', filter = 'all', allTime = false) {
  const tierAt = (id, sk) => ctx.tierAt(id, sk);
  const P = C.V2;
  const R = new Map(), G = new Map();
  const events = new Map(), hist = new Map();
  let curSeason = null;
  const base2 = (id, sk) => 1000 + (tierIdx(tierAt(id, sk)) - 2) * P.TIER_STEP;

  for (const m of matches) {
    if (m.kind === 'pro' || m.dup) continue;
    if (filter === 'solo' && m.kind !== 'solo') continue;
    if (filter === 'team' && m.kind !== 'team') continue;
    const s0 = seasonOf(m.date); if (!s0) continue;
    const s = allTime ? ALL_SEASON : s0;
    if (s.key !== curSeason) {
      if (method === 'v2') {
        for (const [id, r] of R) { const b = base2(id, s.key); R.set(id, b + (r - b) * P.SOFT_RESET); }
      } else { R.clear(); }
      curSeason = s.key;
    }
    const [A, B] = sides(m);
    const all = [...A, ...B];
    for (const id of all) if (!R.has(id)) R.set(id, method === 'v2' ? base2(id, s.key) : 1000);
    const pre = {}; all.forEach(id => pre[id] = R.get(id));
    const r = m.win1 ? 1 : 0;
    let e; const delta = {};
    if (method === 'v2') {
      const ra = A.reduce((a, id) => a + R.get(id), 0) / A.length;
      const rb = B.reduce((a, id) => a + R.get(id), 0) / B.length;
      e = expected(ra, rb);
      if (m.kind === 'solo') {
        const k = id => P.K_SOLO * ((G.get(id) || 0) < P.PROVISIONAL_GAMES ? P.PROVISIONAL_MULT : 1);
        delta[A[0]] = k(A[0]) * (r - e); delta[B[0]] = -k(B[0]) * (r - e);
      } else {
        const d0 = P.K_TEAM * (r - e);
        A.forEach(id => delta[id] = d0 * 2 / A.length);
        B.forEach(id => delta[id] = -d0 * 2 / B.length);
      }
    } else {
      // 기존 방식: 개인전 K12 + 티어보정(단계당 40), 팀전 K8 평균 ELO(티어 무시)
      if (m.kind === 'solo') {
        const ea = R.get(A[0]) + tierIdx(tierAt(A[0], s.key)) * 40, eb = R.get(B[0]) + tierIdx(tierAt(B[0], s.key)) * 40;
        e = expected(ea, eb); const d = 12 * (r - e); delta[A[0]] = d; delta[B[0]] = -d;
      } else {
        const ra = A.reduce((a, id) => a + R.get(id), 0) / A.length, rb = B.reduce((a, id) => a + R.get(id), 0) / B.length;
        e = expected(ra, rb); const d = 8 * (r - e);
        A.forEach(id => delta[id] = d); B.forEach(id => delta[id] = -d);
      }
    }
    for (const id of all) {
      R.set(id, R.get(id) + delta[id]); G.set(id, (G.get(id) || 0) + 1);
      const win = A.includes(id) ? !!r : !r;
      if (!hist.has(id)) hist.set(id, []);
      hist.get(id).push({ date: m.date, r: R.get(id), pre: pre[id], win, d: delta[id], mid: m.id, kind: m.kind, season: s.key });
    }
    events.set(m.id, { e, pre, delta });
  }
  const rAt = (id, date, seasonKey) => {
    const h = hist.get(id) || []; let v = null;
    for (const x of h) { if (x.date > date) break; if (!seasonKey || x.season === seasonKey) v = x.r; }
    return v;
  };
  return { events, hist, R, rAt };
}

// 시즌 순위표 계산
export function seasonTable(matches, eng, season, ctx, refDate) {
  const st = new Map();
  const get = id => {
    if (!st.has(id)) st.set(id, { id, w: 0, l: 0, games: 0, opps: new Set(), seq: [], solo: [], last: null, partners: new Map() });
    return st.get(id);
  };
  for (const m of matches) {
    if (m.kind === 'pro' || m.date < season.start || m.date > season.end) continue;
    if (!eng.events.has(m.id)) continue;
    const [A, B] = sides(m);
    for (const id of [...A, ...B]) {
      const o = get(id), win = A.includes(id) ? m.win1 : !m.win1;
      win ? o.w++ : o.l++; o.games++; o.seq.push(win); o.last = m.date;
      (A.includes(id) ? B : A).forEach(x => o.opps.add(x));
      if (m.kind === 'solo') o.solo.push(win);
    }
  }
  const ref7 = addDaysLocal(refDate, -7);
  const rows = [];
  for (const o of st.values()) {
    if (C.HIDE_IDS.includes(o.id) || !ctx.players.has(o.id)) continue;
    const h = (eng.hist.get(o.id) || []).filter(x => x.season === season.key);
    if (!h.length) continue;
    const r = h[h.length - 1].r;
    const before = h.filter(x => x.date <= ref7);
    const r7 = before.length ? before[before.length - 1].r : h[0].pre;
    let streak = 0; const lastW = o.seq[o.seq.length - 1];
    for (let i = o.seq.length - 1; i >= 0 && o.seq[i] === lastW; i--) streak++;
    let best = 0, cur = 0; for (const w of o.solo) { cur = w ? cur + 1 : 0; best = Math.max(best, cur); }
    let sCur = 0; for (let i = o.solo.length - 1; i >= 0 && o.solo[i]; i--) sCur++;
    const meta = ctx.players.get(o.id);
    rows.push({
      id: o.id, race: meta.race, tier: ctx.tierAt(o.id, season.key), r, d7: r - r7, w: o.w, l: o.l, games: o.games,
      opps: o.opps.size, form: o.seq.slice(-5), last10: o.seq.slice(-10), streak: lastW ? streak : -streak,
      bestSoloStreak: best, curSoloStreak: sCur, last: o.last,
      spark: h.map(x => x.r), eligible: o.games >= C.ELIGIBLE.GAMES && o.opps.size >= C.ELIGIBLE.OPPONENTS,
      inactive: daysBetween(o.last, refDate) > C.ELIGIBLE.INACTIVE_DAYS
    });
  }
  rows.sort((a, b) => b.r - a.r);
  // 7일 전 순위
  const prevOrder = rows.filter(x => x.eligible).slice().sort((a, b) => (b.r - b.d7) - (a.r - a.d7)).map(x => x.id);
  rows.filter(x => x.eligible).forEach((x, i) => { x.rank = i + 1; x.rankChg = prevOrder.indexOf(x.id) - i; });
  return rows;
}

export function proTable(matches, season, ctx) {
  const st = new Map();
  for (const m of matches) {
    if (m.kind !== 'pro' || m.dupOf || m.date < season.start || m.date > season.end) continue;
    for (const id of [...m.t1, ...m.t2]) {
      if (!st.has(id)) st.set(id, { id, w: 0, l: 0, seq: [] });
      const o = st.get(id), win = m.t1.includes(id) ? m.win1 : !m.win1;
      win ? o.w++ : o.l++; o.seq.push(win);
    }
  }
  return [...st.values()].filter(o => ctx.players.has(o.id) && !C.HIDE_IDS.includes(o.id)).map(o => ({
    ...o, diff: o.w - o.l, games: o.w + o.l, race: ctx.players.get(o.id).race, tier: ctx.tierAt(o.id, season.key), form: o.seq.slice(-5)
  })).sort((a, b) => b.diff - a.diff || b.w - a.w || a.l - b.l);
}

function addDaysLocal(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function daysBetween(a, b) { return (new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000; }

// 개인전 다음 경기 예상 — 점수 방식에 맞춰 계산 (기존 ELO는 티어 보정 단계당 40점, K12)
export function soloOdds(ctx, method, eng, a, b, sk, ra0, rb0) {
  const P = C.V2;
  const seed = id => method === 'v2' ? 1000 + (tierIdx(ctx.tierAt(id, sk)) - 2) * P.TIER_STEP : 1000;
  const ra = ra0 ?? eng.R.get(a) ?? seed(a), rb = rb0 ?? eng.R.get(b) ?? seed(b);
  if (method === 'v2') return { ra, rb, e: expected(ra, rb), K: P.K_SOLO };
  const ea = ra + tierIdx(ctx.tierAt(a, sk)) * 40, eb = rb + tierIdx(ctx.tierAt(b, sk)) * 40;
  return { ra, rb, e: expected(ea, eb), K: 12 };
}
