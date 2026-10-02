import { esc, pct, sign, signColor, tierBadge, raceBadge, raceLabel, TIER_COLOR, RACE_KO, fmtD, go, expected, formPills, todayKST, C, TIERS } from './util.js?v=20261002l';
import { seasonTable, sides, soloOdds } from './rating.js?v=20261002l';

export function render(app, el, p) {
  const id = p.get('id') || (p.get('pick') ? '' : app.me);
  if (!id || !app.players.has(id)) return picker(app, el, p);
  const season = app.seasonFromParam(p.get('season'));
  const set = (k, v) => { const o = Object.fromEntries(p); o.id = id; o[k] = v; go('player', o); };
  const eng = app.engine(app.method, 'all');
  const meta = app.players.get(id);
  const tier = app.tierAt(id, season.key);
  const refDate = season.key === app.current.key ? todayKST() : season.end;
  const table = seasonTable(app.matches, eng, season, app, refDate);
  const me = table.find(r => r.id === id);
  const hist = (eng.hist.get(id) || []).filter(h => h.season === season.key);
  const inS = app.matches.filter(m => m.kind !== 'pro' && !m.dup && m.date >= season.start && m.date <= season.end && eng.events.has(m.id) && sides(m).flat().includes(id));

  // 집계
  const vr = {}, vt = {}, maps = {}, opp = {}, part = {};
  for (const m of inS) {
    const [A, B] = sides(m); const mine = A.includes(id) ? A : B, other = mine === A ? B : A;
    const win = mine === A ? m.win1 : !m.win1;
    if (m.kind === 'solo') {
      const o = other[0], r = (app.players.get(o) || {}).race || '?';
      (vr[r] ||= [0, 0])[win ? 0 : 1]++; (vt[app.tierAt(o, season.key)] ||= [0, 0])[win ? 0 : 1]++; (maps[m.map] ||= [0, 0])[win ? 0 : 1]++; (opp[o] ||= [0, 0])[win ? 0 : 1]++;
    } else mine.filter(x => x !== id).forEach(x => (part[x] ||= [0, 0])[win ? 0 : 1]++);
  }
  const top = (o, n, by = 'n') => Object.entries(o).map(([k, [w, l]]) => ({ k, w, l, n: w + l, p: pct(w, w + l) })).sort((a, b) => by === 'n' ? b.n - a.n || b.p - a.p : b.p - a.p).slice(0, n);
  const col = p => p >= 60 ? 'var(--up)' : p < 45 ? 'var(--down)' : 'var(--text)';
  const li = x => `<div class="li"><span><a href="#/player?id=${encodeURIComponent(x.k)}" style="color:var(--text);font-weight:600">${esc(x.k)}</a>${x.tag ? ` <span class="small mute">${x.tag}</span>` : ''}</span><span class="num r" style="text-align:right;color:var(--text2)">${x.w}-${x.l}</span><span class="num" style="text-align:right;font-weight:700;color:${col(x.p)}">${x.p}%</span></div>`;
  const rivals = top(opp, 3).map(x => ({ ...x, tag: '최다 대전' }));
  const nemesis = Object.entries(opp).map(([k, [w, l]]) => ({ k, w, l, n: w + l, p: pct(w, w + l) })).filter(x => x.n >= 3 && x.p < 50).sort((a, b) => a.p - b.p).slice(0, 2).map(x => ({ ...x, tag: '천적' }));
  const prey = Object.entries(opp).map(([k, [w, l]]) => ({ k, w, l, n: w + l, p: pct(w, w + l) })).filter(x => x.n >= 4 && x.p >= 75).sort((a, b) => b.n - a.n).slice(0, 2).map(x => ({ ...x, tag: '강세' }));
  const rv = [...rivals, ...nemesis.filter(x => !rivals.some(r => r.k === x.k)), ...prey.filter(x => !rivals.some(r => r.k === x.k))];

  // 예상 승률 계산기
  const curR = me ? me.r : (eng.R.get(id) || 1000);
  const oppList = table.filter(r => r.id !== id).sort((a, b) => b.r - a.r);
  const vs = p.get('vs') && oppList.find(r => r.id === p.get('vs')) || (rv[0] && oppList.find(r => r.id === rv[0].k)) || oppList[0];
  const { e, K } = vs ? soloOdds(app, app.method, eng, id, vs.id, season.key, curR, vs.r) : { e: 0.5, K: 12 };

  const seasonOpts = app.seasonsWithData().map(s => `<option value="${s.key}" ${s.key === season.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  const chart = ratingChart(hist);
  const recent = hist.slice(-15).reverse();
  const evById = new Map(inS.map(m => [m.id, m]));

  el.innerHTML = `
  <div class="row" style="justify-content:space-between;margin-bottom:14px"><a href="#/ranking" class="small mute">← 랭킹으로</a>
    <div class="row"><label class="sr" for="pSeason">시즌</label><select id="pSeason" class="fld">${seasonOpts}</select>
    <button class="btn" data-pick>다른 선수</button>${app.me !== id ? `<button class="btn" data-setme>내 선수로 설정</button>` : '<span class="tag acc">내 선수</span>'}</div></div>
  <div class="stack">
  <section class="card ph">
    <div class="row" style="gap:18px;flex-wrap:nowrap">
      <div class="avatar" style="border-color:${TIER_COLOR[tier]}">${raceBadge(meta.race, 'lg')}</div>
      <div><div class="row"><h1 class="title" style="font-size:30px">${esc(id)}</h1>${tierBadge(tier)}<span class="mute small">${raceLabel(meta.race)}</span></div>
      <div class="row" style="margin-top:6px">${me && me.bestSoloStreak >= 3 ? `<span class="tag acc">시즌 최장 ${me.bestSoloStreak}연승</span>` : ''}${me && me.streak >= 2 ? `<span class="tag info">현재 ${me.streak}연승</span>` : ''}${me && me.streak <= -3 ? `<span class="tag mute">${-me.streak}연패 중</span>` : ''}${me && !me.eligible ? '<span class="tag mute">배치중</span>' : ''}</div></div>
    </div>
    ${me ? `<div class="kv">
      <div><div class="k">레이팅${me.rank ? ` · ${me.rank}위` : ''}</div><div class="v" style="color:var(--acc2)">${Math.round(me.r)}${me.eligible ? '' : '?'}</div></div>
      <div><div class="k">시즌 최고</div><div class="v">${Math.round(Math.max(...hist.map(h => h.r)))}</div></div>
      <div><div class="k">전적</div><div class="v">${me.w}-${me.l}</div></div>
      <div><div class="k">승률</div><div class="v">${pct(me.w, me.games)}%</div></div></div>` : `<div class="mute">${esc(season.label)} 경기 기록이 없습니다</div>`}
  </section>
  ${me ? `
  <section class="grid2" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
    <div class="card"><h2>레이팅 추이 <span class="mute">${esc(season.label)} · ${hist.length}경기 · 시작 ${Math.round(hist[0].pre)} → ${Math.round(me.r)} <span style="color:${signColor(me.r - hist[0].pre)}">${sign(me.r - hist[0].pre)}</span></span></h2>${chart}</div>
    <div class="card"><h2>상대 종족별 <span class="mute">개인전</span></h2>
      ${['Protoss', 'Terran', 'Zerg'].map(r => { const [w, l] = vr[r] || [0, 0]; return `<div style="margin-bottom:12px"><div class="row" style="justify-content:space-between;font-size:14px"><b class="rlabel">vs ${raceBadge(r, 'sm')}${RACE_KO[r]}</b><span class="num">${w}-${l} · <b>${pct(w, w + l)}%</b>${w + l < 10 ? ' <span class="small" style="color:var(--warn)">표본 적음</span>' : ''}</span></div><div class="hbar"><i style="width:${pct(w, w + l)}%;background:var(--up)"></i></div></div>`; }).join('')}
      <div style="border-top:1px solid var(--line);padding-top:12px;margin-top:4px">
        <h2 style="font-size:14px">승리 확률 계산기</h2>
        <label class="sr" for="pVs">상대</label><select id="pVs" class="fld" style="width:100%">${oppList.map(o => `<option value="${esc(o.id)}" ${vs && o.id === vs.id ? 'selected' : ''}>${esc(o.id)} (${Math.round(o.r)})</option>`).join('')}</select>
        ${vs ? `<div class="row" style="margin-top:10px;gap:8px;flex-wrap:nowrap"><span class="small num">${esc(id)}</span><div style="flex:1;height:12px;display:flex;border-radius:4px;overflow:hidden"><i style="width:${Math.round(e * 100)}%;background:linear-gradient(90deg,#1E46D8,#5B8CFF)"></i><i style="flex:1;background:linear-gradient(90deg,#FF9A6B,#F0542A)"></i></div><span class="small num">${esc(vs.id)}</span></div>
        <div class="num" style="font-size:22px;font-weight:700;margin-top:6px">${Math.round(e * 100)}% <span class="small mute" style="font-weight:500">이기면 +${(K * (1 - e)).toFixed(1)} · 지면 −${(K * e).toFixed(1)}</span></div>` : ''}
      </div></div>
  </section>
  <section class="card"><h2>상대 티어별 개인전 <span class="mute">${esc(season.label)} · 상대의 시즌 티어 기준 · 내 티어 ${esc(tier)}</span></h2>
    ${(() => { const rows = TIERS.slice().reverse().map(t => { const [w, l] = vt[t] || [0, 0]; return { t, w, l, n: w + l, p: pct(w, w + l) }; }).filter(x => x.n);
      if (!rows.length) return '<div class="mute small">이 시즌 개인전 기록이 없습니다</div>';
      const my = TIERS.indexOf(tier);
      return `<div class="tvt">${rows.map(x => { const d = TIERS.indexOf(x.t) - my; const rel = d > 0 ? `${d}단계 위` : d < 0 ? `${-d}단계 아래` : '같은 티어';
        return `<div class="tvt-r${d === 0 ? ' same' : ''}"><span class="tvt-t"><b style="color:${TIER_COLOR[x.t]}">${x.t}</b><small class="mute">${rel}</small></span>
          <div class="pbar duo"><div class="bar"><i class="t1" style="width:${x.p}%"></i><i class="t2"></i></div></div>
          <span class="num tvt-n">${x.w}승 ${x.l}패</span><b class="num tvt-p" style="color:${col(x.p)}">${x.p}%</b>${x.n < 5 ? '<small class="tvt-s">표본 적음</small>' : '<small class="tvt-s"></small>'}</div>`; }).join('')}</div>`; })()}
  </section>
  <section class="grid3">
    <div class="card"><h2>베스트 파트너 <span class="mute">팀전</span></h2>${top(part, 6).map(li).join('') || '<div class="mute small">팀전 기록 없음</div>'}</div>
    <div class="card"><h2>라이벌 · 천적 <span class="mute">개인전</span></h2>${rv.map(li).join('') || '<div class="mute small">개인전 기록 없음</div>'}</div>
    <div class="card"><h2>맵별 성적 <span class="mute">개인전</span></h2>${top(maps, 7).map(li).join('') || '<div class="mute small">개인전 기록 없음</div>'}</div>
  </section>
  <section class="card"><h2>최근 경기 <span class="mute">승리 확률은 경기 직전 레이팅 기준</span></h2>
    <div class="gl small mute" style="border-top:0"><span>날짜</span><span></span><span>상대</span><span class="c-map">맵</span><span class="c-p">경기 전 승리 확률</span><span style="text-align:right">변동</span><span class="c-r" style="text-align:right">레이팅</span></div>
    ${recent.map(h => { const m = evById.get(h.mid); if (!m) return ''; const ev = eng.events.get(m.id); const [A, B] = sides(m); const mineA = A.includes(id); const other = mineA ? B : A; const team = (mineA ? A : B).filter(x => x !== id);
      const pw = Math.round((mineA ? ev.e : 1 - ev.e) * 100);
      return `<div class="gl"><span class="num mute">${fmtD(h.date)}</span>${formPills([h.win])}<span>${other.map(x => `<a href="#/player?id=${encodeURIComponent(x)}" style="color:var(--text)">${esc(x)}</a>`).join(' · ')}${team.length ? `<span class="small mute"> (with ${team.map(esc).join(', ')})</span>` : ''}</span><span class="c-map" style="color:var(--text2)">${esc(m.map)}</span>
        <span class="c-p pbar"><span class="bar"><i style="width:${pw}%"></i></span><span>${pw}%</span></span><span class="num" style="text-align:right;font-weight:700;color:${signColor(h.d)}">${sign(h.d, 1)}</span><span class="c-r num" style="text-align:right">${Math.round(h.r)}</span></div>`; }).join('')}
  </section>` : ''}
  </div>`;

  el.querySelector('#pSeason').onchange = e2 => set('season', e2.target.value);
  const pv = el.querySelector('#pVs'); if (pv) pv.onchange = () => set('vs', pv.value);
  el.querySelector('[data-pick]').onclick = () => go('player', { pick: 1 });
  const sm = el.querySelector('[data-setme]'); if (sm) sm.onclick = () => { app.setMe(id); };
}

function ratingChart(hist) {
  if (hist.length < 2) return '<div class="mute small">경기가 2개 이상 있어야 그래프가 그려집니다</div>';
  const W = 760, H = 230, X0 = 44, X1 = 750, Y0 = 12, Y1 = 196;
  const vals = [hist[0].pre, ...hist.map(h => h.r)];
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = Math.max(10, (hi - lo) * 0.12); lo -= pad; hi += pad;
  const x = i => X0 + i * (X1 - X0) / (vals.length - 1), y = v => Y1 - (v - lo) / (hi - lo) * (Y1 - Y0);
  const line = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = [hi - pad, (hi + lo) / 2, lo + pad].map(Math.round);
  const months = []; let last = '';
  hist.forEach((h, i) => { const mo = h.date.slice(5, 7); if (mo !== last) { months.push([i + 1, +mo + '월']); last = mo; } });
  const peak = vals.indexOf(Math.max(...vals));
  return `<svg viewBox="0 0 ${W} ${H + 18}" style="width:100%;height:auto" role="img" aria-label="레이팅 추이: ${Math.round(vals[0])}에서 ${Math.round(vals[vals.length - 1])}">
    ${ticks.map(t => `<line x1="${X0}" x2="${X1}" y1="${y(t)}" y2="${y(t)}" stroke="#E3E8F0"/><text x="0" y="${y(t) + 4}" fill="#5B6475" font-size="11" font-family="Oxanium">${t}</text>`).join('')}
    <polygon points="${X0},${Y1} ${line} ${X1},${Y1}" fill="#2F5BEA" fill-opacity=".08"/>
    <polyline points="${line}" fill="none" stroke="#2F5BEA" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="${x(peak)}" cy="${y(vals[peak])}" r="4" fill="none" stroke="#7FA0F5" stroke-width="1.5"/>
    <circle cx="${x(vals.length - 1)}" cy="${y(vals[vals.length - 1])}" r="5" fill="#2F5BEA"/>
    ${months.map(([i, l]) => `<text x="${x(i)}" y="${H + 12}" fill="#5B6475" font-size="11">${l}</text>`).join('')}
  </svg>`;
}

function picker(app, el, p) {
  const q = (p.get('q') || '').toLowerCase();
  const season = app.seasonFromParam(p.get('season'));
  const eng = app.engine(app.method, 'all');
  const refDate = season.key === app.current.key ? todayKST() : season.end;
  const rows = new Map(seasonTable(app.matches, eng, season, app, refDate).map(r => [r.id, r]));
  const list = [...app.players.values()].filter(x => !C.HIDE_IDS.includes(x.id)).map(x => {
    const r = rows.get(x.id);
    return { id: x.id, isNew: x.isNew, race: x.race, tier: app.tierAt(x.id, season.key), row: r, rating: r ? r.r : null };
  });
  const groups = TIERS.slice().reverse().map(t => [t, list.filter(x => x.tier === t)
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.id.localeCompare(b.id))]).filter(([, xs]) => xs.length);
  const seasonOpts = app.seasonsWithData().map(s => `<option value="${s.key}" ${s.key === season.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  const card = x => {
    const r = x.row;
    return `<a class="tile pcard${r ? '' : ' idle'}" href="#/player?id=${encodeURIComponent(x.id)}&season=${season.key}" data-name="${esc(x.id.toLowerCase())}">
      <div class="pc-top">${raceBadge(x.race)}<b class="pc-name">${esc(x.id)}</b>${x.isNew ? '<span class="tag acc">신규</span>' : ''}${r && r.rank ? `<span class="pc-rank num">#${r.rank}</span>` : ''}</div>
      <div class="pc-bot">${r ? `<span class="pc-rec"><span class="num">${r.w}승 ${r.l}패</span> · <b class="num">${pct(r.w, r.games)}%</b>${r.eligible ? '' : ' <small class="prov-tag">배치중</small>'}</span><span class="pc-r num">${Math.round(r.r)}</span>` : `<span class="mute small">이번 시즌 경기 없음</span><span class="pc-r num mute2">${Math.round(eng.R.get(x.id) ?? (app.method === 'v2' ? 1000 + (Math.max(0, TIERS.indexOf(x.tier)) - 2) * C.V2.TIER_STEP : 1000))}</span>`}</div></a>`;
  };
  el.innerHTML = `<div class="head"><div><div class="eyebrow">PLAYERS</div><h1 class="title">선수</h1><div class="desc">티어별로 레이팅 높은 순 · 오른쪽 숫자는 ${app.method === 'v2' ? '레이팅 v2' : 'ELO 점수'} · 승패는 선택한 시즌 기준 · 누르면 상세 기록</div></div>
    <div class="row"><button class="btn" id="pkNew">+ 선수 등록 신청</button><select id="pkS" class="fld" aria-label="시즌">${seasonOpts}</select><input id="pkQ" class="fld" placeholder="ID 검색" value="${esc(p.get('q') || '')}" aria-label="선수 검색"></div></div>
    <div class="stack">${groups.map(([t, xs]) => `<section class="tgroup" data-tier="${t}">
      <div class="tg-h"><span class="tg-dot" style="background:${TIER_COLOR[t]}"></span><b style="color:${TIER_COLOR[t]}">${t}</b><span class="mute small">${xs.length}명 · 이번 시즌 ${xs.filter(x => x.row).length}명 출전</span></div>
      <div class="grid4">${xs.map(card).join('')}</div></section>`).join('')}</div>`;
  const i = el.querySelector('#pkQ');
  const filt = () => { const v = i.value.toLowerCase(); el.querySelectorAll('.tgroup').forEach(g => { let n = 0; g.querySelectorAll('.pcard').forEach(t => { const on = !v || t.dataset.name.includes(v); t.hidden = !on; n += on; }); g.hidden = !n; }); };
  i.oninput = filt; filt();
  el.querySelector('#pkNew').onclick = () => app.registerPlayer(id => app.players.has(id) ? go('player', { id }) : null);
  el.querySelector('#pkS').onchange = e => go('player', { pick: 1, season: e.target.value, q: i.value });
}
