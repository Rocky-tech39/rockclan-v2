// RockClan Records v2 — 설정
// READ: 기존 락클랜 경기 DB (공개 읽기 전용 키, 기존 사이트와 동일)
// WRITE: 의견 게시판·결과 제출용 별도 Supabase 프로젝트. 비워두면 '시연 모드'(이 브라우저에만 저장)
window.RC_CONFIG = {
  READ_URL: 'https://ugrvylgrkwjtyekpznau.supabase.co',
  READ_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncnZ5bGdya3dqdHlla3B6bmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDgxNDMsImV4cCI6MjA4ODM4NDE0M30.tIBkee7X97IDuBQQg8ugwOrLsW2RzCRoqM-CNEnR4Ao',
  WRITE_URL: 'https://myfemuhinzubepeppgzy.supabase.co',
  WRITE_KEY: 'sb_publishable_PrVb9nt47-HwK6Oz41qHUA_wWRQrOHi',
  HIDE_IDS: ['Wonder', 'ceta', 'sika', '[S.U]동탁', '[S.U]퍼피', '[S.U]maru'],
  SEASONS: [
    { key: '2025',   label: '2025 시즌', start: '2025-09-01', end: '2025-12-31' },
    { key: '2026Q1', label: '2026 1Q',   start: '2026-01-01', end: '2026-03-31' },
    { key: '2026Q2', label: '2026 2Q',   start: '2026-04-01', end: '2026-06-30' },
    { key: '2026Q3', label: '2026 3Q',   start: '2026-07-01', end: '2026-09-30' },
    { key: '2026Q4', label: '2026 4Q',   start: '2026-10-01', end: '2026-12-31' }
  ],
  // 기본 점수 방식: 'legacy' = 기존 ELO (v1.0과 같은 방식), 'v2' = 개편 레이팅(시뮬레이션 중)
  DEFAULT_METHOD: 'legacy',
  // 운영진 아이디 — '내 선수'를 이 아이디로 설정하면 새 선수 등록 신청을 승인/거절할 수 있음
  ADMINS: ['Rocky'],
  // 레이팅 v2 파라미터
  V2: { TIER_STEP: 100, K_SOLO: 16, K_TEAM: 12, PROVISIONAL_GAMES: 10, PROVISIONAL_MULT: 2, SOFT_RESET: 0.5 },
  // 랭킹 등록 조건
  ELIGIBLE: { GAMES: 10, OPPONENTS: 5, INACTIVE_DAYS: 14 },
  AUTO_CONFIRM_HOURS: 48
};
