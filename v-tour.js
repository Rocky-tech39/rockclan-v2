import { C, esc, ls, raceBadge } from './util.js?v=20261002l';

// v2 둘러보기 — v1.0 대비 바뀐 점 + 사용법 튜토리얼
const CMP = [
  ['결과 입력', '네이버 카페에 양식으로 글 작성 → 운영진 승인 후 반영', '사이트에서 직접 입력 → 상대 팀 1명이 "맞아요" 누르면 바로 반영'],
  ['응답이 없을 때', '운영진이 볼 때까지 대기', `${C.AUTO_CONFIRM_HOURS}시간 안에 응답이 없으면 자동 반영`],
  ['기록이 틀렸을 때', '운영진에게 따로 요청', '경기 카드의 "수정·삭제 요청" → 같이 뛴 선수 1명 확인'],
  ['점수 계산', 'ELO · 분기마다 1000점으로 리셋 · 티어 보정', '기본은 기존 ELO 그대로 · 개편 레이팅(v2)은 시뮬레이션 중, 랭킹에서 미리 비교 가능'],
  ['랭킹 표시', '경기 수와 관계없이 모두 표시', `${C.ELIGIBLE.GAMES}경기 + 상대 ${C.ELIGIBLE.OPPONENTS}명 이상부터 정식 순위 (그 전엔 "배치중")`],
  ['선수 정보', '상대 전적 조회', '선수 프로필: 레이팅 추이 · 종족/맵별 성적 · 파트너 · 라이벌'],
  ['분석', '티어별 개인전 통계', '전력 분석: 맞대결 · 스카우팅 포인트 · 티어 구간 승률표'],
  ['경기 기록', '월별 기록실', '날짜별 경기 카드 · 세트별 승리 확률과 점수 변동 · 이변 표시'],
  ['의견 전달', '카페 · 단톡', '사이트 안 의견 게시판 (공감 · 댓글)'],
  ['휴대폰', 'PC 화면 그대로', '휴대폰 전용 화면 · 아래쪽 메뉴']
];

const NEW = [
  ['submit?new=1', '결과 직접 제출', '카페 양식 없이 선수·맵·승자만 고르면 끝. 스코어는 자동 계산', '✍️'],
  ['submit', '상대 확인으로 바로 반영', '운영진 승인 없이 상대 팀 1명 확인이면 반영', '✅'],
  ['matches', '기록 수정·삭제 요청', '승자 바꾸기 · 맵 변경 · 세트 삭제를 직접 요청', '🛠️'],
  ['player', '선수 프로필', '레이팅 추이 그래프와 종족·맵·파트너·라이벌 기록', '👤'],
  ['analysis', '전력 분석', '다음 상대와의 맞대결, 예상 승률, 약점 맵', '🔍'],
  ['ranking', '내 위치 · 시즌 하이라이트', '내 순위, 다음 순위까지 남은 점수, 최장 연승·최대 이변', '🏆'],
  ['board', '의견 게시판', '불편한 점·아이디어를 남기고 공감으로 우선순위 정하기', '💬'],
  ['guide', '레이팅 안내 · 시뮬레이터', '점수가 어떻게 오르내리는지 숫자 넣어 바로 확인', '📐']
];

const mock = html => `<div class="mock" aria-hidden="true">${html}</div>`;

