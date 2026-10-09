import { esc, timeAgo, go } from './util.js?v=20261010c';
import { store, isDemo } from './store.js?v=20261010c';
import { CHANGELOG, DONE_POSTS, HELD_POSTS } from './changelog.js?v=20261010c';

export const SCREENS = { ranking: '랭킹', matches: '경기 기록', analysis: '전력 분석', player: '선수 프로필', submit: '결과 제출·확인', board: '의견 게시판', guide: '안내', etc: '기타·전체' };
export const CATS = ['좋아요', '불편해요', '버그', '아이디어', '레이팅 로직', '기타'];
const STATUS_TAG = { '접수': 'mute', '검토중': 'info', '반영예정': 'acc', '반영완료': 'ok', '보류': 'mute' };

export async function render(app, el, p) {
  const screen = p.get('screen') || '', cat = p.get('cat') || '', sort = p.get('sort') || 'hot';
  const set = (k, v) => { const o = Object.fromEntries(p); o[k] = v; go('board', o); };
  const tab = p.get('tab') || 'posts';
  const head = `<div class="head"><div><div class="eyebrow">FEEDBACK &amp; UPDATES</div><h1 class="title">의견 게시판</h1>
    <div class="desc">${tab === 'log' ? '의견을 받아 사이트를 이렇게 고쳐 왔어요. 새로 올릴 때마다 여기에 기록합니다.' : 'v2 Beta에 대한 의견을 모읍니다. 공감(▲)이 많은 의견부터 반영할게요. 오른쪽 아래 <b>의견 남기기</b> 버튼은 어느 화면에서나 쓸 수 있어요.'}</div></div>
    <div class="row">${isDemo ? '<span class="tag warn">시연 모드</span>' : ''}<button class="btn pri" data-write>새 의견 쓰기</button></div></div>
    <div class="seg btabs" role="tablist"><button data-tab="posts" class="${tab === 'posts' ? 'on' : ''}">💬 의견</button><button data-tab="log" class="${tab === 'log' ? 'on' : ''}">🛠 업데이트 기록 <span class="ub">${CHANGELOG[0].date.slice(5).replace('-', '.')}</span></button></div>`;
  const bindHead = () => {
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => go('board', b.dataset.tab === 'log' ? { tab: 'log' } : {}));
    el.querySelector('[data-write]').onclick = () => app.feedback(screen || 'etc');
  };
  if (tab === 'log') {
    const TYPE = { new: ['새 기능', 'ok'], improve: ['개선', 'info'], fix: ['수정', 'warn'] };
    const wd = d => '일월화수목금토'[new Date(d + 'T00:00:00+09:00').getDay()];
    el.innerHTML = head + `<div class="stack" style="margin-top:16px"><div class="ulog">${CHANGELOG.map(d => `<section class="ulog-day"><div class="ulog-date"><b class="num">${d.date.slice(5).replace('-', '.')}</b><span>${wd(d.date)}</span></div>
      <div class="card ulog-card">${d.items.map(it => `<div class="ulog-it"><span class="tag ${TYPE[it.type][1]}">${TYPE[it.type][0]}</span><div><div>${esc(it.text)}</div>${it.by ? `<div class="small mute">💬 ${esc(it.by)}님 의견 반영${(it.posts || []).length ? ` · <a href="#/board?open=${it.posts[0]}">원글 보기</a>` : ''}</div>` : ''}</div></div>`).join('')}</div></section>`).join('')}</div></div>`;
    bindHead(); return;
  }
  el.innerHTML = '<div class="loading">의견을 불러오는 중…</div>';
  let posts = [], comments = [], votes = [];
  try { [posts, comments, votes] = await Promise.all([store.list('feedback_posts'), store.list('feedback_comments'), store.list('feedback_votes')]); }
  catch (e) { el.innerHTML = `<div class="warnbox"><b>의견 게시판을 불러오지 못했습니다.</b> ${esc(e.message)}</div>`; return; }
  const voter = app.voterId();
  const vc = new Map(), mine = new Set();
  votes.forEach(v => { vc.set(v.post_id, (vc.get(v.post_id) || 0) + 1); if (v.voter === voter) mine.add(v.post_id); });
  const cc = new Map(); comments.forEach(c => { if (!cc.has(c.post_id)) cc.set(c.post_id, []); cc.get(c.post_id).push(c); });
  let list = posts.filter(x => (!screen || x.screen === screen) && (!cat || x.category === cat));
  list.sort(sort === 'new' ? (a, b) => b.created_at.localeCompare(a.created_at) : (a, b) => (vc.get(b.id) || 0) - (vc.get(a.id) || 0) || b.created_at.localeCompare(a.created_at));
  const open = p.get('open');
  const st = x => DONE_POSTS.has(x.id) && (!x.status || x.status === '접수' || x.status === '검토중' || x.status === '반영예정') ? '반영완료' : HELD_POSTS[x.id] && (!x.status || x.status === '접수') ? '보류' : (x.status || '접수');

  el.innerHTML = head + `
  <div class="stack">
    <div class="row">
      <select class="fld" id="bScreen" aria-label="화면"><option value="">모든 화면</option>${Object.entries(SCREENS).map(([k, v]) => `<option value="${k}" ${screen === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select class="fld" id="bCat" aria-label="분류"><option value="">모든 분류</option>${CATS.map(c => `<option ${cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <div class="seg"><button data-sort="hot" class="${sort === 'hot' ? 'on' : ''}">공감순</button><button data-sort="new" class="${sort === 'new' ? 'on' : ''}">최신순</button></div>
      <span class="small mute">${list.length}개 의견</span>
    </div>
    ${list.map(x => {
      const cs = (cc.get(x.id) || []).sort((a, b) => a.created_at.localeCompare(b.created_at));
      const isOpen = open === x.id;
      return `<article class="post" id="post-${x.id}">
        <button class="vote ${mine.has(x.id) ? 'on' : ''}" data-vote="${x.id}" aria-label="공감 ${vc.get(x.id) || 0}">▲<b class="num">${vc.get(x.id) || 0}</b></button>
        <div style="min-width:0">
          <div class="row small" style="margin-bottom:6px"><span class="tag acc">${esc(SCREENS[x.screen] || x.screen || '기타')}</span><span class="tag info">${esc(x.category)}</span><span class="tag ${STATUS_TAG[st(x)] || 'mute'}">${esc(st(x))}</span>${DONE_POSTS.has(x.id) ? `<a class="small" href="#/board?tab=log">${DONE_POSTS.get(x.id).slice(5).replace('-', '.')} 업데이트 →</a>` : ''}${HELD_POSTS[x.id] ? `<span class="small mute">${esc(HELD_POSTS[x.id])}</span>` : ''}<span class="mute">${esc(x.author)} · ${timeAgo(x.created_at)}</span></div>
          <div class="body">${esc(x.body)}</div>
          <button class="btn" data-open="${x.id}" style="margin-top:10px;min-height:32px;padding:4px 12px;font-size:13px">댓글 ${cs.length}${isOpen ? ' ▴' : ' ▾'}</button>
          ${isOpen ? `<div style="margin-top:8px">${cs.map(c => `<div class="cmt"><b>${esc(c.author)}</b> <span class="small mute">${timeAgo(c.created_at)}</span><br>${esc(c.body)}</div>`).join('')}
            <div class="row" style="margin-top:8px;flex-wrap:nowrap"><label class="sr" for="c-${x.id}">댓글</label><input class="fld" id="c-${x.id}" maxlength="1000" placeholder="댓글 달기" style="flex:1"><button class="btn pri" data-cmt="${x.id}">등록</button></div></div>` : ''}
        </div></article>`;
    }).join('') || `<div class="empty">아직 의견이 없습니다. 첫 의견을 남겨 주세요!</div>`}
  </div>`;

  el.querySelector('#bScreen').onchange = e => set('screen', e.target.value);
  el.querySelector('#bCat').onchange = e => set('cat', e.target.value);
  el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => set('sort', b.dataset.sort));
  bindHead();
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => set('open', open === b.dataset.open ? '' : b.dataset.open));
  el.querySelectorAll('[data-vote]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try {
      if (mine.has(b.dataset.vote)) await store.remove('feedback_votes', { post_id: b.dataset.vote, voter });
      else await store.insert('feedback_votes', { post_id: b.dataset.vote, voter });
      app.rerender();
    } catch (e) { app.toast(e.message); b.disabled = false; }
  });
  el.querySelectorAll('[data-cmt]').forEach(b => b.onclick = async () => {
    const inp = el.querySelector('#c-' + b.dataset.cmt); const body = inp.value.trim(); if (!body) return;
    b.disabled = true;
    try { await store.insert('feedback_comments', { post_id: b.dataset.cmt, author: app.authorName(), body }); app.rerender(); }
    catch (e) { app.toast(e.message); b.disabled = false; }
  });
}
