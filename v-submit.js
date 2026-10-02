import { esc, fmtD, timeAgo, todayKST, expected, C } from './util.js?v=20261002l';
import { store, isDemo } from './store.js?v=20261002l';
import { isConfirmed } from './data.js?v=20261002l';
import { soloOdds } from './rating.js?v=20261002l';

let draft = null;
// 맵 이름 앞의 "2:2", "3:3", "4:4" → 팀당 인원 (없으면 0 = 개인전 맵)
const teamSize = map => { const m = /^(\d)\s*:\s*(\d)/.exec(map || ''); return m ? +m[1] : 0; };
// 세트 맵이 바뀌면 개인전/팀전 형식을 맵에 맞춤
function fitSet(d, s) {
  const n = teamSize(s.map);
  if (n >= 2) {
    if (s.type !== 'team') { s.type = 'team'; s.t1 = []; s.t2 = []; delete s.p1; delete s.p2; }
    s.t1 = (s.t1 || []).slice(0, n); s.t2 = (s.t2 || []).slice(0, n);
    if (!s.t1.length && d.t1.length === n) s.t1 = d.t1.slice();
    if (!s.t2.length && d.t2.length === n) s.t2 = d.t2.slice();
  } else if (s.type === 'team' && d.kind === 'pro') {
    s.type = 'solo'; s.p1 = ''; s.p2 = ''; delete s.t1; delete s.t2;
  }
}
const newDraft = () => ({ kind: 'pro', date: todayKST(), t1: [], t2: [], sets: [], confirmer: '' });

