// Leonida Trophy Guide: checklist, filters, spoiler mode, roadmap counts, export/import.
// All data comes from data/trophies.json; progress lives in localStorage only.
const EARNED_KEY = 'gta6-trophy-guide-earned-v1';
const SAMPLE_EARNED = [2, 3, 4, 5, 8, 15, 16, 21, 30, 35, 52, 53];
const STAGE_NAMES = { 1: 'Stage 1', 2: 'Stage 2', 3: 'Stage 3', 4: 'Stage 4' };

const params = new URLSearchParams(location.search);
const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const spoilerBox = document.getElementById('spoiler');
const earnedOnlyBox = document.getElementById('earned-only');
const missableOnlyBox = document.getElementById('missable-only');
const filterNote = document.getElementById('filter-note');
const listMeta = document.getElementById('list-meta');
const emptyBox = document.getElementById('empty');

let earned = new Set(loadEarned());
let trophies = [];
let kindFilter = 'all';
let openId = null;

function loadEarned() {
  try { return JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]'); }
  catch { return []; }
}

function saveEarned() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
}

function applyUrlParams() {
  if (params.get('sample') === '1') {
    for (const id of SAMPLE_EARNED) earned.add(id);
    saveEarned();
  }
  if (params.get('spoiler') === 'off') spoilerBox.checked = false;
  if (params.get('spoiler') === 'on') spoilerBox.checked = true;
  const filter = params.get('filter');
  if (filter) setKindFilter(filter);
  if (params.get('earned') === 'only') earnedOnlyBox.checked = true;
  if (params.get('missable') === 'only') missableOnlyBox.checked = true;
  const open = Number(params.get('open'));
  if (open) openId = open;
  if (params.get('roadmap') === 'closed') setRoadmapCollapsed(true);
}

function setRoadmapCollapsed(collapsed) {
  const section = document.getElementById('roadmap');
  const btn = document.getElementById('roadmap-toggle');
  section.classList.toggle('collapsed', collapsed);
  btn.textContent = collapsed ? 'Show roadmap' : 'Hide roadmap';
}

function setKindFilter(kind) {
  kindFilter = kind;
  for (const chip of document.querySelectorAll('#kind-chips .chip')) {
    chip.classList.toggle('active', chip.dataset.kind === kind);
  }
}

function isSpoilerHidden(t) {
  return spoilerBox.checked && t.hidden && !earned.has(t.id);
}

function guideIsUnconfirmed(t) {
  return /unconfirmed|inferred/i.test(t.guide);
}

function trophyMatches(t) {
  if (kindFilter === 'story' && t.kind !== 'story') return false;
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter === 'collectibles' && t.kind !== 'collectibles') return false;
  if (kindFilter === 'activities' && t.kind !== 'activities') return false;
  if (kindFilter === 'online') return false; // all 55 trophies are offline
  if (gradeSelect.value !== 'all' && t.grade !== gradeSelect.value) return false;
  if (earnedOnlyBox.checked && !earned.has(t.id)) return false;
  if (missableOnlyBox.checked && !t.missable) return false;
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-count').textContent = `${done} of ${total} earned — ${pct}%`;
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (earned.has(t.id)) counts[t.grade]++;
  document.getElementById('progress-grade').textContent =
    `${counts.platinum} platinum · ${counts.gold} gold · ${counts.silver} silver · ${counts.bronze} bronze`;
}

function renderRoadmapCounts() {
  for (const stage of [1, 2, 3, 4]) {
    const n = trophies.filter((t) => t.roadmap === stage).length;
    const el = document.querySelector(`.stage-count[data-stage="${stage}"]`);
    if (el) el.textContent = `(${n} trophies)`;
  }
  const missable = trophies.filter((t) => t.missable);
  const callout = document.getElementById('missable-callout');
  if (missable.length) {
    callout.textContent = `⚠ Missable: ${missable.map((t) => t.name).join(', ')} — ` +
      'the balcony meditation in Chapter 1 is the only trophy PowerPyx and KeenGamer flag as missable. ' +
      'Do it before leaving Chapter 1.';
  }
}

function badge(kind, label) {
  const span = document.createElement('span');
  span.className = 'badge ' + kind;
  span.textContent = label;
  return span;
}

