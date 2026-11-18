// Token Launch Radar — board, filters, sorting, detail view. No network: all
// data comes from data.js (window.RADAR), written by main.ts from the same
// board the gate scores. Click a row for its model breakdown and farm plan.

(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) {
    document.getElementById('meta').textContent = 'No data: data.js is missing.';
    return;
  }

  var rows = R.rows.slice();

  function money(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function ageText(n) {
    if (n === null || n === undefined) return '—';
    if (n < 30) return n + 'd';
    if (n < 365) return Math.round(n / 30) + 'mo';
    return (n / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.getElementById('meta').textContent =
    'Snapshot ' + R.as_of + ' · ' + R.board_size + ' protocols ranked · ' + R.watchlist_size +
    ' on the watchlist · ' + R.early_size + ' early finds below the floor · model ' + R.model_version +
    ' · global multiple ' + R.global_multiple.toFixed(3);
  document.getElementById('model-text').textContent =
    'implied = TVL × category multiple × growth × maturity × staleness × chains. ' +
    'The category multiple is the median market-cap/TVL of live-token protocols in that category ' +
    '(global median ' + R.global_multiple.toFixed(3) + ' where a category has too few priced protocols). ' +
    'Growth is a smooth bounded factor of the 7-day change; maturity rises with age and saturates; ' +
    'old protocols still shrinking get a 0.90 staleness factor; each extra chain adds 4%.';
  document.getElementById('foot').textContent =
    'Source: ' + R.source + '. A board row says a protocol records no token, never that it has none. ' +
    'Implied values are this entry’s own claims, not prices. Farm plans are generic guidance, not financial advice.';

  var state = { q: '', cat: '', chain: '', watchOnly: false, sort: 'rank', dir: 1 };
  var tbody = document.getElementById('rows');
  var countEl = document.getElementById('count');

  var catSel = document.getElementById('cat');
  var cats = [];
  rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) === -1) cats.push(r.category); });
  cats.sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });
  var chainSel = document.getElementById('chain');
  var chains = [];
  rows.forEach(function (r) { r.chains.forEach(function (c) { if (chains.indexOf(c) === -1) chains.push(c); }); });
  chains.sort().forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    chainSel.appendChild(o);
  });

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.watchOnly && !r.on_watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) === -1) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function sorted(list) {
    var key = state.sort;
    var dir = state.dir;
    return list.slice().sort(function (a, b) {
      var av = a[key];
      var bv = b[key];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'string') return dir * (av < bv ? -1 : av > bv ? 1 : 0);
      if (Array.isArray(av)) return dir * (av.join(',') < bv.join(',') ? -1 : 1);
      return dir * (av - bv);
    });
  }

  var selected = null;

  function render() {
    var list = sorted(filtered());
    tbody.innerHTML = '';
    list.forEach(function (r) {
      var tr = document.createElement('tr');
      if (selected === r.slug) tr.className = 'selected';
      var chg = r.change_7d === null ? '<td class="num">—</td>' :
        '<td class="num ' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + pct(r.change_7d) + '</td>';
      tr.innerHTML =
        '<td class="num">' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b> <span class="pill' + (r.on_watchlist ? ' watch' : '') + '">' +
        (r.on_watchlist ? 'watchlist' : esc(r.slug)) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.join(', ') || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        chg +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><strong class="val">' + money(r.implied_value_usd) + '</strong></td>';
      tr.addEventListener('click', function () { showDetail(r); });
      tbody.appendChild(tr);
    });
    countEl.textContent = list.length + ' of ' + rows.length + ' protocols shown. Click a row for its model breakdown and farm plan.';
  }

  function showDetail(r) {
    selected = r.slug;
    var card = document.getElementById('detail-card');
    card.classList.remove('hidden');
    document.getElementById('detail-title').textContent = '#' + r.rank + ' · ' + r.name;
    var comps = (R.comparables[r.category || ''] || []).map(function (c) {
      return '<li>' + esc(c.name) + ' — mcap/TVL ' + (c.value_ratio === null ? '—' : c.value_ratio.toFixed(3)) +
        ' (mcap ' + money(c.mcap_usd) + ' on ' + money(c.tvl_usd) + ' TVL)</li>';
    }).join('');
    var steps = r.farm_steps.map(function (s, i) {
      return '<li><b>Step ' + (i + 1) + '.</b> ' + esc(s) + '</li>';
    }).join('');
    document.getElementById('detail-body').innerHTML =
      '<div class="detail-grid">' +
      '<div class="stat"><div class="k">Implied value</div><div class="v">' + money(r.implied_value_usd) + '</div></div>' +
      '<div class="stat"><div class="k">TVL</div><div class="v">' + money(r.tvl_usd) + '</div></div>' +
      '<div class="stat"><div class="k">7-day change</div><div class="v">' + pct(r.change_7d) + '</div></div>' +
      '<div class="stat"><div class="k">Age</div><div class="v">' + ageText(r.age_days) + '</div></div>' +
      '<div class="stat"><div class="k">Category multiple</div><div class="v">' + r.category_multiple.toFixed(3) + '</div></div>' +
      '<div class="stat"><div class="k">Chains</div><div class="v small">' + esc(r.chains.join(', ') || '—') + '</div></div>' +
      '</div>' +
      '<h3>Model breakdown</h3>' +
      '<p class="fine">implied = TVL × ' + r.category_multiple.toFixed(3) + ' (category) × ' +
      r.growth_multiplier.toFixed(3) + ' (growth) × ' + r.maturity_multiplier.toFixed(3) + ' (maturity) × ' +
      r.stale_multiplier.toFixed(2) + ' (staleness) × ' + r.chain_multiplier.toFixed(2) + ' (chains). ' +
      'The category multiple is the median live mcap/TVL in ' + esc(r.category || 'no category') + '.</p>' +
      '<h3>Live comparables in ' + esc(r.category || 'this category') + '</h3>' +
      (comps ? '<ul>' + comps + '</ul>' : '<p class="fine">No priced live-token protocol in this category; the global median multiple was used.</p>') +
      '<h3>Farm plan — ' + esc(r.name) + '</h3>' +
      '<ol>' + steps + '</ol>';
    render();
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderLive() {
    var lb = document.getElementById('live-rows');
    lb.innerHTML = '';
    R.live.forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><b>' + esc(p.name) + '</b></td>' +
        '<td>' + esc(p.category || '—') + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td>' +
        '<td class="num">' + money(p.mcap_usd) + '</td>' +
        '<td class="num">' + (p.value_ratio === null ? '—' : p.value_ratio.toFixed(3)) + '</td>';
      lb.appendChild(tr);
    });
  }

  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  document.getElementById('cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  document.getElementById('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  document.getElementById('watch-only').addEventListener('change', function (e) { state.watchOnly = e.target.checked; render(); });

  document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) { state.dir = -state.dir; } else { state.sort = key; state.dir = key === 'name' || key === 'category' || key === 'chains' ? 1 : -1; }
      document.querySelectorAll('#board th[data-sort]').forEach(function (h) { h.classList.remove('sorted'); });
      th.classList.add('sorted');
      render();
    });
  });

  var boardCard = document.getElementById('board-card');
  var liveCard = document.getElementById('live-card');
  var viewBoardBtn = document.getElementById('view-board');
  var viewLiveBtn = document.getElementById('view-live');
  viewBoardBtn.addEventListener('click', function () {
    boardCard.classList.remove('hidden');
    liveCard.classList.add('hidden');
    viewBoardBtn.classList.add('active');
    viewLiveBtn.classList.remove('active');
  });
  viewLiveBtn.addEventListener('click', function () {
    boardCard.classList.add('hidden');
    liveCard.classList.remove('hidden');
    viewLiveBtn.classList.add('active');
    viewBoardBtn.classList.remove('active');
    renderLive();
  });

  render();
})();