export async function render(app, el, p) {
  if (!draft) draft = newDraft();
  if (app.me && !draft.t1.length && !draft.t2.length && !draft._init) { draft.t1 = [app.me]; draft._init = true; }
  const subs = app.subs;
  const me = app.me;
  const sideOf = (s, id) => s.team1.includes(id) ? 1 : s.team2.includes(id) ? 2 : 0;
  const statusOf = s => s.status === 'pending' && isConfirmed(s) ? 'auto' : s.status;
  const toConfirm = me ? subs.filter(s => s.status === 'pending' && !isConfirmed(s) && s.submitter !== me && sideOf(s, me) && sideOf(s, me) !== sideOf(s, s.submitter)) : [];
  const mine = me ? subs.filter(s => s.submitter === me) : [];
  const regs = (app.pendingRegs || []).filter(r => app.isAdmin() || r.submitter === me);
  const RACE_KO_ = { Protoss: '프로토스', Terran: '테란', Zerg: '저그', Random: '랜덤' };
  const fixes = app.fixes || [];
  const fixConfirm = me ? fixes.filter(f => f.status === 'pending' && !isConfirmed(f) && f.submitter !== me && f.team1.includes(me)) : [];
  const myFixes = me ? fixes.filter(f => f.submitter === me) : [];
  const doneFixes = fixes.filter(f => isConfirmed(f));
  const fixRow = (f, actions) => `<div class="subrow" style="display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--card2);border-radius:10px;padding:10px 14px;margin-top:8px">
    <span class="num mute small">${fmtD(f.match_date)}</span>
    <div style="min-width:0"><div style="font-weight:600"><span class="tag warn">수정 요청</span> ${esc(f.sets.fix.title || '')}</div>
      <div style="font-size:14px;margin-top:3px">${esc(f.sets.fix.summary || '')}</div>
      <div class="small mute">요청 ${esc(f.submitter)} · ${timeAgo(f.created_at)} · 사유: ${esc(f.sets.fix.reason || '')}${f.confirmed_by ? ` · 확인 ${esc(f.confirmed_by)}` : ''}${f.dispute_reason ? ` · 이의: ${esc(f.dispute_reason)}` : ''}</div></div>
    <div class="row">${actions || `<span class="tag ${ST[statusOf(f)][1]}">${ST[statusOf(f)][0]}</span>`}</div></div>`;
  const others = subs.filter(s => s.status !== 'canceled' && !toConfirm.includes(s) && !mine.includes(s)).slice(0, 15);
  const ST = { pending: ['대기', 'mute'], confirmed: ['확인됨 · 반영', 'ok'], auto: ['자동 반영', 'ok'], disputed: ['이의 제기', 'warn'], canceled: ['취소', 'mute'] };
  const title = s => `${s.kind === 'pro' ? '프로리그' : s.kind === 'solo' ? '개인전' : '팀전'} · ${s.team1.map(esc).join(' · ')} vs ${s.team2.map(esc).join(' · ')}`;
  const score = s => { const w = s.sets.filter(x => x.side === 1).length; return `${w}:${s.sets.length - w}`; };
  const subRow = (s, actions) => `<div class="subrow" style="display:grid;grid-template-columns:64px minmax(0,1fr) 60px auto;gap:12px;align-items:center;background:var(--card2);border-radius:10px;padding:10px 14px;margin-top:8px">
    <span class="num mute small">${fmtD(s.match_date)}</span>
    <div style="min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${title(s)}</div><div class="small mute">제출 ${esc(s.submitter)} · ${timeAgo(s.created_at)}${s.confirmed_by ? ` · 확인 ${esc(s.confirmed_by)}` : ''}${s.dispute_reason ? ` · 사유: ${esc(s.dispute_reason)}` : ''}</div></div>
    <b class="num" style="font-size:18px;text-align:center">${score(s)}</b>
    <div class="row">${actions || `<span class="tag ${ST[statusOf(s)][1]}">${ST[statusOf(s)][0]}</span>`}</div></div>`;

  el.innerHTML = `
  <div class="head"><div><div class="eyebrow">SUBMIT &amp; CONFIRM</div><h1 class="title">결과 제출 · 확인</h1>
    <div class="desc">관리자 승인 없이, 상대 팀 1명이 "맞아요"를 누르면 바로 반영됩니다 · ${C.AUTO_CONFIRM_HOURS}시간 안에 응답이 없으면 자동 반영 · 이의 제기 시에만 운영진 검토</div></div>
    ${isDemo ? '<span class="tag warn">시연 모드 · 이 브라우저에만 저장</span>' : ''}</div>
  <div class="stack">
  ${!me ? `<div class="note">결과를 제출·확인하려면 먼저 <b>내 선수</b>를 설정해 주세요. <button class="btn pri" data-setme style="margin-left:8px">내 선수 설정</button></div>` : ''}
  ${me ? `<section class="card"><h2>내가 확인할 결과 <span class="num" style="color:var(--acc2)">${toConfirm.length + fixConfirm.length}</span></h2>
    ${toConfirm.map(s => subRow(s, `<button class="btn blue" data-ok="${s.id}">맞아요</button><button class="btn" data-no="${s.id}">이의 제기</button>`)).join('')}
    ${fixConfirm.map(f => fixRow(f, `<button class="btn blue" data-ok="${f.id}">맞아요</button><button class="btn" data-no="${f.id}">이의 제기</button>`)).join('')}
    ${toConfirm.length + fixConfirm.length ? '' : '<div class="mute small">확인할 결과가 없습니다</div>'}</section>` : ''}
  ${regs.length ? `<section class="card"><h2>선수 등록 신청 <span class="mute">${app.isAdmin() ? '운영진 승인 필요' : '운영진 승인 대기 중'}</span></h2>${regs.map(r => { const p = r.sets.player; return `<div class="subrow" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--card2);border-radius:10px;padding:10px 14px;margin-top:8px">
      <div><b>${esc(p.id)}</b> <span class="small mute">· ${esc(RACE_KO_[p.race] || p.race || '')} · ${esc(p.tier || '')}</span><div class="small mute">신청 ${esc(r.submitter)} · ${timeAgo(r.created_at)}</div></div>
      <div class="row">${app.isAdmin() ? `<button class="btn blue" data-regok="${r.id}">승인</button><button class="btn" data-regno="${r.id}">거절</button>` : '<span class="tag mute">승인 대기</span>'}</div></div>`; }).join('')}</section>` : ''}
  <section class="card" id="newForm"></section>
  ${mine.length ? `<section class="card"><h2>내가 제출한 결과</h2>${mine.map(s => subRow(s, s.status === 'pending' && !isConfirmed(s) ? `<span class="tag mute">확인 대기</span><button class="btn" data-cancel="${s.id}">취소</button>` : '')).join('')}</section>` : ''}
  ${myFixes.length ? `<section class="card"><h2>내가 올린 수정·삭제 요청</h2>${myFixes.map(f => fixRow(f, f.status === 'pending' && !isConfirmed(f) ? `<span class="tag mute">확인 대기</span><button class="btn" data-cancel="${f.id}">취소</button>` : '')).join('')}</section>` : ''}
  ${doneFixes.length ? `<section class="card"><h2>반영된 수정·삭제 <span class="mute">v2에 반영됨 · 운영진은 공식 DB에도 옮겨 주세요</span></h2>${doneFixes.map(f => fixRow(f)).join('')}</section>` : ''}
  ${others.length ? `<section class="card"><h2>최근 제출된 결과 <span class="mute">전체 공개</span></h2>${others.map(s => subRow(s)).join('')}</section>` : ''}
  </div>`;

  const sm = el.querySelector('[data-setme]'); if (sm) sm.onclick = () => app.pickMe();
  el.querySelectorAll('[data-ok]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await store.update('submissions', b.dataset.ok, { status: 'confirmed', confirmed_by: me, confirmed_at: new Date().toISOString() }); app.toast('확인했습니다. 기록에 반영됩니다'); await app.reloadSubs(); }
    catch (e) { app.toast(e.message); b.disabled = false; }
  });
  el.querySelectorAll('[data-no]').forEach(b => b.onclick = () => app.modal(`<h3 id="modalTitle">이의 제기</h3><p class="mute small">어떤 부분이 다른지 적어 주세요. 운영진이 확인합니다.</p>
    <textarea id="dr" class="fld" style="width:100%" maxlength="300" placeholder="예: 2세트 승자가 반대예요"></textarea>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>취소</button><button class="btn pri" id="drGo">이의 제기</button></div>`, m => {
      m.querySelector('#drGo').onclick = async () => {
        const reason = m.querySelector('#dr').value.trim(); if (!reason) return app.toast('사유를 적어 주세요');
        try { await store.update('submissions', b.dataset.no, { status: 'disputed', confirmed_by: me, dispute_reason: reason }); app.closeModal(); app.toast('이의 제기했습니다'); await app.reloadSubs(); } catch (e) { app.toast(e.message); }
      };
    }));
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
    if (!window.confirm('이 제출을 취소할까요?')) return;
    try { await store.update('submissions', b.dataset.cancel, { status: 'canceled' }); app.toast('취소했습니다'); await app.reloadSubs(); } catch (e) { app.toast(e.message); }
  });
  el.querySelectorAll('[data-regok]').forEach(b => b.onclick = async () => {
    if (!app.isAdmin()) return; b.disabled = true;
    try { await store.update('submissions', b.dataset.regok, { status: 'confirmed', confirmed_by: me, confirmed_at: new Date().toISOString() }); app.toast('승인했습니다. 선수 목록에 추가됩니다'); await app.reloadSubs(); }
    catch (e) { app.toast(e.message); b.disabled = false; }
  });
  el.querySelectorAll('[data-regno]').forEach(b => b.onclick = async () => {
    if (!app.isAdmin() || !window.confirm('이 등록 신청을 거절할까요?')) return; b.disabled = true;
    try { await store.update('submissions', b.dataset.regno, { status: 'canceled', confirmed_by: me, dispute_reason: '운영진 거절' }); app.toast('거절했습니다'); await app.reloadSubs(); }
    catch (e) { app.toast(e.message); b.disabled = false; }
  });
  renderForm(app, el.querySelector('#newForm'));
}