function renderList() {
  grid.replaceChildren();
  const shown = trophies.filter(trophyMatches);
  for (const t of shown) {
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.id) ? ' earned' : '');
    card.id = 'trophy-' + t.id;

    const head = document.createElement('div');
    head.className = 'card-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveEarned();
      renderProgress();
      renderList();
    });
    const titleWrap = document.createElement('div');
    titleWrap.className = 'card-title';
    const h3 = document.createElement('h3');
    h3.textContent = isSpoilerHidden(t) ? 'Hidden trophy' : t.name;
    if (isSpoilerHidden(t)) h3.classList.add('hidden-label');
    titleWrap.append(h3);
    const grade = document.createElement('span');
    grade.className = 'grade-badge grade-' + t.grade;
    grade.textContent = t.grade;
    head.append(box, titleWrap, grade);
    card.append(head);

    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = isSpoilerHidden(t)
      ? 'Hidden on PlayStation until earned — tick the box once you have it to reveal it.'
      : '“' + t.description + '”';
    card.append(desc);

    const badges = document.createElement('div');
    badges.className = 'card-badges';
    badges.append(badge('', t.kind));
    if (t.missable) badges.append(badge('missable', '⚠ Missable'));
    if (t.hidden) badges.append(badge('hidden', 'Hidden'));
    if (t.count) badges.append(badge('', '× ' + t.count.toLocaleString('en-US')));
    if (guideIsUnconfirmed(t)) badges.append(badge('unconfirmed', 'Method unconfirmed'));
    card.append(badges);

    const guide = document.createElement('p');
    guide.className = 'card-guide';
    const label = document.createElement('span');
    label.className = 'guide-label';
    label.textContent = 'Guide';
    guide.append(label);
    guide.append(document.createTextNode(isSpoilerHidden(t) ? 'Hidden until earned.' : t.guide));
    card.append(guide);

    const detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'detail-btn';
    detailBtn.textContent = 'Full guide + sources';
    const detail = document.createElement('div');
    detail.className = 'detail';
    const stage = document.createElement('p');
    stage.textContent = STAGE_NAMES[t.roadmap] + ' of the roadmap · ' + t.kind +
      (t.missable ? ' · missable' : '') + (t.hidden ? ' · hidden on PlayStation' : '');
    stage.className = 'roadmap-tag';
    const fullGuide = document.createElement('p');
    fullGuide.textContent = t.guide;
    const srcLabel = document.createElement('p');
    srcLabel.className = 'sources-label';
    srcLabel.textContent = 'Sources';
    const srcList = document.createElement('ul');
    for (const s of t.sources) {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = s.name;
      li.append(strong, document.createTextNode(' — ' + s.note));
      srcList.append(li);
    }
    detail.append(stage, fullGuide, srcLabel, srcList);
    detailBtn.addEventListener('click', () => {
      const open = detail.classList.toggle('open');
      detailBtn.textContent = open ? 'Hide guide' : 'Full guide + sources';
    });
    card.append(detailBtn, detail);
    grid.append(card);

    if (openId === t.id) {
      detail.classList.add('open');
      detailBtn.textContent = 'Hide guide';
    }
  }
  listMeta.textContent = `Showing ${shown.length} of ${trophies.length} trophies` +
    (kindFilter === 'online' ? ' — there are no online trophies: all 55 are offline.' : '');
  filterNote.textContent = kindFilter === 'online'
    ? 'No online trophies: every one of the 55 is earned offline, confirmed by PowerPyx and KeenGamer.'
    : '';
  emptyBox.hidden = shown.length > 0;
  if (openId) {
    const target = document.getElementById('trophy-' + openId);
    if (target) target.scrollIntoView({ block: 'start' });
  }
}

function rerender() {
  renderProgress();
  renderList();
}

document.getElementById('export').addEventListener('click', () => {
  const payload = {
    game: 'Grand Theft Auto VI',
    exported: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const valid = new Set(trophies.map((t) => t.id));
    earned = new Set(ids.filter((id) => valid.has(id)));
    saveEarned();
    rerender();
  } catch {
    filterNote.textContent = 'That file could not be read as trophy progress — check it is the exported JSON.';
  }
  e.target.value = '';
});

for (const chip of document.querySelectorAll('#kind-chips .chip')) {
  chip.addEventListener('click', () => { setKindFilter(chip.dataset.kind); renderList(); });
}
gradeSelect.addEventListener('change', renderList);
spoilerBox.addEventListener('change', renderList);
earnedOnlyBox.addEventListener('change', renderList);
missableOnlyBox.addEventListener('change', renderList);
searchInput.addEventListener('input', renderList);
document.getElementById('reset-filters').addEventListener('click', () => {
  setKindFilter('all');
  gradeSelect.value = 'all';
  searchInput.value = '';
  earnedOnlyBox.checked = false;
  missableOnlyBox.checked = false;
  renderList();
});

const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
applyUrlParams();
renderRoadmapCounts();
rerender();
document.getElementById('roadmap-toggle').addEventListener('click', () => {
  setRoadmapCollapsed(!document.getElementById('roadmap').classList.contains('collapsed'));
});
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView();
}
if (params.get('view') === 'list') {
  document.getElementById('grid').scrollIntoView();
}
