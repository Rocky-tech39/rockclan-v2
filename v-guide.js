import { C, TIERS, expected, esc } from './util.js?v=20261010d';

export function render(app, el) {
  const P = C.V2;
  el.innerHTML = `
  <div class="head"><div><div class="eyebrow">HOW IT WORKS</div><h1 class="title">레이팅 안내</h1><div class="desc">v2 Beta의 점수 계산 방식과 기존 방식과의 차이</div></div></div>
  <div class="stack">
  <section class="grid2">
    <div class="card"><h2>레이팅 v2 (개편안 · 시뮬레이션 중)</h2>
      <ol style="margin:0;padding-left:18px;line-height:1.9;font-size:14px">
        <li><b>티어로 시작</b>: Silver 1000점 기준, 티어 한 단계마다 ±${P.TIER_STEP}점에서 출발 (Legend ${1000 + 3 * P.TIER_STEP} · Diamond ${1000 + 2 * P.TIER_STEP} · Gold ${1000 + P.TIER_STEP} · Silver 1000 · Bronze ${1000 - P.TIER_STEP})</li>
        <li><b>경기마다 변동</b>: 새 점수 = 점수 + K × (결과 − 예상 승률). 개인전 K=${P.K_SOLO}, 팀전 K=${P.K_TEAM}(인원수로 나눔: 2:2가 4:4보다 크게 변동)</li>
        <li><b>배치 경기</b>: 처음 ${P.PROVISIONAL_GAMES}경기는 변동폭 ×${P.PROVISIONAL_MULT} — 빨리 제자리를 찾게</li>
        <li><b>소프트 리셋</b>: 시즌이 바뀌면 1000점으로 초기화하지 않고, 티어 기준점과의 차이를 ${Math.round(P.SOFT_RESET * 100)}%만 남김</li>
        <li><b>랭킹 등록</b>: ${C.ELIGIBLE.GAMES}경기 + 서로 다른 상대 ${C.ELIGIBLE.OPPONENTS}명 이상. 진행 중 시즌은 ${C.ELIGIBLE.INACTIVE_DAYS}일간 경기가 없으면 숨김</li>
        <li><b>중복 의심 경기</b>(같은 날 같은 구성·결과로 두 번 입력된 프로리그)는 점수 계산에서 제외</li>
      </ol></div>
    <div class="card"><h2>기존 ELO와 무엇이 다른가</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13.5px">
        <tr class="mute"><th style="text-align:left;padding:6px 0">항목</th><th style="text-align:left">기존</th><th style="text-align:left">v2</th></tr>
        ${[['티어 역할', '매 경기 단계당 +40 보정', '시작 점수(단계당 100)'], ['보이는 숫자', '티어 대비 초과 성과', '실력 점수 그 자체'], ['시즌', '분기마다 1000 리셋', '소프트 리셋(50%)'], ['신규·소수 경기', '구분 없음', '배치중 표시 + K×2'], ['팀전', '티어 무시, 인원 무관 동일 변동', '인원수 반영'], ['티어 변경', '시즌 전체 소급 재계산', '시즌 스냅샷 기준']].map(r => `<tr style="border-top:1px solid var(--line)"><td style="padding:7px 0;color:var(--mute)">${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`).join('')}
      </table>
      <div class="small mute" style="margin-top:10px">지금 사이트의 기본 점수는 <b>기존 ELO</b>입니다. 레이팅 v2는 티어·개인전/팀전·현재 점수에 따라 더 흥미롭게 움직이도록 시뮬레이션 중이며, 랭킹 화면의 "계산 방식"에서 미리 비교해 볼 수 있습니다.</div></div>
  </section>
  <section class="card"><h2>승리 확률 시뮬레이터</h2>
    <div class="row">
      <label class="lbl">A 레이팅<input class="fld num" id="gA" type="number" value="1200" style="width:110px"></label>
      <label class="lbl">B 레이팅<input class="fld num" id="gB" type="number" value="1100" style="width:110px"></label>
      <label class="lbl">경기<select class="fld" id="gT"><option value="solo">개인전</option><option value="2">2:2 팀전</option><option value="3">3:3 팀전</option><option value="4">4:4 팀전</option></select></label>
    </div>
    <div id="gOut" style="margin-top:14px"></div>
  </section>
  <section class="card"><h2>v2 Beta에 대해</h2>
    <div style="font-size:14px;line-height:1.8">경기 기록은 기존 사이트의 공식 DB를 실시간으로 읽어서 계산합니다(읽기 전용). 결과 제출과 의견 게시판은 별도 저장소에 쌓이며, 공식 기록을 바꾸지 않습니다. 제출 후 상대 팀이 확인한 결과는 v2 Beta 랭킹에만 "제출 반영"으로 표시되어 함께 계산됩니다.</div>
  </section></div>`;
  const calc = () => {
    const a = +el.querySelector('#gA').value || 1000, b = +el.querySelector('#gB').value || 1000, t = el.querySelector('#gT').value;
    const e = expected(a, b);
    const K = t === 'solo' ? P.K_SOLO : P.K_TEAM * 2 / +t;
    el.querySelector('#gOut').innerHTML = `<div class="num" style="font-size:24px;font-weight:700">A ${Math.round(e * 100)}% : ${100 - Math.round(e * 100)}% B</div>
      <div class="mute" style="font-size:14px">A가 이기면 <span class="up num">+${(K * (1 - e)).toFixed(1)}</span> · A가 지면 <span class="down num">−${(K * e).toFixed(1)}</span> ${t === 'solo' ? '' : '(팀원 1인당)'}</div>`;
  };
  el.querySelectorAll('#gA,#gB,#gT').forEach(x => x.oninput = calc); calc();
}
