import { C, esc, pct, sign, signColor, tierBadge, raceBadge, raceLabel, formPills, sparkline, sample, go, fmtD, TIERS, TIER_COLOR, addDays, todayKST } from './util.js?v=20261002m';
import { seasonTable, proTable, sides, ALL_SEASON } from './rating.js?v=20261002m';

export function render(app, el, p) {
  const allTime = p.get('season') === 'all';
  const season = allTime ? ALL_SEASON : app.seasonFromParam(p.get('season'));
  const mode = p.get('mode') || 'all';
  const method = p.get('method') || app.method;
  const sort = p.get('sort') || 'skill';
  const showAll = p.get('all') === '1';
  const q = (p.get('q') || '').toLowerCase(), race = p.get('race') || '', tier = p.get('tier') || '';
  const set = (k, v) => { const o = Object.fromEntries(p); o[k] = v; go('ranking', o); };
  const isCurrent = season.key === app.current.key;
  const refDate = isCurrent || allTime ? todayKST() : season.end;

  const seasonOpts = `<option value="all" ${allTime ? 'selected' : ''}>전체 시즌 통합</option>` + app.seasonsWithData().map(s => `<option value="${s.key}" ${s.key === season.key ? 'selected' : ''}>${esc(s.label)}${s.key === app.current.key ? ' · 진행중' : ''}</option>`).join('');
  const head = `
  <div class="head">
    <div>
      <div class="eyebrow">CLAN LEADERBOARD</div>
      <h1 class="title">클랜 랭킹</h1>
    </div>
    <div class="row">
      <label class="sr" for="rkSeason">시즌</label><select id="rkSeason" class="fld">${seasonOpts}</select>
      <label class="sr" for="rkMethod">계산 방식</label>
      <select id="rkMethod" class="fld" ${mode === 'pro' ? 'disabled' : ''}><option value="legacy" ${method === 'legacy' ? 'selected' : ''}>기존 ELO (기본)</option><option value="v2" ${method === 'v2' ? 'selected' : ''}>레이팅 v2 (개편 시뮬레이션)</option></select>
    </div>
  </div>`;

  if (mode === 'pro') {
    const rows = proTable(app.matches, season, app).filter(r => (!q || r.id.toLowerCase().includes(q)) && (!race || r.race === race) && (!tier || r.tier === tier));
    el.innerHTML = head + toolbar(mode, sort, showAll, q, race, tier, true) + `
      <div class="tbl" style="margin-top:-1px;border-top-left-radius:0;border-top-right-radius:0">
        <div class="rk hd"><div>순위</div><div class="c-chg"></div><div>선수</div><div class="c-tier">티어</div><div class="r">득실</div><div class="r c-rec">매치</div><div class="r c-wr">승률</div><div class="c-form">최근 5매치</div><div class="c-spark"></div></div>
        ${rows.map((r, i) => `<div class="rk ${r.id === app.me ? 'me' : ''}"><div class="num">${i + 1}</div><div class="c-chg"></div>
          <div class="name">${raceBadge(r.race)}<div><a href="#/player?id=${encodeURIComponent(r.id)}">${esc(r.id)}</a><small>${r.games}매치</small></div></div>
          <div class="c-tier">${tierBadge(r.tier)}</div><div class="rating"><b style="color:${signColor(r.diff)}">${sign(r.diff)}</b></div>
          <div class="r num c-rec">${r.w}-${r.l}</div><div class="r num c-wr">${pct(r.w, r.games)}%</div><div class="c-form">${formPills(r.form)}</div><div class="c-spark"></div></div>`).join('') || '<div class="empty">이 시즌 프로리그 기록이 없습니다</div>'}
      </div>`;
    bind(el, set);
    return;
  }

  const eng = app.engine(method, mode, allTime);
  let rows = seasonTable(app.matches, eng, season, app, refDate);
  const nEvents = app.matches.filter(m => m.kind !== 'pro' && m.date >= season.start && m.date <= season.end && (mode === 'all' || m.kind === mode)).length;
  const eligible = rows.filter(r => r.eligible && !(isCurrent && r.inactive));
  const prov = rows.filter(r => !r.eligible);

  // 하이라이트
  const hl = highlights(app, eng, season, rows, mode);

  let list = showAll ? rows.slice() : eligible.slice();
  const cmp = { skill: (a, b) => b.r - a.r, rise: (a, b) => b.d7 - a.d7 || b.r - a.r, form: (a, b) => wins(b.form) - wins(a.form) || b.streak - a.streak || b.r - a.r, act: (a, b) => b.games - a.games };
  list.sort(cmp[sort] || cmp.skill);
  list = list.filter(r => (!q || r.id.toLowerCase().includes(q)) && (!race || r.race === race) && (!tier || r.tier === tier));

  const me = app.me && rows.find(r => r.id === app.me);
  let mine = '';
  if (me) {
    const above = me.rank > 1 ? eligible[me.rank - 2] : null;
    const gap = above ? Math.ceil(above.r - me.r) : 0;
    mine = `<section class="mine">
      <div><div class="eyebrow">내 선수의 위치</div><div style="font:700 22px var(--num);margin-top:4px"><a href="#/player?id=${encodeURIComponent(me.id)}" style="color:var(--text)">${esc(me.id)}</a></div></div>
      <div><div class="k">시즌 순위</div><div class="v">${me.rank ? me.rank : '배치중'}${me.rank ? `<span class="mute small"> / ${eligible.length}명</span>` : ''}</div></div>
      <div><div class="k">레이팅</div><div class="v">${Math.round(me.r)}${me.eligible ? '' : '?'} <span class="small" style="color:${signColor(me.d7)}">7일 ${sign(me.d7)}</span></div></div>
      <div><div class="k">최근 10경기</div><div class="v">${wins(me.last10)}승 ${me.last10.length - wins(me.last10)}패</div></div>
      <div><div class="k">${above ? `다음 순위(${esc(above.id)})까지` : me.rank === 1 ? '1위 유지 중' : '랭킹 등록까지'}</div><div class="v" style="color:var(--acc2)">${above ? '+' + gap + '점' : me.rank === 1 ? '1위' : `${Math.max(0, C.ELIGIBLE.GAMES - me.games)}경기`}</div>${above ? `<div class="small mute">동급 상대 약 ${Math.max(1, Math.ceil(gap / 8))}승</div>` : ''}</div>
      <a class="btn" href="#/player?id=${encodeURIComponent(me.id)}">내 기록 →</a>
    </section>`;
  } else {
    mine = `<section class="mine" style="grid-template-columns:1fr auto"><div><div class="eyebrow">내 선수의 위치</div><div class="mute" style="margin-top:4px">내 선수를 설정하면 순위·다음 순위까지 남은 점수를 보여드려요.</div></div><button class="btn pri" data-act="setme">내 선수 설정</button></section>`;
  }

  const earlyNote = isCurrent && nEvents < 40 ? `<div class="note">${esc(season.label)}는 막 시작해서 경기 ${nEvents}건뿐입니다. <a href="#/ranking?season=${app.prevSeason(season).key}">지난 시즌(${esc(app.prevSeason(season).label)}) 최종 순위 보기 →</a></div>` : '';

  const podium = eligible.slice(0, 3);
  const medal = ['#C99A06', '#7C8796', '#B0723A'];

  el.innerHTML = head + `<div class="stack">
    ${earlyNote}
    ${podium.length ? `<section class="podium">${podium.map((r, i) => `<a href="#/player?id=${encodeURIComponent(r.id)}">
      <div class="row" style="justify-content:space-between"><b class="num" style="color:${medal[i]}">#${i + 1}</b><span class="tag" style="color:${TIER_COLOR[r.tier]};border:1px solid ${TIER_COLOR[r.tier]}">${esc(r.tier)}</span></div>
      <div class="row" style="justify-content:space-between;align-items:baseline"><b style="font:700 24px var(--num)">${esc(r.id)}</b><b class="num" style="font-size:28px;color:var(--acc2)">${Math.round(r.r)}</b></div>
      <div class="row small mute" style="justify-content:space-between"><span class="num">${r.w}승 ${r.l}패 · ${pct(r.w, r.games)}%</span>${raceLabel(r.race)}</div></a>`).join('')}</section>` : ''}
    ${hl}
    ${mine}
    <div>
    ${toolbar(mode, sort, showAll, q, race, tier, false)}
    <div class="tbl" style="border-top-left-radius:0;border-top-right-radius:0;border-top:0">
      <div class="rk hd"><div>순위</div><div class="c-chg">7일</div><div>선수</div><div class="c-tier">티어</div><div class="r">레이팅</div><div class="r c-rec">전적</div><div class="r c-wr">승률</div><div class="c-form">최근 5경기</div><div class="c-spark">${allTime ? '통산 추이' : '시즌 추이'}</div></div>
      ${list.map((r, i) => row(r, i, sort, app.me)).join('') || '<div class="empty">조건에 맞는 선수가 없습니다</div>'}
    </div>
    <div class="small mute" style="margin-top:8px">최근 5경기는 왼쪽이 오래된 경기 · 7일 변동은 ${fmtD(addDays(refDate, -7))} 대비 · ${allTime ? '<b>전체 시즌 통합</b>: 시즌 리셋 없이 첫 기록부터 이어서 계산한 통산 점수 · ' : ''}${method === 'v2' ? '레이팅 v2: 티어 시드' + (allTime ? '' : ' + 소프트 리셋') + ' + 배치 K×2' : '기존 ELO: ' + (allTime ? '' : '시즌마다 1000점 리셋, ') + '개인전 K12 티어보정 40, 팀전 K8'}</div>
    </div>
    ${!showAll && prov.length ? `<section class="card" style="border-style:dashed">
      <h2>배치중 <span class="mute num">${prov.length}명</span> <span class="mute">· ${C.ELIGIBLE.GAMES}경기 + 서로 다른 상대 ${C.ELIGIBLE.OPPONENTS}명을 채우면 랭킹 등록</span></h2>
      <div class="grid4">${prov.sort((a, b) => b.games - a.games).map(r => `<a class="tile" href="#/player?id=${encodeURIComponent(r.id)}">
        <div class="row" style="justify-content:space-between"><b style="font-size:14px">${esc(r.id)} <span class="num mute">${Math.round(r.r)}?</span></b>${tierBadge(r.tier)}</div>
        <div class="hbar"><i style="width:${Math.min(r.games, C.ELIGIBLE.GAMES) / C.ELIGIBLE.GAMES * 50 + Math.min(r.opps, C.ELIGIBLE.OPPONENTS) / C.ELIGIBLE.OPPONENTS * 50}%"></i></div>
        <div class="s num">${r.games}경기 · 상대 ${r.opps}명 · ${r.w}승 ${r.l}패</div></a>`).join('')}</div></section>` : ''}
  </div>`;
  bind(el, set, app);
}

