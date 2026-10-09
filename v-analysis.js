import { esc, pct, sign, tierBadge, raceBadge, raceLabel, TIER_COLOR, TIERS, RACE_KO, fmtD, go, expected, C, todayKST } from './util.js?v=20261009a';
import { sides, seasonTable, soloOdds } from './rating.js?v=20261009a';

export function render(app, el, p) {
  const sk = p.get('season') || 'all';
  const season = sk === 'all' ? null : app.seasonFromParam(sk);
  const ids = [...app.players.keys()].filter(x => !C.HIDE_IDS.includes(x)).sort((a, b) => a.localeCompare(b));
  const a = p.get('a') && app.players.has(p.get('a')) ? p.get('a') : (app.me || 'dalsun2');
  const b0 = p.get('b') && app.players.has(p.get('b')) ? p.get('b') : null;
  const set = (k, v) => { const o = Object.fromEntries(p); o.a = a; if (b0) o.b = b0; o[k] = v; go('analysis', o); };
  const eng = app.engine(app.method, 'all');
  const inRange = m => !season || (m.date >= season.start && m.date <= season.end);
  const solos = app.matches.filter(m => m.kind === 'solo' && !m.dup && inRange(m));

  // 상대 후보: 맞대결 많은 순
  const cnt = {};
  solos.forEach(m => { if (m.p1 === a) cnt[m.p2] = (cnt[m.p2] || 0) + 1; else if (m.p2 === a) cnt[m.p1] = (cnt[m.p1] || 0) + 1; });
  const b = b0 || Object.entries(cnt).sort((x, y) => y[1] - x[1])[0]?.[0] || ids.find(x => x !== a);

  const h2h = solos.filter(m => (m.p1 === a && m.p2 === b) || (m.p1 === b && m.p2 === a));
  const aw = h2h.filter(m => (m.win1 ? m.p1 : m.p2) === a).length, bw = h2h.length - aw;
  const { ra, rb, e, K } = soloOdds(app, app.method, eng, a, b, app.current.key);
  const scoreName = app.method === 'v2' ? '레이팅' : 'ELO';
  const winner = m => m.win1 ? m.p1 : m.p2;

  // 맵별
  const byMap = {};
  h2h.forEach(m => { (byMap[m.map] ||= [0, 0])[winner(m) === a ? 0 : 1]++; });
  const mapRows = Object.entries(byMap).sort((x, y) => (y[1][0] + y[1][1]) - (x[1][0] + x[1][1]));
  // 스카우팅 포인트 자동 생성
  const tips = [];
  if (h2h.length) {
    const main = mapRows[0];
    if (main && mapRows.length > 1) {
      const [mm, [w, l]] = main; const ow = h2h.length - (w + l) ? h2h.filter(m => m.map !== mm && winner(m) === a).length : 0, ol = h2h.filter(m => m.map !== mm).length - ow;
      if (pct(w, w + l) + 25 <= pct(ow, ow + ol) && ow + ol >= 3) tips.push(`<b>맵 선택권이 있다면 ${esc(mm)}를 피하세요.</b> ${esc(mm)} ${w}승 ${l}패, 그 외 맵 ${ow}승 ${ol}패.`);
      else if (pct(w, w + l) >= pct(ow, ow + ol) + 25 && w + l >= 3) tips.push(`<b>${esc(mm)}에서 강합니다.</b> ${esc(mm)} ${w}승 ${l}패, 그 외 맵 ${ow}승 ${ol}패.`);
    }
    const last3 = h2h.slice(-3); const lw = last3.filter(m => winner(m) === a).length;
    tips.push(`최근 ${last3.length}경기 <b>${lw}승 ${last3.length - lw}패</b>로 흐름은 ${lw * 2 > last3.length ? esc(a) : lw * 2 < last3.length ? esc(b) : '팽팽'} 쪽.`);
  }
  const raceStat = id => {
    const o = {}; solos.forEach(m => { if (m.p1 !== id && m.p2 !== id) return; const op = m.p1 === id ? m.p2 : m.p1; const r = (app.players.get(op) || {}).race; if (!r) return; (o[r] ||= [0, 0])[winner(m) === id ? 0 : 1]++; });
    return o;
  };
  const rsB = raceStat(b), rsA = raceStat(a);
  const best = Object.entries(rsB).filter(([, v]) => v[0] + v[1] >= 8).map(([r, [w, l]]) => [r, pct(w, w + l)]).sort((x, y) => y[1] - x[1]);
  if (best.length >= 2) tips.push(`${esc(b)}는 ${RACE_KO[best[0][0]]} 상대 ${best[0][1]}%로 강하고, ${RACE_KO[best[best.length - 1][0]]} 상대 ${best[best.length - 1][1]}%로 약합니다.`);

  // 티어 매트릭스
  const T = TIERS.slice(1);
  const mx = {}; const cellGames = {};
  for (const m of solos) {
    const sk2 = (app.seasonOf(m.date) || {}).key;
    const ta = app.tierAt(m.p1, sk2), tb = app.tierAt(m.p2, sk2);
    const k1 = ta + '|' + tb, k2 = tb + '|' + ta;
    (mx[k1] ||= [0, 0])[m.win1 ? 0 : 1]++; (mx[k2] ||= [0, 0])[m.win1 ? 1 : 0]++;
    (cellGames[k1] ||= []).push(m); if (k1 !== k2) (cellGames[k2] ||= []).push(m);
  }
  const bg = v => v >= 65 ? '#C7DAFF' : v >= 55 ? '#E2ECFF' : v > 45 ? '#EEF1F6' : v > 35 ? '#FDE4E1' : '#F8C9C4';
  const cell = p.get('cell');

  const opt = (sel) => ids.map(x => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const seasonOpts = `<option value="all" ${sk === 'all' ? 'selected' : ''}>통산</option>` + app.seasonsWithData().map(s => `<option value="${s.key}" ${season && s.key === season.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  const pa = app.players.get(a), pb = app.players.get(b);
  const curSk = app.current.key;
  const raceBlock = (id, rs) => `<div class="card"><h2>${esc(id)} · 종족전 성적 <span class="mute">${season ? esc(season.label) : '통산'}</span></h2>${['Protoss', 'Terran', 'Zerg'].map(r => { const [w, l] = rs[r] || [0, 0]; return `<div style="display:grid;grid-template-columns:90px minmax(0,1fr) 120px;gap:12px;align-items:center;font-size:14px;margin:8px 0"><span class="rlabel">vs ${raceBadge(r, 'sm')}${RACE_KO[r]}</span><div class="hbar"><i style="width:${pct(w, w + l)}%"></i></div><span class="num" style="text-align:right">${w}-${l} · <b>${pct(w, w + l)}%</b></span></div>`; }).join('')}</div>`;

  el.innerHTML = `
  <div class="head"><div><div class="eyebrow">SCOUTING ROOM</div><h1 class="title">다음 경기를 위한 전력 분석</h1>
    <div class="desc">맞대결 · 맵 · 종족 · 티어 구간 성적을 한 화면에. 표본이 적은 수치는 흐리게 표시합니다.</div></div>
    <select id="aSeason" class="fld" aria-label="기간">${seasonOpts}</select></div>
  <div class="stack">
  <section class="card">
    <div class="grid2" style="gap:12px"><label class="lbl">내 선수<select id="aA" class="fld">${opt(a)}</select></label><label class="lbl">상대 선수<select id="aB" class="fld">${opt(b)}</select></label></div>
    <div class="vs">
      <div><a href="#/player?id=${encodeURIComponent(a)}" style="font:700 28px var(--num);color:var(--text)">${esc(a)}</a><div class="small mute">${tierBadge(app.tierAt(a, curSk))} · ${raceLabel(pa.race)} · ${scoreName} <b class="num">${Math.round(ra)}</b></div></div>
      <div style="text-align:center"><div class="num" style="font:700 52px var(--num);line-height:1"><span style="color:var(--acc2)">${aw}</span> <span style="color:var(--mute2)">:</span> ${bw}</div><div class="small mute">개인전 ${h2h.length}경기${h2h.length && h2h.length < 15 ? ' · <span style="color:var(--warn)">표본 적음</span>' : ''}</div></div>
      <div style="text-align:right"><a href="#/player?id=${encodeURIComponent(b)}" style="font:700 28px var(--num);color:var(--text)">${esc(b)}</a><div class="small mute">${tierBadge(app.tierAt(b, curSk))} · ${raceLabel(pb.race)} · ${scoreName} <b class="num">${Math.round(rb)}</b></div></div>
    </div>
    <div class="row" style="justify-content:space-between;font-size:13px"><span>다음 경기 예상 승률 <span class="mute">(${esc(app.current.label)} 현재 ${scoreName}${app.method === 'v2' ? '' : ' + 티어 보정'} 기준)</span></span><b class="num">${Math.round(e * 100)}% : ${100 - Math.round(e * 100)}%</b></div>
    <div style="height:12px;display:flex;border-radius:6px;overflow:hidden;margin:6px 0"><i style="width:${Math.round(e * 100)}%;background:linear-gradient(90deg,#1E46D8,#5B8CFF)"></i><i style="flex:1;background:linear-gradient(90deg,#FF9A6B,#F0542A)"></i></div>
    <div class="small mute">${esc(a)}가 이기면 <span class="up num">+${(K * (1 - e)).toFixed(1)}</span> · 지면 <span class="down num">−${(K * e).toFixed(1)}</span></div>
    <div class="small mute" style="margin-top:6px;line-height:1.6">이름 옆 ${scoreName} 점수는 <b>${esc(app.current.label)} 시즌 현재 점수</b>예요. ${app.method === 'v2' ? '' : '기존 ELO는 시즌마다 1000점에서 다시 시작해서, 시즌 초반엔 다들 1000점 근처입니다. 예상 승률은 여기에 티어 차이(단계당 40점)를 더해 계산합니다. '}위쪽 기간(통산/시즌)은 맞대결·종족전·맵 기록에만 적용돼요.</div>
  </section>
  <section class="grid2">
    <div class="card"><h2>스카우팅 포인트</h2>${tips.length ? tips.map((t, i) => `<div class="${i === 0 ? 'note' : 'tile'}" style="margin-bottom:8px;font-size:14px;line-height:1.6;${i ? 'color:var(--text)' : ''}">${t}</div>`).join('') : '<div class="mute">맞대결 기록이 없습니다</div>'}
      ${mapRows.length ? `<h2 style="margin-top:14px">맵별 맞대결</h2>${mapRows.map(([mp, [w, l]]) => `<div class="li"><span>${esc(mp)}</span><span class="num" style="text-align:right">${w}-${l}</span><span class="num" style="text-align:right;font-weight:700">${pct(w, w + l)}%</span></div>`).join('')}` : ''}
      <div class="small mute" style="margin-top:8px">표본 ${h2h.length}경기 · 참고용 해석</div></div>
    <div class="card"><h2>맞대결 기록</h2>${h2h.slice().reverse().slice(0, 20).map(m => `<div style="display:grid;grid-template-columns:70px minmax(0,1fr) auto;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px"><a class="num mute" href="#/matches?date=${m.date}">${fmtD(m.date)}</a><span style="color:var(--text2)">${esc(m.map)}</span><b style="color:${winner(m) === a ? 'var(--acc2)' : 'var(--text2)'}">${esc(winner(m))} 승</b></div>`).join('') || '<div class="mute">기록 없음</div>'}</div>
  </section>
  <section class="grid2">${raceBlock(a, rsA)}${raceBlock(b, rsB)}</section>
  <section class="card">
    <div class="row" style="justify-content:space-between"><h2 style="margin:0">티어 구간별 개인전 승률 <span class="mute">${season ? esc(season.label) : '통산'} · 경기 당시 티어 기준</span></h2><span class="small mute">행 = 내 티어 · 열 = 상대 티어 · 10경기 미만은 흐리게 · 칸을 누르면 경기 목록</span></div>
    <div class="mx" style="margin-top:12px"><span></span>${T.map(t => `<span style="text-align:center;font-size:12px;font-weight:600;color:${TIER_COLOR[t]}">${t}</span>`).join('')}
    ${T.map(r => `<span style="font-size:12px;font-weight:600;color:${TIER_COLOR[r]};display:flex;align-items:center">${r}</span>${T.map(c => { const v = mx[r + '|' + c]; if (!v) return '<button disabled style="background:var(--card2);color:var(--mute2)">—</button>'; const n = v[0] + v[1], pp = pct(v[0], n); return `<button data-cell="${r}|${c}" class="${n < 10 ? 'low' : ''}" style="background:${bg(pp)};${cell === r + '|' + c ? 'outline:2px solid var(--acc2)' : ''}"><b class="num" style="font-size:16px">${pp}%</b><span class="num small" style="color:var(--text2)">${v[0]}-${v[1]}</span></button>`; }).join('')}`).join('')}
    </div>
    ${cell && cellGames[cell] ? `<div style="margin-top:14px"><h2>${esc(cell.replace('|', ' vs '))} 경기 <span class="mute">최근 ${Math.min(30, cellGames[cell].length)}건 / ${cellGames[cell].length}건</span></h2>${cellGames[cell].slice(-30).reverse().map(m => `<div style="display:grid;grid-template-columns:70px 110px minmax(0,1fr);gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:14px"><a class="num mute" href="#/matches?date=${m.date}">${fmtD(m.date)}</a><span class="mute">${esc(m.map)}</span><span><b>${esc(winner(m))}</b> <span class="mute">def.</span> ${esc(m.win1 ? m.p2 : m.p1)}</span></div>`).join('')}</div>` : ''}
    <div class="small mute" style="margin-top:10px;line-height:1.6">같은 티어끼리는 양쪽 관점으로 집계돼 50%가 됩니다. 기존 ELO는 한 티어 차이를 승률 약 44%로 가정했는데, 실제 기록에서는 그보다 차이가 훨씬 큽니다. 개편안(v2)은 그래서 티어 간격을 넓혔습니다.</div>
  </section>
  </div>`;

  el.querySelector('#aA').onchange = ev => { const o = Object.fromEntries(p); o.a = ev.target.value; delete o.b; go('analysis', o); };
  el.querySelector('#aB').onchange = ev => set('b', ev.target.value);
  el.querySelector('#aSeason').onchange = ev => set('season', ev.target.value);
  el.querySelectorAll('[data-cell]').forEach(x => x.onclick = () => set('cell', cell === x.dataset.cell ? '' : x.dataset.cell));
}
