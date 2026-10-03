import { C, esc, qs, go, ls, uid, seasonOf, currentSeason, todayKST, raceLabel } from './util.js?v=20261002m';
import { loadOfficial, normalize, submissionsToRows, isConfirmed, isFix, isReg, applyFixes } from './data.js?v=20261002m';
import { runEngine } from './rating.js?v=20261002m';
import { store, isDemo } from './store.js?v=20261002m';
import * as ranking from './v-ranking.js?v=20261002m';
import * as matches from './v-matches.js?v=20261002m';
import * as player from './v-player.js?v=20261002m';
import * as analysis from './v-analysis.js?v=20261002m';
import * as submit from './v-submit.js?v=20261002m';
import * as board from './v-board.js?v=20261002m';
import * as guide from './v-guide.js?v=20261002m';
import * as tour from './v-tour.js?v=20261002m';

const VIEWS = { ranking, matches, player, analysis, submit, board, guide, tour };
const $ = s => document.querySelector(s);

const app = {
  players: new Map(), snaps: {}, maps: [], rows: [], subs: [], fixes: [], allSubs: [], matches: [], pendingFix: new Map(), current: currentSeason(),
  me: ls.get('rc.me', null),
  _eng: new Map(),
  isAdmin() { return !!this.me && (C.ADMINS || []).includes(this.me); },
  method: (window.RC_CONFIG && window.RC_CONFIG.DEFAULT_METHOD) || 'legacy',

  tierAt(id, sk) { return (sk && this.snaps[sk] && this.snaps[sk][id]) || (this.players.get(id) || {}).tier || 'Silver'; },
  seasonOf,
  engine(method = 'v2', filter = 'all', allTime = false) {
    const k = method + '|' + filter + (allTime ? '|all' : '');
    if (!this._eng.has(k)) this._eng.set(k, runEngine(this.matches, this, method, filter, allTime));
    return this._eng.get(k);
  },
  seasonsWithData() {
    const ds = new Set(this.matches.map(m => (seasonOf(m.date) || {}).key));
    return C.SEASONS.filter(s => ds.has(s.key) || s.key === this.current.key).slice().reverse();
  },
  prevSeason(s) { const i = C.SEASONS.findIndex(x => x.key === s.key); return C.SEASONS[Math.max(0, i - 1)]; },
  seasonFromParam(k) {
    const s = C.SEASONS.find(x => x.key === k);
    if (s) return s;
    // 기본: 진행 중 시즌. 단, 경기가 40건 미만이면 직전 시즌
    const n = this.matches.filter(m => m.kind !== 'pro' && m.date >= this.current.start && m.date <= this.current.end).length;
    return n >= 40 ? this.current : this.prevSeason(this.current);
  },
  rebuild() {
    this.regs = this.allSubs.filter(isReg).slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    this.pendingRegs = this.regs.filter(r => r.status === 'pending');
    for (const r of this.regs.filter(r => r.status === 'confirmed')) {
      const p = r.sets.player;
      if (!this.players.has(p.id)) this.players.set(p.id, { id: p.id, race: p.race || 'Random', tier: p.tier || 'Silver', isNew: true, regBy: r.submitter, regAt: r.created_at });
    }
    this.subs = this.allSubs.filter(x => Array.isArray(x.sets));
    this.fixes = this.allSubs.filter(isFix);
    this.pendingFix = new Map();
    this.fixes.filter(f => f.status === 'pending' && !isConfirmed(f)).forEach(f => this.pendingFix.set(String(f.sets.fix.target), f));
    const subRows = submissionsToRows(this.subs, this.rows);
    const all = applyFixes(this.rows.concat(subRows), this.fixes).sort((a, b) => a.match_date.localeCompare(b.match_date) || (a.seq ?? 0) - (b.seq ?? 0));
    this.matches = normalize(all);
    this._eng.clear();
  },
  async reloadSubs() {
    try { this.allSubs = await store.list('submissions', '&status=neq.canceled'); } catch (e) { console.warn(e); this.allSubs = []; }
    this.rebuild(); updateBadge(); route();
  },
  rerender() { route(); },
  voterId() { let v = ls.get('rc.voter', null); if (!v) { v = uid(); ls.set('rc.voter', v); } return this.me ? 'p:' + this.me : v; },
  authorName() { return this.me || ls.get('rc.nick', '') || '익명 클랜원'; },
  setMe(id) { this.me = id; ls.set('rc.me', id); updateMeBtn(); updateBadge(); toast(id ? `내 선수: ${id}` : '내 선수 해제'); route(); },
  pickMe() {
    const ids = [...this.players.keys()].filter(x => !C.HIDE_IDS.includes(x)).sort((a, b) => a.localeCompare(b));
    modal(`<h3 id="modalTitle">내 선수 설정</h3><p class="mute small">이 기기에서 나를 누구로 표시할지 정합니다. 랭킹에서 내 위치, 결과 확인 요청, 의견 작성자에 쓰입니다. (베타 기간이라 로그인 없이 신뢰 기반으로 운영해요)</p>
      <label class="sr" for="meSel">선수</label><select id="meSel" class="fld" style="width:100%"><option value="">선택 안 함</option>${ids.map(x => `<option ${x === this.me ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <div class="note small" style="margin-top:12px">목록에 내 아이디가 없나요? <button class="btn small" id="meNew" style="margin-left:6px">+ 새 선수 등록 신청</button><div class="mute" style="margin-top:4px">운영진이 승인하면 목록에 나타나요.</div></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-close>닫기</button><button class="btn pri" id="meGo">저장</button></div>`,
      m => {
        m.querySelector('#meGo').onclick = () => { const v = m.querySelector('#meSel').value || null; closeModal(); this.setMe(v); };
        m.querySelector('#meNew').onclick = () => this.registerPlayer(id => this.setMe(id));
      });
  },
  registerPlayer(onDone) {
    const RACES = [['Protoss', '프로토스'], ['Terran', '테란'], ['Zerg', '저그'], ['Random', '랜덤']];
    const TIERS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Legend', 'Stone'];
    modal(`<h3 id="modalTitle">새 선수 등록 신청</h3><p class="mute small">명단에 없는 클랜원 추가를 신청합니다. <b>운영진이 승인하면</b> 선수 목록·결과 제출·랭킹에 쓸 수 있어요. 티어는 운영진이 나중에 조정할 수 있습니다.</p>
      <label class="lbl" style="margin-top:10px">아이디 (게임 아이디 그대로)<input id="rgId" class="fld" maxlength="20" autocomplete="off" placeholder="예: Rocky"></label>
      <div class="small" id="rgMsg" style="min-height:18px;margin-top:4px"></div>
      <div class="lbl" style="margin-top:6px">종족<div class="row" id="rgRace">${RACES.map(([k, v], i) => `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-race="${k}">${raceLabel(k)}</button>`).join('')}</div></div>
      <label class="lbl" style="margin-top:12px">티어 <span class="small mute">(모르면 Silver)</span><select id="rgTier" class="fld">${TIERS.map(t => `<option ${t === 'Silver' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-close>취소</button><button class="btn pri" id="rgGo">${this.isAdmin() ? '등록 (운영진 바로 승인)' : '등록 신청'}</button></div>`,
      m => {
        let race = RACES[0][0];
        const inp = m.querySelector('#rgId'), msg = m.querySelector('#rgMsg'), go = m.querySelector('#rgGo');
        const lower = new Set([...this.players.keys()].map(x => x.toLowerCase()));
        const pendingIds = new Set((this.pendingRegs || []).map(r => r.sets.player.id.toLowerCase()));
        const check = () => {
          const v = inp.value.trim();
          const bad = !v ? '' : v.length < 2 ? '2자 이상 입력해 주세요' : /[\s,]/.test(v) ? '띄어쓰기·쉼표 없이 입력해 주세요' : lower.has(v.toLowerCase()) ? '이미 명단에 있는 아이디예요' : pendingIds.has(v.toLowerCase()) ? '이미 등록 신청된 아이디예요 (운영진 승인 대기)' : '';
          msg.innerHTML = bad ? `<span class="down">${bad}</span>` : v ? '<span class="up">신청할 수 있어요</span>' : '';
          go.disabled = !v || !!bad; return !go.disabled;
        };
        inp.oninput = check; check(); inp.focus();
        m.querySelectorAll('[data-race]').forEach(b => b.onclick = () => { race = b.dataset.race; m.querySelectorAll('[data-race]').forEach(x => x.classList.toggle('on', x === b)); });
        go.onclick = async () => {
          if (!check()) return;
          const id = inp.value.trim(), tier = m.querySelector('#rgTier').value;
          go.disabled = true;
          try {
            const row = await store.insert('submissions', { match_date: todayKST(), kind: 'solo', team1: [id], team2: [], sets: { player: { id, race, tier } }, submitter: this.me || '신청자', status: 'pending' });
            const admin = this.isAdmin();
            if (admin) await store.update('submissions', row.id, { status: 'confirmed', confirmed_by: this.me, confirmed_at: new Date().toISOString() });
            closeModal();
            try { this.allSubs = await store.list('submissions', '&status=neq.canceled'); this.rebuild(); updateBadge(); } catch (e) { console.warn(e); }
            if (admin) { toast(`${id} 선수를 등록했어요`); onDone ? onDone(id) : route(); }
            else { toast(`${id} 등록을 신청했어요. 운영진 승인 후 사용할 수 있어요`); route(); }
          } catch (e) { toast(e.message); go.disabled = false; }
        };
      });
  },
  feedback(screenKey) {
    const S = board.SCREENS;
    const cur = screenKey || qs().path;
    modal(`<h3 id="modalTitle">의견 남기기</h3><p class="mute small">좋은 점, 불편한 점, 버그, 아이디어 무엇이든 좋아요. <a href="#/board" data-close>의견 게시판</a>에 공개됩니다.</p>
      <div class="grid2" style="gap:10px;margin:10px 0">
        <label class="lbl">어느 화면?<select id="fbS" class="fld">${Object.entries(S).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="lbl">분류<select id="fbC" class="fld">${board.CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
      </div>
      <label class="lbl">내용<textarea id="fbB" class="fld" maxlength="2000" placeholder="예: 랭킹에서 내 순위를 바로 찾고 싶어요"></textarea></label>
      <label class="lbl" style="margin-top:10px">작성자${this.me ? `<input class="fld" value="${esc(this.me)}" disabled>` : `<input id="fbN" class="fld" maxlength="40" placeholder="닉네임 (비우면 익명 클랜원)" value="${esc(ls.get('rc.nick', ''))}">`}</label>
      <div class="row" style="justify-content:space-between;margin-top:14px">${isDemo ? '<span class="tag warn">시연 모드</span>' : '<span></span>'}<div class="row"><button class="btn" data-close>취소</button><button class="btn pri" id="fbGo">올리기</button></div></div>`,
      m => {
        m.querySelector('#fbB').focus();
        m.querySelector('#fbGo').onclick = async () => {
          const body = m.querySelector('#fbB').value.trim(); if (!body) return toast('내용을 적어 주세요');
          const nick = m.querySelector('#fbN'); if (nick) ls.set('rc.nick', nick.value.trim());
          const btn = m.querySelector('#fbGo'); btn.disabled = true;
          try {
            await store.insert('feedback_posts', { author: this.authorName(), screen: m.querySelector('#fbS').value, category: m.querySelector('#fbC').value, body, status: '접수' });
            closeModal(); toast('의견이 등록됐어요. 고맙습니다!');
            if (qs().path === 'board') route();
          } catch (e) { toast(e.message); btn.disabled = false; }
        };
      });
  },
  toast: t => toast(t), modal: (h, f) => modal(h, f), closeModal: () => closeModal()
};
window.__app = app;

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600); }
function modal(html, onOpen) {
  const m = $('#modal'); $('#modalBody').innerHTML = html; m.hidden = false;
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal()));
  onOpen && onOpen(m);
}
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function updateMeBtn() { $('#meBtn').textContent = app.me ? `내 선수: ${app.me}` : '내 선수 설정'; }
function updateBadge() {
  const me = app.me, b = $('#inboxBadge');
  if (!me) { b.hidden = true; const bm0 = $('#inboxBadgeM'); if (bm0) bm0.hidden = true; return; }
  const side = (s, id) => s.team1.includes(id) ? 1 : s.team2.includes(id) ? 2 : 0;
  const n = app.subs.filter(s => s.status === 'pending' && !isConfirmed(s) && s.submitter !== me && side(s, me) && side(s, me) !== side(s, s.submitter)).length
    + app.fixes.filter(f => f.status === 'pending' && !isConfirmed(f) && f.submitter !== me && f.team1.includes(me)).length;
  const nr = app.isAdmin() ? (app.pendingRegs || []).length : 0;
  b.textContent = n + nr; b.hidden = !(n + nr);
  const bm = $('#inboxBadgeM'); if (bm) { bm.textContent = n + nr; bm.hidden = !(n + nr); }
}