const STEPS = [
  ['내 선수 설정 (처음 한 번만)', '오른쪽 위 <b>내 선수 설정</b>을 눌러 내 아이디를 고릅니다. 이 브라우저에 기억돼서 다음부터는 안 해도 돼요.',
    mock(`<div class="row" style="justify-content:flex-end"><span class="me-btn hl">내 선수 설정</span><span class="cta">+ 결과 제출</span></div>`)],
  ['결과 제출 열기', '<b>+ 결과 제출</b>(휴대폰은 아래 메뉴 <b>제출·확인</b>)을 누르고 경기 종류와 날짜를 고릅니다.',
    mock(`<div class="row"><span class="seg"><button class="on">프로리그</button><button>개인전</button><button>팀전</button></span><span class="fld small" style="display:inline-flex;align-items:center">10/02/2026 📅</span></div>`)],
  ['팀에 선수 넣기', '팀1·팀2 칸의 <b>+ 선수</b>에서 참가자를 고릅니다. 잘못 넣었으면 이름을 눌러 빼면 돼요.',
    mock(`<div class="grid2" style="gap:8px"><div><div class="small mute">팀1</div><div class="row tb"><span class="chip">Rocky ✕</span><span class="chip">Pang ✕</span><span class="chip dash">+ 선수</span></div></div><div><div class="small mute">팀2</div><div class="row tb"><span class="chip">Veeny ✕</span><span class="chip dash">+ 선수</span></div></div></div>`)],
  ['세트 입력', '세트마다 <b>맵</b>과 <b>양쪽 선수</b>를 고르고, 이긴 쪽 버튼(<b>팀1 승 / 팀2 승</b>)을 누릅니다. <b>+ 개인전 세트</b>·<b>+ 팀전 세트</b>로 세트를 늘리세요. 스코어는 자동으로 계산됩니다.',
    mock(`<div class="mset"><span class="num mute">1</span><span class="fld small mp">투혼 ▾</span><span class="fld small">Rocky ▾</span><span class="fld small">Veeny ▾</span></div><div class="mset mset2"><span class="num"></span><span class="btn blue small">팀1 승</span><span class="btn small">팀2 승</span></div><div class="row" style="margin-top:6px"><span class="btn small">+ 개인전 세트</span><span class="btn small">+ 팀전 세트</span><span style="margin-left:auto" class="small mute">스코어 <b class="num" style="font-size:18px;color:var(--text)">1 : 0</b></span></div>`)],
  ['확인할 사람 고르고 제출', '확인자는 <b>상대 팀 아무나</b>(기본값) 또는 특정 선수를 고르고 <b>제출하기</b>.',
    mock(`<div class="row" style="justify-content:flex-end"><span class="fld small">상대 팀 아무나 확인 ▾</span><span class="btn pri small">제출하기</span></div>`)],
  ['상대 팀이 확인하면 반영 끝', `상대 팀 선수 화면의 <b>결과 확인</b> 메뉴에 숫자가 뜹니다. <b>맞아요</b>를 누르면 바로 랭킹에 반영되고, ${C.AUTO_CONFIRM_HOURS}시간 동안 아무도 안 누르면 자동 반영돼요. 틀렸으면 <b>이의 제기</b> → 운영진이 확인합니다.`,
    mock(`<div class="row" style="justify-content:space-between"><span><b>프로리그</b> · Rocky · Pang vs Veeny <span class="tag mute">확인 대기</span></span><span class="row"><span class="btn blue small">맞아요</span><span class="btn small">이의 제기</span></span></div>`)]
];

const FIX = [
  ['경기 기록에서 해당 경기 찾기', '<b>경기 기록</b> 메뉴 → 날짜를 고르고 경기 카드를 찾습니다.'],
  ['수정·삭제 요청 누르기', '<b>승자 바꾸기 · 맵 변경 · 세트 삭제 · 경기 전체 삭제</b> 중 고르고 사유를 적습니다.'],
  ['같이 뛴 선수 1명 확인', `그 경기에 뛴 다른 선수가 <b>맞아요</b>를 누르면(또는 ${C.AUTO_CONFIRM_HOURS}시간 뒤 자동) 카드에 <span class="tag info">수정 반영됨</span>이 붙습니다.`]
];

