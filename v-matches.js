import { esc, fmtD, go, sign } from './util.js?v=20261002l';
import { sides } from './rating.js?v=20261002l';
import { store } from './store.js?v=20261002l';
import { timeAgo } from './util.js?v=20261002l';

export function render(app, el, p) {
  const eng = app.engine(app.method, 'all');
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
  { const dd = el.querySelector('.days'), on = dd && dd.querySelector('.on'); if (on) dd.scrollLeft = on.offsetLeft - dd.offsetLeft - dd.clientWidth / 2 + on.clientWidth / 2; }
  el.querySelector('#mKind').onchange = e => set('kind', e.target.value);
  el.querySelector('#mDate').onchange = e => set('date', e.target.value);
  const cl = el.querySelector('[data-clear]'); if (cl) cl.onclick = e => { e.preventDefault(); set('q', ''); };
  const qi = el.querySelector('#mQ');
  qi.onkeydown = e => { if (e.key === 'Enter') set('q', qi.value.trim()); };
  qi.onchange = () => set('q', qi.value.trim());
  el.querySelectorAll('[data-fix]').forEach(b => b.onclick = () => openFix(app, app.matches.find(m => String(m.id) === b.dataset.fix)));
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
    <div class="pbar duo"><span class="pa${pa > 50 ? ' fav' : ''}" style="text-align:right">${pa}</span><div class="bar"><i class="t1" style="width:${pa}%"></i><i class="t2"></i></div><span class="pb${pa < 50 ? ' fav' : ''}">${100 - pa}</span></div>
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
        ${dupOf ? '<span class="tag warn">중복 의심 · 같은 날 같은 구성·결과 기록이 이미 있음</span>' : ''}${m.src === 'submitted' ? '<span class="tag ok">제출 반영</span>' : ''}${fixTag(app, m)}</div>
        <div class="row">${fixBtn(app, m)}${m.sets.length ? `<button class="btn" data-toggle="s-${m.id}" style="min-height:34px;padding:4px 12px">${dupOf ? '세트 보기 ▾' : '접기 ▴'}</button>` : ''}</div></div>
      <div class="mscore"><div class="${m.win1 ? 'win' : 'lose'}"><div class="small mute">TEAM 1</div>${m.t1.map(P).join(' · ')}</div>
        <div class="s num">${esc(sc1)} <span style="color:var(--mute2)">:</span> ${esc(sc2)}</div>
        <div class="${!m.win1 ? 'win' : 'lose'}" style="text-align:right"><div class="small mute">TEAM 2</div>${m.t2.map(P).join(' · ')}</div></div>
      <div id="s-${m.id}" ${dupOf ? 'hidden' : ''}>
        <div class="set small mute" style="padding-top:6px;padding-bottom:6px"><span>세트</span><span class="c-map">맵</span><span class="a" style="color:#2F5BEA;font-weight:600">Team 1</span><span class="pbar" style="justify-content:center">경기 전 승리 확률</span><span style="color:#E5531F;font-weight:600">Team 2</span><span style="text-align:right">변동</span></div>
        ${m.sets.map((s, i) => setRow(eng, s, i)).join('')}
      </div></article>`;
  }
  return `<article class="mcard"><div class="mhead" style="padding:8px 18px"><div class="row"><span class="tag mute">${m.kind === 'solo' ? '개인전' : '팀전'}</span><span class="small mute">${showDate ? fmtD(m.date) : ''}</span>${m.src === 'submitted' ? '<span class="tag ok">제출 반영</span>' : ''}${fixTag(app, m)}</div>${fixBtn(app, m)}</div>${setRow(eng, m, 0)}</article>`;
}

function fixTag(app, m) {
  const pend = app.pendingFix.get(String(m.id));
  if (pend) return `<span class="tag warn">${pend.sets.fix.del && pend.sets.fix.del.includes(m.id) ? '삭제' : '수정'} 요청 중 · 확인 대기</span>`;
  if (m.fixed || (m.sets || []).some(x => x.fixed)) return '<span class="tag info">수정 반영됨</span>';
  return '';
}
function fixBtn(app, m) {
  if (app.pendingFix.has(String(m.id))) return '';
  return `<button class="btn" data-fix="${esc(m.id)}" style="min-height:34px;padding:4px 12px;font-size:13px">수정·삭제 요청</button>`;
}

function openFix(app, m) {
  if (!m) return;
  if (!app.me) { app.toast('먼저 내 선수를 설정해 주세요'); return app.pickMe(); }
  const rows = m.kind === 'pro' ? m.sets : [m];
  const maps = [...new Set([...(app.maps || []).map(x => x.map_name), '투혼', '폴리포이드', '폴스타', '녹아웃', '옥타곤', '애티튜드', '2:2생컨', '2:2투혼', '3:3헌터', '3:3생컨', '4:4헌터', '투혼(에결)'])];
  const label = x => x.kind === 'solo' ? `${x.p1} vs ${x.p2}` : `${x.t1.join('·')} vs ${x.t2.join('·')}`;
  const winner = x => x.kind === 'solo' ? (x.win1 ? x.p1 : x.p2) : (x.win1 ? x.t1 : x.t2).join('·');
  app.modal(`<h3 id="modalTitle">경기 기록 수정·삭제 요청</h3>
    <p class="mute small">${fmtD(m.date)} ${m.kind === 'pro' ? `프로리그 ${esc(m.t1.join('·'))} vs ${esc(m.t2.join('·'))}` : esc(label(m))} · 경기에 뛴 다른 선수 1명이 확인하면 v2에 반영됩니다(48시간 무응답 시 자동).</p>
    <label class="row" style="margin:10px 0;gap:8px;cursor:pointer"><input type="checkbox" id="fxAll" style="width:18px;height:18px;accent-color:var(--acc)"> <b>이 경기 전체 삭제</b> <span class="small mute">(잘못 입력됐거나 중복)</span></label>
    <div id="fxRows">${rows.map((x, i) => `<div style="border-top:1px solid var(--line);padding:10px 0;display:flex;flex-direction:column;gap:6px">
      <div class="small"><b>${m.kind === 'pro' ? (i + 1) + '세트 · ' : ''}${esc(label(x))}</b> <span class="mute">· 기록상 승자 ${esc(winner(x))}</span></div>
      <div class="row" style="gap:12px">
        <label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-swap="${esc(x.id)}" style="width:16px;height:16px;accent-color:var(--acc)"> 승자 바꾸기</label>
        <label class="row small" style="gap:6px">맵 <select class="fld" data-map="${esc(x.id)}" style="min-height:34px;padding:4px 8px">${maps.map(mp => `<option ${mp === x.map ? 'selected' : ''}>${esc(mp)}</option>`).join('')}</select></label>
        ${m.kind === 'pro' ? `<label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" data-del="${esc(x.id)}" style="width:16px;height:16px;accent-color:var(--acc)"> 이 세트 삭제</label>` : ''}
      </div></div>`).join('')}</div>
    <label class="lbl" style="margin-top:8px">사유 (필수)<textarea id="fxWhy" class="fld" maxlength="300" placeholder="예: 3세트 승자가 반대로 입력됐어요 / 같은 경기가 두 번 입력됐어요"></textarea></label>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>취소</button><button class="btn pri" id="fxGo">요청 올리기</button></div>`, md => {
    const all = md.querySelector('#fxAll');
    all.onchange = () => { md.querySelector('#fxRows').style.opacity = all.checked ? .35 : 1; };
    md.querySelector('#fxGo').onclick = async () => {
      const reason = md.querySelector('#fxWhy').value.trim();
      if (!reason) return app.toast('사유를 적어 주세요');
      const del = [], edit = {}, parts = [];
      if (all.checked) { del.push(m.id, ...rows.filter(x => x.id !== m.id).map(x => x.id)); parts.push('경기 전체 삭제'); }
      else {
        rows.forEach((x, i) => {
          const pre = m.kind === 'pro' ? `${i + 1}세트 ` : '';
          if (md.querySelector(`[data-del="${CSS.escape(String(x.id))}"]`)?.checked) { del.push(x.id); parts.push(pre + '삭제'); return; }
          const e = {};
          if (md.querySelector(`[data-swap="${CSS.escape(String(x.id))}"]`).checked) { e.swap = true; parts.push(pre + '승자 변경'); }
          const mp = md.querySelector(`[data-map="${CSS.escape(String(x.id))}"]`).value;
          if (mp !== x.map) { e.map = mp; parts.push(pre + `맵 → ${mp}`); }
          if (Object.keys(e).length) edit[x.id] = e;
        });
        if (m.kind === 'pro' && (del.length || Object.keys(edit).length)) edit[m.id] = { ...(edit[m.id] || {}), recount: true };
      }
      if (!del.length && !Object.keys(edit).length) return app.toast('바꿀 내용을 선택해 주세요');
      const players = [...new Set(m.kind === 'pro' ? [...m.t1, ...m.t2] : sides(m).flat())];
      const btn = md.querySelector('#fxGo'); btn.disabled = true;
      try {
        await store.insert('submissions', { match_date: m.date, kind: 'solo', team1: players, team2: [], status: 'pending', submitter: app.me,
          sets: { fix: { target: m.id, del, edit, reason, summary: parts.join(', '), title: m.kind === 'pro' ? `프로리그 ${m.t1.join('·')} vs ${m.t2.join('·')}` : label(m) } } });
        app.closeModal(); app.toast('수정 요청을 올렸어요. 상대 선수 확인을 기다립니다'); await app.reloadSubs();
      } catch (e) { app.toast(e.message); btn.disabled = false; }
    };
  });
}