const wins = a => a.filter(Boolean).length;

function row(r, i, sort, me) {
  const rank = !r.eligible ? '–' : sort === 'skill' ? r.rank : i + 1;
  const chg = r.eligible && sort === 'skill' ? (r.rankChg > 0 ? `<span class="up">▲${r.rankChg}</span>` : r.rankChg < 0 ? `<span class="down">▼${-r.rankChg}</span>` : '<span class="mute">–</span>') : '';
  const stk = Math.abs(r.streak) >= 2 ? (r.streak > 0 ? `${r.streak}연승` : `${-r.streak}연패`) : '';
  const sub = [r.eligible ? '' : '배치중', stk, `${r.games}경기`, `상대 ${r.opps}명`].filter(Boolean).join(' · ');
  return `<div class="rk ${r.id === me ? 'me' : ''} ${r.eligible ? '' : 'prov'}">
    <div class="num" style="font-weight:700">${rank}</div><div class="num small c-chg">${chg}</div>
    <div class="name">${raceBadge(r.race)}<div style="min-width:0"><a href="#/player?id=${encodeURIComponent(r.id)}">${esc(r.id)}</a><small>${sub}</small></div></div>
    <div class="c-tier">${tierBadge(r.tier)}</div>
    <div class="rating"><b>${Math.round(r.r)}${r.eligible ? '' : '?'}</b><small style="color:${signColor(r.d7)}">7일 ${sign(r.d7)}</small></div>
    <div class="r num c-rec">${r.w}-${r.l}</div><div class="r num c-wr">${pct(r.w, r.games)}%</div>
    <div class="c-form">${formPills(r.form)}</div><div class="c-spark">${sparkline(sample(r.spark, 24))}</div></div>`;
}

