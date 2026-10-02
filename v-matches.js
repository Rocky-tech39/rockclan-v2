import { esc, fmtD, go, sign } from './util.js';
import { sides } from './rating.js';

export function render(app, el, p) {
  const eng = app.engine('v2', 'all');
  const kind = p.get('kind') || '';
  const q = (p.get('q') || '').trim().toLowerCase();
  const days = [...new Set(app.matches.map(m => m.date))].sort();
  const date = p.get('date') && days.includes(p.get('date')) ? p.get('date') : days[days.length - 1];
  const set = (k, v) => { const o = Object.fromEntries(p); o[k] = v; if (k !== 'date' && k !== 'q' && k !== 'kind') { } go('matches', o); };

  const match = m => {
    if (!q) return true;
    const ps = m.kind === 'solo' ? [m.p1, m.p2] : [...(m.t1 || []), ...(m.t2 || [])];
    return ps.some(x => x.toLowerCase().includes(q)) || (m.map || '').toLowerCase().includes(q) || (m.sets || []).some(s => match(s));
  };
  let list;
  if (q) list = app.matches.filter(m => !m.parent && match(m)).slice(-60).reverse();
  else list = app.matches.filter(m => m.date === date && !m.parent);
  if (kind) list = list.filter(m => m.kind === kind);

  const dayIdx = days.indexOf(date);
  const shown = days.slice(Math.max(0, dayIdx - 10), dayIdx + 4);
  const counts = new Map(); app.matches.forEach(m => { if (m.kind !== 'pro') counts.set(m.date, (counts.get(m.date) || 0) + 1); });

  // 이날 요약
  const dayGames = app.matches.filter(m => m.date === date && m.kind !== 'pro' && !m.dup && eng.events.has(m.id));
  let up = null, mvp = new Map();
  for (const m of dayGames) {
    const ev = eng.events.get(m.id);
    if (m.kind === 'solo') { const pw = m.win1 ? ev.e : 1 - ev.e; if (!up || pw < up.pw) up = { m, pw }; }
    for (const [id, d] of Object.entries(ev.delta)) mvp.set(id, (mvp.get(id) || 0) + d);
  }
  const best = [...mvp.entries()].sort((a, b) => b[1] - a[1])[0];
  const pros = app.matches.filter(m => m.date === date && m.kind === 'pro');
  const dups = pros.filter(m => m.dupOf).length;

  el.innerHTML = `
  <div class="head"><div><div class="eyebrow">MATCH LOG</div><h1 class="title">경기 기록</h1>
    <div class="desc">세트마다 경기 전 승리 확률과 레이팅 변동(v2)을 함께 표시합니다</div></div>
    <div class="row"><label class="sr" for="mQ">선수·맵 검색</label><input id="mQ" class="fld" placeholder="선수 또는 맵 검색" value="${esc(p.get('q') || '')}" style="width:200px">
    <select id="mKind" class="fld" aria-label="경기 종류"><option value="">전체 경기</option><option value="pro" ${kind === 'pro' ? 'selected' : ''}>프로리그</option><option value="solo" ${kind === 'solo' ? 'selected' : ''}>개인전</option><option value="team" ${kind === 'team' ? 'selected' : ''}>팀전</option></select>
    <input id="mDate" type="date" class="fld" value="${date}" min="${days[0]}" max="${days[days.length - 1]}" aria-label="날짜"></div></div>
  <div class="stack">
    ${q ? `<div class="note">"${esc(p.get('q'))}" 검색 결과 최근 ${list.length}건 <a href="#" data-clear>검색 지우기</a></div>` : `
    <div class="days">${shown.map(d => `<button class="day ${d === date ? 'on' : ''}" data-day="${d}"><b>${fmtD(d)}</b><span>${counts.get(d) || 0}경기</span></button>`).join('')}</div>
    ${dayGames.length ? `<div class="grid3">
      ${up && up.pw < 0.4 ? `<div class="tile" style="background:var(--infobg);border-color:var(--infoline)"><div class="k" style="color:var(--info)">오늘의 이변</div><div class="v" style="font-size:17px">${esc(up.m.win1 ? up.m.p1 : up.m.p2)}, 승리확률 ${Math.round(up.pw * 100)}%로 ${esc(up.m.win1 ? up.m.p2 : up.m.p1)} 격파</div><div class="s">${esc(up.m.map)} · <span class="num">${sign(eng.events.get(up.m.id).delta[up.m.win1 ? up.m.p1 : up.m.p2], 1)}</span></div></div>` : `<div class="tile"><div class="k">오늘의 이변</div><div class="v" style="font-size:17px">큰 이변 없음</div><div class="s">승리확률 40% 미만 승리가 없었어요</div></div>`}
      ${best ? `<a class="tile" href="#/player?id=${encodeURIComponent(best[0])}"><div class="k">오늘의 MVP</div><div class="v" style="font-size:17px">${esc(best[0])} <span class="up num">${sign(best[1], 1)}</span></div><div class="s">이날 레이팅 상승 1위</div></a>` : ''}
      <div class="tile"><div class="k">이날 요약</div><div class="v num" style="font-size:17px">${pros.length ? `프로리그 ${pros.length}매치 · ` : ''}${dayGames.length}경기</div><div class="s">${dups ? `중복 의심 ${dups}건 · 점수 계산에서 제외` : '중복 의심 없음'}</div></div>
    </div>` : ''}`}
    ${list.map(m => card(app, eng, m, !!q)).join('') || '<div class="empty">경기가 없습니다</div>'}
  </div>`;

  el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => set('date', b.dataset.day));
  el.querySelector('#mKind').onchange = e => set('kind', e.target.value);
  el.querySelector('#mDate').onchange = e => set('date', e.target.value);
  const cl = el.querySelector('[data-clear]'); if (cl) cl.onclick = e => { e.preventDefault(); set('q', ''); };
  const qi = el.querySelector('#mQ');
  qi.onkeydown = e => { if (e.key === 'Enter') set('q', qi.value.trim()); };
  qi.onchange = () => set('q', qi.value.trim());
  el.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => { const t = el.querySelector('#' + b.dataset.toggle); t.hidden = !t.hidden; b.textContent = t.hidden ? '세트 보기 ▾' : '접기 ▴'; });
}