async function route() {
  const { path, params } = qs();
  const view = VIEWS[path] || ranking;
  document.querySelectorAll('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === (VIEWS[path] ? path : 'ranking')));
  const el = $('#app');
  try { await view.render(app, el, params); }
  catch (e) { console.error(e); el.innerHTML = `<div class="warnbox"><b>화면을 그리다 문제가 생겼습니다.</b> ${esc(e.message)}<br><span class="small">오른쪽 아래 '의견 남기기'로 알려주시면 고칠게요.</span></div>`; }
  if (route._last !== path) { window.scrollTo(0, 0); route._last = path; }
}

async function init() {
  updateMeBtn();
  $('#meBtn').onclick = () => app.pickMe();
  $('#fab').onclick = () => app.feedback();
  if (!ls.get('tourSeen', 0) && !location.hash.startsWith('#/tour')) $('#tourStrip').hidden = false;
  $('#tourX').onclick = () => { ls.set('tourSeen', 1); $('#tourStrip').hidden = true; };
  if (isDemo) $('#banner').textContent = '시연 모드: 결과 제출·의견은 이 브라우저에만 저장됩니다';
  try {
    const [off, subs] = await Promise.all([loadOfficial(), store.list('submissions', '&status=neq.canceled').catch(e => { console.warn(e); return []; })]);
    off.players.forEach(p => app.players.set(p.id, p));
    off.snaps.forEach(r => { (app.snaps[r.season_key] ||= {})[r.player_id] = r.tier; });
    app.maps = off.maps; app.rows = off.rows; app.allSubs = subs;
    app.rebuild();
    $('#modeNote').textContent = `공식 경기 ${off.rows.length.toLocaleString()}건 · 마지막 경기 ${off.rows.length ? off.rows[off.rows.length - 1].match_date : '-'} · 오늘 ${todayKST()}`;
  } catch (e) {
    $('#app').innerHTML = `<div class="warnbox"><b>경기 기록을 불러오지 못했습니다.</b> ${esc(e.message)} <button class="btn" onclick="location.reload()">다시 시도</button></div>`;
    return;
  }
  updateBadge();
  window.addEventListener('hashchange', route);
  route();
}
init();