function toolbar(mode, sort, showAll, q, race, tier, isPro) {
  const M = [['all', '전체'], ['solo', '개인전'], ['team', '팀전'], ['pro', '프로리그']];
  const S = [['skill', '실력 순위', '레이팅 높은 순'], ['rise', '최근 상승', '최근 7일 레이팅 상승폭 순'], ['form', '최근 폼', '최근 5경기 승수 순'], ['act', '참여 순위', '시즌 경기 수 순 · 점수엔 반영 안 됨']];
  return `<div class="tbl" style="border-bottom-left-radius:0;border-bottom-right-radius:0">
    <div class="tbl-bar">
      <div class="seg">${M.map(([k, l]) => `<button type="button" data-set="mode" data-v="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="row">
        <label class="sr" for="rkQ">선수 검색</label><input id="rkQ" class="fld" placeholder="ID 검색" value="${esc(q)}" style="width:150px">
        <select class="fld" data-sel="race" aria-label="종족"><option value="">전 종족</option>${['Protoss', 'Terran', 'Zerg', 'Random'].map(x => `<option ${race === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <select class="fld" data-sel="tier" aria-label="티어"><option value="">전 티어</option>${TIERS.slice().reverse().map(x => `<option ${tier === x ? 'selected' : ''}>${x}</option>`).join('')}</select>
      </div>
    </div>
    ${isPro ? '<div class="tbl-bar sub small mute">프로리그는 매치 득실(승−패) 순 · 중복 의심 매치는 제외</div>' : `<div class="tbl-bar sub">
      <div class="row"><span class="small mute">정렬</span>${S.map(([k, l]) => `<button type="button" class="chip ${sort === k ? 'on' : ''}" data-set="sort" data-v="${k}">${l}</button>`).join('')}<span class="small mute">${S.find(s => s[0] === sort)[2]}</span></div>
      <label class="row" style="cursor:pointer;gap:8px"><input type="checkbox" id="rkAll" ${showAll ? '' : 'checked'} style="accent-color:var(--acc);width:18px;height:18px"> 표본 충족만 보기 <span class="small mute">(${C.ELIGIBLE.GAMES}경기·상대 ${C.ELIGIBLE.OPPONENTS}명 이상)</span></label>
    </div>`}
  </div>`;
}

function highlights(app, eng, season, rows, mode) {
  const inS = app.matches.filter(m => m.kind !== 'pro' && m.date >= season.start && m.date <= season.end && eng.events.has(m.id));
  if (!inS.length) return '';
  const best = rows.slice().sort((a, b) => b.bestSoloStreak - a.bestSoloStreak)[0];
  const curHot = rows.filter(r => r.curSoloStreak >= 3).sort((a, b) => b.curSoloStreak - a.curSoloStreak).slice(0, 2);
  let up = null;
  for (const m of inS) {
    if (m.kind !== 'solo' || m.dup) continue;
    const ev = eng.events.get(m.id); const pw = m.win1 ? ev.e : 1 - ev.e;
    if (!up || pw < up.pw) up = { m, pw, w: m.win1 ? m.p1 : m.p2, l: m.win1 ? m.p2 : m.p1 };
  }
  const pair = new Map();
  for (const m of inS) if (m.kind === 'solo') { const k = [m.p1, m.p2].sort().join('|'); const o = pair.get(k) || { n: 0, w: {} }; o.n++; const wn = m.win1 ? m.p1 : m.p2; o.w[wn] = (o.w[wn] || 0) + 1; pair.set(k, o); }
  const top = [...pair.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  const elig = rows.filter(r => r.eligible);
  const riser = elig.slice().sort((a, b) => b.d7 - a.d7)[0];
  const act = rows.slice().sort((a, b) => b.games - a.games)[0];
  const [pa, pb] = top ? top[0].split('|') : [];
  return `<section class="grid4">
    ${best && best.bestSoloStreak ? `<a class="tile" href="#/player?id=${encodeURIComponent(best.id)}"><div class="k">최장 연승 (개인전)</div><div class="v">${esc(best.id)} <span style="color:var(--acc2)">${best.bestSoloStreak}연승</span></div><div class="s">${curHot.length ? '진행중: ' + curHot.map(r => `${esc(r.id)} ${r.curSoloStreak}연승`).join(' · ') : '현재 3연승 이상 없음'}</div></a>` : ''}
    ${up ? `<a class="tile" href="#/matches?date=${up.m.date}"><div class="k">최대 이변</div><div class="v">${esc(up.w)} <span class="up">${Math.round(up.pw * 100)}%</span></div><div class="s">승리확률 ${Math.round(up.pw * 100)}%로 ${esc(up.l)} 격파 · ${fmtD(up.m.date)} ${esc(up.m.map)}</div></a>` : ''}
    ${top ? `<a class="tile" href="#/analysis?a=${encodeURIComponent(pa)}&b=${encodeURIComponent(pb)}"><div class="k">최다 라이벌전</div><div class="v">${esc(pa)} <span class="mute num">${top[1].w[pa] || 0}:${top[1].w[pb] || 0}</span> ${esc(pb)}</div><div class="s">개인전 ${top[1].n}전 · 전력 분석 보기 →</div></a>` : ''}
    ${riser ? `<a class="tile" href="#/player?id=${encodeURIComponent(riser.id)}"><div class="k">최근 7일 상승</div><div class="v">${esc(riser.id)} <span style="color:${signColor(riser.d7)}">${sign(riser.d7)}</span></div><div class="s">참여 리더 ${esc(act.id)} ${act.games}경기</div></a>` : ''}
  </section>`;
}

function bind(el, set, app) {
  el.querySelectorAll('[data-set]').forEach(b => b.onclick = () => set(b.dataset.set, b.dataset.v));
  el.querySelectorAll('[data-sel]').forEach(s => s.onchange = () => set(s.dataset.sel, s.value));
  const ss = el.querySelector('#rkSeason'); if (ss) ss.onchange = () => set('season', ss.value);
  const sm = el.querySelector('#rkMethod'); if (sm) sm.onchange = () => set('method', sm.value);
  const all = el.querySelector('#rkAll'); if (all) all.onchange = () => set('all', all.checked ? '' : '1');
  const q = el.querySelector('#rkQ');
  if (q) {
    if (window.__rkQFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); window.__rkQFocus = false; }
    let t; q.oninput = () => { clearTimeout(t); t = setTimeout(() => { window.__rkQFocus = true; set('q', q.value); }, 350); };
  }
  const sm2 = el.querySelector('[data-act="setme"]'); if (sm2 && app) sm2.onclick = () => app.pickMe();
}