const P = id => `<a href="#/player?id=${encodeURIComponent(id)}" style="color:inherit">${esc(id)}</a>`;

function setRow(eng, s, i) {
  const ev = eng.events.get(s.id);
  const [A, B] = sides(s);
  const pa = ev ? Math.round(ev.e * 100) : 50;
  const upA = s.win1 && pa < 30, upB = !s.win1 && pa > 70;
  const d = ev ? Math.abs(ev.delta[A[0]]) : 0;
  return `<div class="set">
    <span class="num mute">${i + 1}</span><span class="c-map" style="color:var(--text2)">${esc(s.map)}</span>
    <span class="a ${s.win1 ? 'win' : 'lose'}">${upA ? '<span class="tag info">이변</span> ' : ''}${A.map(P).join(' · ')}</span>
    <div class="pbar"><span style="text-align:right">${pa}</span><div class="bar"><i style="width:${pa}%"></i></div><span>${100 - pa}</span></div>
    <span class="${!s.win1 ? 'win' : 'lose'}">${B.map(P).join(' · ')}${upB ? ' <span class="tag info">이변</span>' : ''}</span>
    <span class="num" style="text-align:right;color:var(--text2)">±${d.toFixed(1)}</span></div>`;
}

function card(app, eng, m, showDate) {
  if (m.kind === 'pro') {
    const s1 = m.sets.filter(s => s.win1).length, s2 = m.sets.length - s1;
    const [sc1, sc2] = m.score && m.score.includes(':') ? m.score.split(':') : [s1, s2];
    const dupOf = m.dupOf;
    return `<article class="mcard ${dupOf ? 'dup' : ''}">
      <div class="mhead"><div class="row"><span class="tag acc">프로리그</span><span class="mute small">${showDate ? fmtD(m.date) + ' · ' : ''}${m.sets.length}세트</span>
        ${dupOf ? '<span class="tag warn">중복 의심 · 같은 날 같은 구성·결과 기록이 이미 있음</span>' : ''}${m.src === 'submitted' ? '<span class="tag ok">제출 반영</span>' : ''}</div>
        ${m.sets.length ? `<button class="btn" data-toggle="s-${m.id}" style="min-height:34px;padding:4px 12px">${dupOf ? '세트 보기 ▾' : '접기 ▴'}</button>` : ''}</div>
      <div class="mscore"><div class="${m.win1 ? 'win' : 'lose'}"><div class="small mute">TEAM 1</div>${m.t1.map(P).join(' · ')}</div>
        <div class="s num">${esc(sc1)} <span style="color:var(--mute2)">:</span> ${esc(sc2)}</div>
        <div class="${!m.win1 ? 'win' : 'lose'}" style="text-align:right"><div class="small mute">TEAM 2</div>${m.t2.map(P).join(' · ')}</div></div>
      <div id="s-${m.id}" ${dupOf ? 'hidden' : ''}>
        <div class="set small mute" style="padding-top:6px;padding-bottom:6px"><span>세트</span><span class="c-map">맵</span><span class="a">Team 1</span><span class="pbar" style="justify-content:center">경기 전 승리 확률</span><span>Team 2</span><span style="text-align:right">변동</span></div>
        ${m.sets.map((s, i) => setRow(eng, s, i)).join('')}
      </div></article>`;
  }
  return `<article class="mcard"><div class="mhead" style="padding:8px 18px"><div class="row"><span class="tag mute">${m.kind === 'solo' ? '개인전' : '팀전'}</span><span class="small mute">${showDate ? fmtD(m.date) : ''}</span>${m.src === 'submitted' ? '<span class="tag ok">제출 반영</span>' : ''}</div></div>${setRow(eng, m, 0)}</article>`;
}