const FAQ = [
  ['기존 사이트(v1.0) 기록이 바뀌나요?', '아니요. v2는 기존 사이트의 경기 기록을 읽어서 보여주기만 합니다. v2에서 제출·수정한 내용은 v2 화면에 반영되고, 공식 기록 정리는 운영진이 합니다.'],
  ['점수 계산 방식이 바뀌었나요?', `아직은 아니에요. 기본 점수는 <b>기존 ELO</b> 방식입니다. 개편 레이팅(v2)은 시뮬레이션 중이고, 랭킹 화면 오른쪽 위 <b>계산 방식</b>에서 "레이팅 v2"를 고르면 미리 볼 수 있어요.`],
  ['내 이름이 랭킹에 없어요', `이번 시즌 ${C.ELIGIBLE.GAMES}경기 + 서로 다른 상대 ${C.ELIGIBLE.OPPONENTS}명을 채우면 정식 순위에 올라갑니다. 랭킹의 <b>표본 충족만 보기</b>를 끄면 배치중인 선수도 보여요. 진행 중 시즌에 ${C.ELIGIBLE.INACTIVE_DAYS}일간 경기가 없으면 잠시 숨겨집니다.`],
  ['명단에 내 아이디가 없어요', '<b>내 선수 설정</b> 창이나 결과 제출의 <b>+ 선수</b> 목록 맨 위 <b>＋ 목록에 없는 선수 등록 신청</b>에서 아이디·종족·티어를 넣어 신청하세요. <b>운영진이 승인하면</b> 목록에 나타납니다. 선수 화면의 <b>+ 선수 등록 신청</b> 버튼도 같아요.'],
  ['로그인은 없나요?', '베타 기간에는 "내 선수"를 직접 고르는 방식이에요. 다른 사람 이름으로 제출하지 말아 주세요. 로그인은 의견을 받아 검토 중입니다.'],
  ['이상한 점을 발견했어요', '오른쪽 아래 <b>의견 남기기</b>로 알려 주세요. 의견 게시판에서 다른 분들 의견에 공감도 눌러 주시면 우선순위로 반영합니다.']
];

