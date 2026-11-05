import { esc, C } from './util.js?v=20261106c';

// 클랜 이벤트 모음 — 각 행사 페이지로 연결 (라이벌 끝장전만 ELO 반영)
const BASE = 'https://rocky-tech39.github.io/rock-summer-league/';
export const EVENTS = [
  {
    key: 'rival', title: '라이벌 끝장전', en: 'RIVAL FINAL', emoji: '⚔️', url: BASE + 'rival.html', status: 'live',
    desc: '프로리그에서 팽팽했던 맞수끼리 7판을 전부 붙는 끝장전. 클랜원 투표로 대진을 정하고 A조 vs B조 11라운드로 진행 중.',
    points: ['A조 vs B조 11라운드 · 라운드마다 7판 전부', '라운드별 스코어 · 방송 다시보기', '대진별 상대 전적·관전 포인트'],
    elo: true, grad: 'linear-gradient(135deg,#ff5a36,#2f6fe0)'
  },
  {
    key: 'ked', title: 'K.E.D. League', en: 'GOLD · SILVER · BRONZE', emoji: '🥇', url: BASE + 'ked.html', status: 'done',
    desc: '금·은·동 리그로 나눠 치른 K.E.D. 리그. 조별리그부터 토너먼트, 경기 다시보기까지 한 페이지에.',
    podium: [['Hana', '하나'], ['meomeory', '머머리']], final: '결승 하나 4 : 1 머머리',
    points: ['금·은·동 리그 실시간 현황', '조별리그 · 토너먼트', '경기 다시보기'],
    elo: false, grad: 'linear-gradient(135deg,#f5a623,#c07d05)'
  },
  {
    key: 'summer', title: 'Summer League', en: '다이아 · 왕관 리그', emoji: '🏆', url: BASE, status: 'done',
    desc: '락클랜 여름 리그(다이아·왕관 리그). 조별리그와 토너먼트, 경기 다시보기를 모아 둔 리그 페이지.',
    podium: [['Strive', '스트'], ['soondae', '순대'], ['dalsun2', '달선']], final: '결승 스트 4 : 3 순대 · 3·4위전 달선 3 : 0 호랑이',
    points: ['조별리그 · 토너먼트', '경기 다시보기'],
    elo: false, grad: 'linear-gradient(135deg,#2f9fe0,#12a150)'
  }
];

let rivalCache = null;
export async function rivalStatus() {
  if (rivalCache) return rivalCache;
  try {
    const r = await fetch(`${C.WRITE_URL}/rest/v1/rival_matches?select=round,a,b,sa,sb&order=round`, { headers: { apikey: C.WRITE_KEY }, cache: 'no-store' });
    const ms = r.ok ? await r.json() : [];
    let ra = 0, rb = 0, fin = 0;
    ms.forEach(m => { if (m.sa + m.sb === 7) { fin++; m.sa > m.sb ? ra++ : rb++; } });
    const live = ms.find(m => m.sa + m.sb > 0 && m.sa + m.sb < 7);
    const next = ms.find(m => m.sa + m.sb === 0);
    rivalCache = { total: ms.length, fin, ra, rb, live, next };
  } catch { rivalCache = null; }
  return rivalCache;
}

const ST = { live: ['진행 중', 'ok'], done: ['종료', 'mute'], soon: ['예정', 'info'] };

export function render(app, el) {
  el.innerHTML = `
  <div class="head"><div><div class="eyebrow">CLAN EVENTS</div><h1 class="title">클랜 이벤트</h1>
    <div class="desc">락클랜이 함께 만든 리그와 이벤트를 한곳에서. 카드를 누르면 각 행사 페이지로 이동해요.</div></div></div>
  <div class="evgrid">${EVENTS.map(e => `
    <div class="evcard" data-url="${esc(e.url)}" role="link" tabindex="0">
      <div class="evtop" style="background:${e.grad}"><span class="evemoji">${e.emoji}</span><div><div class="even">${esc(e.en)}</div><div class="evtitle">${esc(e.title)}</div></div></div>
      <div class="evbody">
        <div class="row" style="gap:6px"><span class="tag ${ST[e.status][1]}">${ST[e.status][0]}</span>${e.elo ? '<span class="tag acc">📈 ELO 반영</span>' : '<span class="tag mute">레이팅 미반영</span>'}</div>
        ${e.key === 'rival' ? '<div class="evlive" id="evRival"></div>' : ''}
        <p>${esc(e.desc)}</p>
        <ul>${e.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        ${e.podium ? `<div class="evpod">${e.podium.map(([id, nick], i) => `<a href="#/player?id=${encodeURIComponent(id)}" class="evp p${i + 1}"><span class="m">${['🥇', '🥈', '🥉'][i]}</span><span class="r">${['우승', '준우승', '3위'][i]}</span><b>${esc(id)}</b><small>${esc(nick)}</small></a>`).join('')}</div>${e.final ? `<div class="small mute">${esc(e.final)}</div>` : ''}` : ''}
        <a class="evgo" href="${esc(e.url)}" target="_blank" rel="noopener">페이지 열기 →</a>
      </div>
    </div>`).join('')}</div>
  <div class="note" style="margin-top:16px">레이팅(ELO)에는 <b>라이벌 끝장전</b>만 반영돼요. 끝난 라운드의 7판이 각각 개인전 1경기로 들어가고, 선수 프로필에서도 끝장전 기록을 볼 수 있어요.</div>`;
  el.querySelectorAll('.evcard').forEach(c => {
    const open = () => window.open(c.dataset.url, '_blank', 'noopener');
    c.onclick = e => { if (!e.target.closest('a')) open(); };
    c.onkeydown = e => { if (e.key === 'Enter' && !e.target.closest('a')) open(); };
  });
  rivalStatus().then(s => {
    const box = el.querySelector('#evRival'); if (!box || !s) return;
    box.innerHTML = `<div class="evscore"><span class="a">A조 ${s.ra}</span> : <span class="b">${s.rb} B조</span></div>
      <div class="small mute">끝난 라운드 ${s.fin}/${s.total}${s.live ? ` · 지금 R${s.live.round} ${esc(s.live.a)} vs ${esc(s.live.b)} ${s.live.sa}:${s.live.sb}` : s.next ? ` · 다음 R${s.next.round} ${esc(s.next.a)} vs ${esc(s.next.b)}` : ''}</div>`;
  });
}