function renderForm(app, box) {
  const d = draft;
  const ids = [...app.players.keys()].filter(x => !C.HIDE_IDS.includes(x)).sort((a, b) => a.localeCompare(b));
  const maps = (app.maps.length ? app.maps.map(m => m.map_name) : ['투혼', '폴리포이드', '폴스타', '녹아웃', '옥타곤', '애티튜드']);
  const teamMaps = ['2:2생컨', '2:2투혼', '3:3헌터', '3:3생컨', '4:4헌터'];
  const allMaps = [...new Set([...maps, ...teamMaps, '투혼(에결)'])];
  const eng = app.engine(app.method, 'all');
  const R = id => eng.R.get(id) ?? 1000;
  if (d.kind === 'solo') { d.t1 = d.t1.slice(0, 1); d.t2 = d.t2.slice(0, 1); if (!d.sets.length) d.sets = [{ type: 'solo', map: maps[0], p1: '', p2: '', side: 0 }]; d.sets = d.sets.slice(0, 1); d.sets[0].p1 = d.t1[0] || ''; d.sets[0].p2 = d.t2[0] || ''; }
  if (d.kind === 'team') { if (!d.sets.length) d.sets = [{ type: 'team', map: teamMaps[0], side: 0 }]; d.sets = d.sets.slice(0, 1); d.sets[0].type = 'team'; d.sets[0].t1 = d.t1; d.sets[0].t2 = d.t2; }
  if (d.kind === 'pro' && !d.sets.length) d.sets = [{ type: 'solo', map: maps[0], p1: '', p2: '', side: 0 }];

  const chips = (team) => {
    const arr = d['t' + team];
    const max = d.kind === 'solo' ? 1 : 4;
    return `<div class="row" style="background:var(--bg);border:1px solid var(--line2);border-radius:8px;padding:6px;min-height:46px;gap:6px">
      ${arr.map(x => `<button class="chip" data-rm="${team}|${esc(x)}" title="빼기">${esc(x)} ✕</button>`).join('')}
      ${arr.length < max ? `<select class="fld" data-add="${team}" style="min-height:34px;padding:4px 8px;border-style:dashed" aria-label="팀 ${team} 선수 추가"><option value="">+ 선수</option><option value="__new">＋ 목록에 없는 선수 등록 신청…</option>${ids.filter(x => !d.t1.includes(x) && !d.t2.includes(x)).map(x => `<option>${esc(x)}</option>`).join('')}</select>` : ''}
    </div>`;
  };
  const setRow = (s, i) => {
    const pick = side => `class="btn ${s.side === side ? 'blue' : ''}" data-win="${i}|${side}" style="width:100%"`;
    let A, B, e = 0.5;
    if (s.type === 'solo') {
      A = `<select class="fld" data-sp="${i}|p1" aria-label="팀1 선수" style="width:100%"><option value="">팀1 선수</option>${d.t1.map(x => `<option ${s.p1 === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      B = `<select class="fld" data-sp="${i}|p2" aria-label="팀2 선수" style="width:100%"><option value="">팀2 선수</option>${d.t2.map(x => `<option ${s.p2 === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      if (s.p1 && s.p2) e = soloOdds(app, app.method, eng, s.p1, s.p2, app.current.key).e;
    } else {
      const t1 = s.t1 || [], t2 = s.t2 || [];
      const n = teamSize(s.map);
      const tog = (team, arr) => `<div class="row" style="gap:4px">${d['t' + team].map(x => `<button type="button" class="chip ${arr.includes(x) ? 'on' : ''}" data-tt="${i}|t${team}|${esc(x)}" style="min-height:32px;padding:4px 10px">${arr.includes(x) ? '✓ ' : ''}${esc(x)}</button>`).join('') || '<span class="small mute">위 팀 칸에 선수를 먼저 넣으세요</span>'}<span class="small ${n && arr.length === n ? 'up' : 'mute'}" style="margin-left:4px">${n ? `${arr.length}/${n}명` : `${arr.length}명`}</span></div>`;
      A = d.kind === 'pro' ? tog(1, t1) : `<div class="small">${t1.map(esc).join(' · ') || '팀1'}</div>`;
      B = d.kind === 'pro' ? tog(2, t2) : `<div class="small">${t2.map(esc).join(' · ') || '팀2'}</div>`;
      if (t1.length && t2.length) e = expected(t1.reduce((a, x) => a + R(x), 0) / t1.length, t2.reduce((a, x) => a + R(x), 0) / t2.length);
    }
    return `<div class="fset" style="display:grid;grid-template-columns:28px 130px minmax(0,1fr) minmax(0,1fr) 120px 32px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)">
      <span class="num mute">${i + 1}</span>
      <select class="fld" data-map="${i}" aria-label="맵">${allMaps.map(m => `<option ${s.map === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <div style="display:flex;flex-direction:column;gap:4px">${A}<button ${pick(1)}>팀1 승</button></div>
      <div style="display:flex;flex-direction:column;gap:4px">${B}<button ${pick(2)}>팀2 승</button></div>
      <span class="small mute">예상 ${Math.round(e * 100)}:${100 - Math.round(e * 100)}</span>
      ${d.kind === 'pro' && d.sets.length > 1 ? `<button class="btn" data-del="${i}" aria-label="세트 삭제" style="padding:4px;min-height:32px">✕</button>` : '<span></span>'}
    </div>`;
  };
  const w1 = d.sets.filter(s => s.side === 1).length, w2 = d.sets.filter(s => s.side === 2).length;
  const errors = validate(d);
  const dup = findDup(app, d);

  box.innerHTML = `<h2>새 결과 입력</h2>
    <div class="row" style="margin-bottom:14px"><div class="seg">${[['pro', '프로리그'], ['solo', '개인전'], ['team', '팀전']].map(([k, l]) => `<button type="button" data-kind="${k}" class="${d.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="row small mute">날짜 <input type="date" class="fld" id="fDate" value="${d.date}" max="${todayKST()}"></label></div>
    <div class="grid2" style="gap:12px"><div><div class="small mute" style="margin-bottom:6px">${d.kind === 'solo' ? '선수 1' : '팀 1'}</div>${chips(1)}</div><div><div class="small mute" style="margin-bottom:6px">${d.kind === 'solo' ? '선수 2' : '팀 2'}</div>${chips(2)}</div></div>
    <div style="margin-top:14px">${d.sets.map(setRow).join('')}</div>
    ${d.kind === 'pro' ? `<div class="row" style="margin-top:8px"><button class="btn" data-addset="solo">+ 개인전 세트</button><button class="btn" data-addset="team">+ 팀전 세트</button></div>` : ''}
    <div class="row" style="justify-content:space-between;margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
      <div class="row"><span class="mute small">스코어 자동 계산</span><b class="num" style="font-size:26px">${w1} : ${w2}</b></div>
      <div class="row"><label class="sr" for="fConf">확인할 사람</label><select id="fConf" class="fld"><option value="">상대 팀 아무나 확인</option>${(d.t2.includes(app.me) ? d.t1 : d.t2).map(x => `<option ${d.confirmer === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <button class="btn pri" id="fGo" ${errors.length || !app.me ? 'disabled' : ''}>제출하기</button></div>
    </div>
    ${dup ? `<div class="warnbox" style="margin-top:12px"><b>같은 날 비슷한 기록이 이미 있습니다.</b> ${esc(dup)} 다른 경기라면 그대로 제출하세요.</div>` : ''}
    ${errors.length ? `<div class="small mute" style="margin-top:10px">${errors.map(esc).join(' · ')}</div>` : ''}
    ${app.me && !d.t1.includes(app.me) && !d.t2.includes(app.me) && (d.t1.length || d.t2.length) ? `<div class="small" style="color:var(--warn);margin-top:6px">본인(${esc(app.me)})이 출전하지 않은 경기도 제출할 수 있지만, 확인은 두 팀 중 한 명이 해야 합니다.</div>` : ''}`;

  const rerender = () => renderForm(app, box);
  box.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { const k = b.dataset.kind; draft = { ...newDraft(), kind: k, date: d.date, t1: k === 'solo' ? d.t1.slice(0, 1) : d.t1, t2: k === 'solo' ? d.t2.slice(0, 1) : d.t2 }; rerender(); });
  box.querySelector('#fDate').onchange = e => { d.date = e.target.value; rerender(); };
  box.querySelectorAll('[data-add]').forEach(s => s.onchange = () => { const team = s.dataset.add; if (s.value === '__new') { s.value = ''; return app.registerPlayer(id => { if (app.players.has(id)) d['t' + team].push(id); rerender(); }); } if (s.value) d['t' + team].push(s.value); rerender(); });
  box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const [t, id] = b.dataset.rm.split('|'); d['t' + t] = d['t' + t].filter(x => x !== id); d.sets.forEach(s => { if (s.p1 === id) s.p1 = ''; if (s.p2 === id) s.p2 = ''; if (s.t1) s.t1 = s.t1.filter(x => x !== id); if (s.t2) s.t2 = s.t2.filter(x => x !== id); }); rerender(); });
  box.querySelectorAll('[data-map]').forEach(s => s.onchange = () => { const st = d.sets[+s.dataset.map]; st.map = s.value; if (d.kind !== 'solo') fitSet(d, st); rerender(); });
  box.querySelectorAll('[data-sp]').forEach(s => s.onchange = () => { const [i, k] = s.dataset.sp.split('|'); d.sets[+i][k] = s.value; rerender(); });
  box.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => {
    const [i, k, id] = b.dataset.tt.split('|'); const st = d.sets[+i]; const arr = st[k] || []; const n = teamSize(st.map);
    if (arr.includes(id)) st[k] = arr.filter(x => x !== id);
    else if (n && arr.length >= n) { if (n === 1) st[k] = [id]; else return app.toast(`${st.map}은 팀당 ${n}명이에요. 먼저 한 명을 빼 주세요`); }
    else st[k] = [...arr, id];
    rerender();
  });
  box.querySelectorAll('[data-win]').forEach(b => b.onclick = () => { const [i, side] = b.dataset.win.split('|'); d.sets[+i].side = +side; rerender(); });
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { d.sets.splice(+b.dataset.del, 1); rerender(); });
  box.querySelectorAll('[data-addset]').forEach(b => b.onclick = () => { const t = b.dataset.addset; const st = t === 'solo' ? { type: 'solo', map: maps[0], p1: '', p2: '', side: 0 } : { type: 'team', map: teamMaps.find(m => teamSize(m) === Math.min(d.t1.length, d.t2.length)) || teamMaps[0], t1: [], t2: [], side: 0 }; if (t === 'team') fitSet(d, st); d.sets.push(st); rerender(); });
  box.querySelector('#fConf').onchange = e => { d.confirmer = e.target.value; };
  box.querySelector('#fGo').onclick = async () => {
    const btn = box.querySelector('#fGo'); btn.disabled = true;
    const sets = d.sets.map(s => s.type === 'solo' ? { map: s.map, p1: s.p1, p2: s.p2, winner: s.side === 1 ? s.p1 : s.p2, side: s.side } : { map: s.map, t1: s.t1, t2: s.t2, side: s.side });
    try {
      await store.insert('submissions', { match_date: d.date, kind: d.kind, team1: d.t1, team2: d.t2, sets, submitter: app.me, confirmer: d.confirmer || null, status: 'pending' });
      draft = null; app.toast('제출했습니다. 상대 팀 확인을 기다립니다'); await app.reloadSubs();
    } catch (e) { app.toast(e.message); btn.disabled = false; }
  };
}

function validate(d) {
  const e = [];
  if (!d.date) e.push('날짜를 고르세요');
  if (!d.t1.length || !d.t2.length) e.push('양쪽 선수를 넣으세요');
  d.sets.forEach((s, i) => {
    if (s.type === 'solo' && (!s.p1 || !s.p2)) e.push(`${i + 1}세트 선수를 고르세요`);
    const n = teamSize(s.map);
    if (s.type === 'team' && (!(s.t1 || []).length || !(s.t2 || []).length)) e.push(`${i + 1}세트 출전 선수를 고르세요`);
    else if (s.type === 'team' && n && ((s.t1 || []).length !== n || (s.t2 || []).length !== n)) e.push(`${i + 1}세트(${s.map})는 팀당 ${n}명씩 고르세요`);
    if (!s.side) e.push(`${i + 1}세트 승자를 누르세요`);
  });
  return e;
}

function findDup(app, d) {
  if (!d.t1.length || !d.t2.length) return '';
  const ps = new Set([...d.t1, ...d.t2]);
  const off = app.matches.find(m => m.date === d.date && (m.kind === 'pro' ? [...m.t1, ...m.t2] : m.kind === 'solo' ? [m.p1, m.p2] : [...m.t1, ...m.t2]).filter(x => ps.has(x)).length >= Math.min(ps.size, 2) && (d.kind !== 'pro' || m.kind === 'pro'));
  if (off) return `${fmtD(d.date)} 공식 기록에 같은 선수들의 ${off.kind === 'pro' ? '프로리그' : '경기'}가 있습니다.`;
  const sub = app.subs.find(s => s.match_date === d.date && s.status !== 'canceled' && [...s.team1, ...s.team2].filter(x => ps.has(x)).length >= Math.min(ps.size, 2));
  if (sub) return `${esc(sub.submitter)}님이 ${timeAgo(sub.created_at)} 비슷한 결과를 제출했습니다.`;
  return '';
}