export function render(app, el) {
  ls.set('tourSeen', 1);
  const strip = document.getElementById('tourStrip'); if (strip) strip.hidden = true;
  const me = app.me;
  el.innerHTML = `
  <section class="hero">
    <img src="logo-180.png" alt="" width="84" height="84">
    <div><div class="eyebrow">WHAT'S NEW · v1.0 → v2</div>
      <h1 class="title">락클랜 레코즈 v2, 이렇게 달라졌어요</h1>
      <div class="desc">결과는 카페 대신 <b>사이트에서 직접</b>, 승인은 운영진 대신 <b>상대 팀 1명</b>이. 3분이면 다 봅니다.</div>
      <div class="row" style="margin-top:14px">
        <a class="btn pri" href="#/tour" data-jump="t-how">매치 입력 방법 보기</a>
        <a class="btn" href="#/tour" data-jump="t-cmp">v1.0과 비교</a>
        <a class="btn" href="#/tour" data-jump="t-new">새 기능</a>
        <a class="btn" href="#/tour" data-jump="t-faq">자주 묻는 질문</a>
      </div></div>
  </section>

  <section class="flow" aria-label="결과 반영 흐름 비교">
    <div class="flowcol"><div class="flowlbl mute">v1.0</div>
      <div class="flowrow"><span class="fnode">경기</span><i>→</i><span class="fnode">카페 글 작성</span><i>→</i><span class="fnode warnn">운영진 승인 대기</span><i>→</i><span class="fnode">반영</span></div></div>
    <div class="flowcol"><div class="flowlbl" style="color:var(--acc)">v2</div>
      <div class="flowrow"><span class="fnode">경기</span><i>→</i><span class="fnode accn">사이트에서 제출</span><i>→</i><span class="fnode accn">상대 1명 "맞아요"</span><i>→</i><span class="fnode okn">바로 반영</span></div>
      <div class="small mute" style="margin-top:6px">응답이 없으면 ${C.AUTO_CONFIRM_HOURS}시간 뒤 자동 반영 · 이의 제기 때만 운영진 확인</div></div>
  </section>

  <div class="stack" style="margin-top:20px">
  <section class="card" id="t-how">
    <div class="eyebrow">TUTORIAL 1</div><h2 class="h2b">매치 결과 입력하기</h2>
    <ol class="steps">${STEPS.map(([t, d, m], i) => `<li><span class="sn num">${i + 1}</span><div class="sbody"><b class="st">${t}</b><div class="sd">${d}</div>${m}</div></li>`).join('')}</ol>
    <div class="row" style="margin-top:6px">${me ? `<a class="btn pri" href="#/submit?new=1">지금 결과 제출하기 →</a>` : `<button class="btn pri" data-setme>내 선수 설정하고 시작하기</button>`}
      <span class="small mute">개인전·팀전도 같은 방식이에요 (개인전은 1:1, 팀전은 세트 1개).</span></div>
  </section>

  <section class="grid2">
    <div class="card"><div class="eyebrow">TUTORIAL 2</div><h2 class="h2b">상대가 올린 결과 확인하기</h2>
      <ol class="steps sm">
        <li><span class="sn num">1</span><div class="sbody"><b class="st">메뉴의 숫자 확인</b><div class="sd"><b>결과 확인</b> 옆에 <span class="badge">1</span> 처럼 숫자가 뜨면 확인할 결과가 있다는 뜻이에요.</div></div></li>
        <li><span class="sn num">2</span><div class="sbody"><b class="st">맞으면 "맞아요"</b><div class="sd">누르는 즉시 랭킹에 반영됩니다.</div></div></li>
        <li><span class="sn num">3</span><div class="sbody"><b class="st">틀리면 "이의 제기"</b><div class="sd">어디가 다른지 한 줄 적으면 운영진이 확인합니다.</div></div></li>
      </ol></div>
    <div class="card"><div class="eyebrow">TUTORIAL 3</div><h2 class="h2b">잘못 들어간 기록 고치기</h2>
      <ol class="steps sm">${FIX.map(([t, d], i) => `<li><span class="sn num">${i + 1}</span><div class="sbody"><b class="st">${t}</b><div class="sd">${d}</div></div></li>`).join('')}</ol>
      <a class="small" href="#/matches">경기 기록으로 가기 →</a></div>
  </section>

  <section class="card" id="t-cmp">
    <div class="eyebrow">COMPARE</div><h2 class="h2b">v1.0과 한눈에 비교</h2>
    <div class="cmp">
      <div class="cmp-h"><span></span><span>v1.0 (기존)</span><span>v2 (지금)</span></div>
      ${CMP.map(([k, a, b]) => `<div class="cmp-r"><b>${k}</b><span class="mute">${a}</span><span>${b}</span></div>`).join('')}
    </div>
  </section>

  <section id="t-new">
    <div class="eyebrow">NEW</div><h2 class="h2b" style="margin-bottom:12px">새로 생긴 것들 <span class="mute small" style="font-weight:400">눌러서 바로 가 보세요</span></h2>
    <div class="grid4">${NEW.map(([href, t, d, ic]) => `<a class="tile newtile" href="#/${href}"><span class="ic" aria-hidden="true">${ic}</span><b>${t}</b><span class="s">${d}</span></a>`).join('')}</div>
  </section>

  <section class="card">
    <div class="eyebrow">RATING v2 · 시뮬레이션 중</div><h2 class="h2b">개편 레이팅(v2)은 이렇게 움직일 예정이에요</h2><div class="note small" style="margin:-4px 0 14px">지금 사이트의 기본 점수는 <b>기존 ELO</b>입니다. 아래 v2 방식은 티어·개인전/팀전·현재 점수에 따라 더 흥미롭게 바뀌도록 다듬는 중이며, 랭킹의 <b>계산 방식</b>에서 미리 볼 수 있어요.</div>
    <div class="grid3">
      <div class="rule"><b>① 티어로 시작</b><span>Silver 1000점 기준, 티어 한 단계마다 ±${C.V2.TIER_STEP}점에서 출발</span>
        <div class="tierbar">${[['Bronze', 900], ['Silver', 1000], ['Gold', 1100], ['Diamond', 1200], ['Legend', 1300]].map(([t, v]) => `<span><b class="num">${1000 + (v - 1000) / 100 * C.V2.TIER_STEP}</b><small>${t}</small></span>`).join('')}</div></div>
      <div class="rule"><b>② 이기면 오르고 지면 내려요</b><span>강한 상대를 이기면 많이, 약한 상대를 이기면 조금. 처음 ${C.V2.PROVISIONAL_GAMES}경기는 변동폭 ×${C.V2.PROVISIONAL_MULT}</span>
        <div class="ex"><span>나 1100 vs 상대 1200 승리</span><b class="up num">+${(C.V2.K_SOLO * (1 - 1 / (1 + Math.pow(10, 100 / 400)))).toFixed(1)}</b></div>
        <div class="ex"><span>나 1100 vs 상대 1000 승리</span><b class="up num">+${(C.V2.K_SOLO * (1 - 1 / (1 + Math.pow(10, -100 / 400)))).toFixed(1)}</b></div></div>
      <div class="rule"><b>③ 시즌이 바뀌어도 절반은 유지</b><span>분기마다 0에서 다시 시작하지 않고, 티어 기준점과의 차이를 ${Math.round(C.V2.SOFT_RESET * 100)}% 남겨요</span>
        <div class="ex"><span>Gold 기준 1100, 시즌 말 1180</span><b class="num">→ ${Math.round(1100 + 80 * C.V2.SOFT_RESET)}</b></div></div>
    </div>
    <a class="small" href="#/guide">자세한 계산과 승리 확률 시뮬레이터 →</a>
  </section>

  <section class="card">
    <div class="eyebrow">ICONS</div><h2 class="h2b">화면에서 보이는 표시</h2>
    <div class="legend">
      <span>${raceBadge('Protoss')} 프로토스</span><span>${raceBadge('Terran')} 테란</span><span>${raceBadge('Zerg')} 저그</span><span>${raceBadge('Random')} 랜덤</span>
      <span><span class="form"><i class="w">W</i><i class="l">L</i></span> 최근 경기 승·패</span>
      <span><small class="mute" style="border:1px dashed var(--line3);border-radius:5px;padding:1px 6px">배치중</small> 이름 아래 표시 · 아직 정식 순위 전</span>
      <span><span class="tag info">수정 반영됨</span> 요청으로 고친 기록</span>
      <span><span class="tag warn">이의 제기</span> 운영진 확인 중</span>
    </div>
  </section>

  <section class="card" id="t-faq">
    <div class="eyebrow">FAQ</div><h2 class="h2b">자주 묻는 질문</h2>
    ${FAQ.map(([q, a]) => `<details class="faq"><summary>${q}</summary><div>${a}</div></details>`).join('')}
  </section>

  <section class="endcta">
    <div><b>써 보고 불편한 점, 꼭 알려 주세요.</b><div class="small mute">v2는 클랜원 의견으로 계속 고쳐 나가는 베타 버전입니다.</div></div>
    <div class="row"><button class="btn" data-fb>의견 남기기</button><a class="btn pri" href="#/ranking">랭킹 보러 가기</a></div>
  </section>
  </div>`;

  el.querySelectorAll('[data-jump]').forEach(a => a.onclick = e => { e.preventDefault(); const t = el.querySelector('#' + a.dataset.jump); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const sm = el.querySelector('[data-setme]'); if (sm) sm.onclick = () => app.pickMe();
  el.querySelector('[data-fb]').onclick = () => app.feedback();
}
