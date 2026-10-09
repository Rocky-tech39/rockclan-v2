// 업데이트 기록 — 새로 올릴 때마다 맨 위에 추가
// type: new(새 기능) / improve(개선) / fix(수정)
// posts: 반영한 의견 게시판 글 id → 게시판에서 해당 글에 "반영완료" 표시
export const CHANGELOG = [
  { date: '2026-10-10', items: [
    { type: 'improve', text: '모바일 랭킹: 이름 옆에 티어, 아래 줄에 승-패·승률 표시' }
  ] },
  { date: '2026-10-09', items: [
    { type: 'new', text: '결과 제출: 선수 이름을 입력해서 찾기 (예: "Ve" → Veeny, Enter로 추가)', by: 'Veeny', posts: ['ab5216ed-160d-4403-af4c-36be4b63058b'] },
    { type: 'fix', text: '모바일에서 화면 맨 아래가 하단 탭에 가려지던 문제', by: 'Veeny', posts: ['ce6a4958-5223-4918-8e6f-6a5ecc19209e'] },
    { type: 'improve', text: '[S.U] 선수 3명을 선수 목록에서 숨김 · 선수 칸 전체 목록이 50명에서 잘리던 문제 수정' }
  ] },
  { date: '2026-10-03', items: [
    { type: 'improve', text: '모바일 하단 탭: 아이콘 추가, 지금 보는 탭을 파란색으로 강조, 확인할 결과 숫자 표시' }
  ] },
  { date: '2026-10-02', items: [
    { type: 'new', text: '랭킹 "전체 시즌 통합" — 시즌 리셋 없이 첫 기록부터 이어서 계산한 통산 점수', by: 'Veeny', posts: ['8b7fad4f-13dc-42cd-8f62-557419acdf1d'] },
    { type: 'new', text: '선수 프로필에 상대 티어별 개인전 기록 (예전 기록실처럼)', by: 'IN', posts: ['1432f218-0c88-4978-b6be-60ada891b3d3'] },
    { type: 'new', text: '명단에 없는 선수 등록 신청 (운영진 승인 후 사용)' },
    { type: 'new', text: '팀전 세트에서 출전 선수 여러 명 선택 (2:2·3:3·4:4 인원에 맞춤)' },
    { type: 'improve', text: '전력 분석: 이름 옆 숫자가 무슨 점수인지 표시, 예상 승률에 티어 보정 반영' },
    { type: 'improve', text: '기본 점수를 기존 ELO로 (개편 레이팅 v2는 랭킹에서 비교용으로 선택)' },
    { type: 'improve', text: '선수 목록을 티어별로 묶고 점수·승패 표시 · 경기 전 승리 확률 막대 2색' },
    { type: 'new', text: '밝은 화면, 락클랜 로고, 종족 배지, "v2 둘러보기" 안내 페이지' },
    { type: 'new', text: 'v2 Beta 오픈 — 결과 직접 제출 + 상대 확인, 기록 수정·삭제 요청, 선수 프로필, 전력 분석, 의견 게시판' }
  ] }
];

// 보류한 의견 (게시판에 "보류" 표시)
export const HELD_POSTS = { '4027f485-9de5-4cb3-b9fb-d7b07f94cbab': '로그인 없는 베타라 남의 글도 지울 수 있게 돼서 보류' };

export const DONE_POSTS = new Map();
for (const d of CHANGELOG) for (const it of d.items) for (const id of it.posts || []) DONE_POSTS.set(id, d.date);
