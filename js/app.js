/* Cargo Flow Africa admin — UI only, demo data in memory (no API).
   To connect a backend later, replace the db object and the save/delete calls in edit(). */
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n, c) => (c === 'USD' ? '$' : 'R') + Number(n || 0).toLocaleString('en-ZA');
const fdate = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'No date';
const tone = s => ({ Open: 'good', Published: 'good', Verified: 'good', Assigned: 'warn', Draft: 'warn', 'Pending docs': 'warn', New: 'hot' }[s] || '');
let uid = 100;
const state = { view: 'home', range: 7, load: 'All', reg: 'transporters', con: 'posts', person: null };

/* ---------- demo data ---------- */
const db = {
  loads: [
    { id: 1, origin: 'Durban Port', destination: 'Lubumbashi', commodity: 'Copper cathodes (return load)', truck: 'Superlink', trucks: 6, rate: 3400, cur: 'USD', terms: '14 days', date: '2026-10-24', status: 'Open' },
    { id: 2, origin: 'Johannesburg', destination: 'Kolwezi', commodity: 'Mining chemicals', truck: 'Tanker', trucks: 3, rate: 4150, cur: 'USD', terms: '50% advance', date: '2026-10-27', status: 'Open' },
    { id: 3, origin: 'Richards Bay', destination: 'Lusaka', commodity: 'Fertiliser, 34t bagged', truck: 'Tautliner', trucks: 10, rate: 2650, cur: 'USD', terms: '30 days', date: '2026-11-02', status: 'Assigned' },
    { id: 4, origin: 'Kante', destination: 'Durban Port', commodity: 'Containers, 40ft', truck: 'Flatbed', trucks: 4, rate: 41000, cur: 'ZAR', terms: 'On delivery', date: '2026-10-15', status: 'Closed' }
  ],
  posts: [
    { id: 11, title: 'Beitbridge border clearance: what drivers need in 2026', cat: 'Compliance', meta: 'A plain guide to Beitbridge clearance for cross-border drivers: documents, queue times and the mistakes that cost a full day.', body: 'Cross-border haulage into Zimbabwe and the DRC starts at Beitbridge. '.repeat(6), status: 'Published' },
    { id: 12, title: 'Durban to Lubumbashi corridor guide', cat: 'Corridors', meta: 'Draft meta.', body: 'Route notes to come.', status: 'Draft' }
  ],
  jobs: [
    { id: 21, title: 'Extra-link truck driver (C1/EC)', loc: 'Durban', type: 'Full time', close: '2026-11-15', desc: 'Cross-border experience, valid PrDP and passport.', apps: 14, status: 'Published' },
    { id: 22, title: 'Dispatch controller', loc: 'Johannesburg', type: 'Full time', close: '2026-11-01', desc: 'Manage daily dispatch across the DRC corridor.', apps: 6, status: 'Published' }
  ],
  people: {
    clients: [
      { id: 31, name: 'Katanga Mining Supplies', status: 'New', info: { 'Contact person': 'Grace Mwila', Phone: '+243 81 555 0142', Email: 'grace@katangams.cd', 'Typical cargo': 'Mining chemicals', 'Monthly volume': '12 loads', 'Payment terms': '30 days' }, docs: { 'Company registration': true, 'Credit application': false, 'VAT certificate': true } }
    ],
    transporters: [
      { id: 41, name: 'Mthembu Heavy Haulage', status: 'Pending docs', info: { Owner: 'Sipho Mthembu', Phone: '+27 82 555 0187', 'Fleet size': '14 trucks', 'Truck types': 'Superlink, Flatbed', Corridors: 'SA to DRC, SA to Zambia', Base: 'Emalahleni' }, docs: { 'CIPC registration': true, 'Tax clearance': true, 'Goods-in-transit insurance': false, 'Cross-border permit': true, 'Fleet list': false } },
      { id: 42, name: 'Zambezi Freight Co', status: 'Verified', info: { Owner: 'Tendai Moyo', Phone: '+260 97 555 0119', 'Fleet size': '8 trucks', 'Truck types': 'Tautliner', Corridors: 'Zambia to SA', Base: 'Livingstone' }, docs: { 'CIPC registration': true, 'Tax clearance': true, 'Goods-in-transit insurance': true, 'Cross-border permit': true, 'Fleet list': true } }
    ],
    drivers: [
      { id: 51, name: 'Thabo Nkosi', status: 'New', info: { Phone: '+27 71 555 0163', Licence: 'EC, 9 years', 'Cross-border': 'Yes, DRC and Zambia', 'Home town': 'Secunda', Availability: 'Immediately' }, docs: { Passport: true, PrDP: true, 'Medical certificate': false, 'Police clearance': false, 'Two references': true } }
    ]
  }
};

/* ---------- form definitions: add or rename fields here ---------- */
const LOAD_F = [
  { k: 'origin', l: 'Origin', ph: 'Durban Port', r: 1, h: 1 }, { k: 'destination', l: 'Destination', ph: 'Lubumbashi', r: 1, h: 1 },
  { k: 'commodity', l: 'Commodity', ph: 'What is being moved?', r: 1 },
  { k: 'truck', l: 'Truck type', t: 'select', o: ['Superlink', 'Tautliner', 'Flatbed', 'Tanker', 'Reefer', 'Side tipper'], h: 1 }, { k: 'trucks', l: 'Trucks needed', t: 'number', r: 1, h: 1 },
  { k: 'rate', l: 'Rate per truck', t: 'number', r: 1, h: 1 }, { k: 'cur', l: 'Currency', t: 'select', o: ['USD', 'ZAR'], h: 1 },
  { k: 'terms', l: 'Payment terms', t: 'select', o: ['On delivery', '7 days', '14 days', '30 days', '50% advance'], h: 1 }, { k: 'date', l: 'Pickup date', t: 'date', h: 1 },
  { k: 'status', l: 'Status', t: 'select', o: ['Open', 'Assigned', 'Closed'] }
];
const POST_F = [
  { k: 'title', l: 'Title', ph: 'Aim for 30 to 60 characters', r: 1 }, { k: 'cat', l: 'Category', t: 'select', o: ['Corridors', 'Compliance', 'Fleet', 'Company news'], h: 1 }, { k: 'status', l: 'Status', t: 'select', o: ['Draft', 'Published'], h: 1 },
  { k: 'meta', l: 'Search description', t: 'area', rows: 3, max: 160, ph: 'Shown on Google. Aim for 110 to 160 characters' },
  { k: 'body', l: 'Article', t: 'area', rows: 9, ph: 'Write the article here' }
];
const JOB_F = [
  { k: 'title', l: 'Job title', r: 1 }, { k: 'loc', l: 'Location', h: 1 }, { k: 'type', l: 'Type', t: 'select', o: ['Full time', 'Contract', 'Trip basis'], h: 1 },
  { k: 'close', l: 'Closing date', t: 'date', h: 1 }, { k: 'status', l: 'Status', t: 'select', o: ['Published', 'Draft', 'Closed'], h: 1 },
  { k: 'desc', l: 'Requirements', t: 'area', rows: 5 }
];
const seo = p => (p.title.length >= 25 && p.title.length <= 65 ? 30 : 10) + (p.meta.length >= 110 && p.meta.length <= 160 ? 40 : p.meta.length > 30 ? 15 : 0) + (p.body.length >= 300 ? 30 : 10);

/* ---------- sheet + form helpers ---------- */
function openSheet(title, body, foot) {
  $('#sTitle').textContent = title; $('#sBody').innerHTML = body; $('#sFoot').innerHTML = foot || '';
  $('#sheet').classList.add('on'); $('#scrim').classList.add('on');
}
const closeSheet = () => { $('#sheet').classList.remove('on'); $('#scrim').classList.remove('on'); };
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }

function input(f, v = '') {
  const n = `name="${f.k}"`;
  if (f.t === 'select') return `<select ${n}>${f.o.map(o => `<option${o == v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  if (f.t === 'area') return `<textarea ${n} rows="${f.rows || 4}" placeholder="${f.ph || ''}"${f.max ? ` maxlength="${f.max}"` : ''}>${esc(v)}</textarea>`;
  return `<input ${n} type="${f.t || 'text'}" value="${esc(v)}" placeholder="${f.ph || ''}"${f.t === 'number' ? ' inputmode="decimal"' : ''}>`;
}
function form(title, fields, vals, onSave, onDel) {
  const v = vals || {};
  openSheet(title,
    `<div class="grid">${fields.map(f => `<label class="field${f.h ? ' half' : ''}"><span>${f.l}</span>${input(f, v[f.k])}${f.max ? `<small data-c="${f.k}">${(v[f.k] || '').length}/${f.max}</small>` : ''}</label>`).join('')}</div>`,
    `${onDel ? '<button class="btn danger" id="fDel">Delete</button>' : ''}<button class="btn primary" id="fSave">${vals && vals.id ? 'Save changes' : 'Publish'}</button>`);
  $$('#sBody [name]').forEach(el => el.addEventListener('input', () => { const c = $(`[data-c="${el.name}"]`); if (c) c.textContent = `${el.value.length}/${el.maxLength}`; }));
  $('#fSave').onclick = () => {
    let bad = false; const out = {};
    fields.forEach(f => { const el = $(`#sBody [name="${f.k}"]`); out[f.k] = el.value.trim(); const miss = f.r && !out[f.k]; el.closest('.field').classList.toggle('err', !!miss); bad = bad || miss; });
    if (bad) return toast('Fill in the highlighted fields');
    onSave(out);
  };
  if (onDel) $('#fDel').onclick = onDel;
}
function edit(list, fields, id, noun, defaults) {
  const it = id ? list.find(x => x.id == id) : null;
  form((it ? 'Edit ' : 'New ') + noun, fields, it || defaults,
    v => { if (it) Object.assign(it, v); else list.unshift({ id: ++uid, apps: 0, ...v }); closeSheet(); toast(it ? 'Changes saved' : 'Published'); render(); },
    it && (() => { list.splice(list.indexOf(it), 1); closeSheet(); toast('Deleted'); render(); }));
}

/* ---------- views ---------- */
function chart(d) {
  const w = 320, h = 110, mx = Math.max(...d), mn = Math.min(...d), x = i => i * w / (d.length - 1), y = v => h - 10 - (v - mn) / (mx - mn || 1) * (h - 34);
  const p = d.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Visitors chart"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4a44c" stop-opacity=".35"/><stop offset="1" stop-color="#d4a44c" stop-opacity="0"/></linearGradient></defs><path d="${p}L${w} ${h}L0 ${h}Z" fill="url(#g)"/><path class="line" pathLength="1" d="${p}"/><circle cx="${x(d.length - 1)}" cy="${y(d[d.length - 1])}" r="5" fill="#d4a44c"/></svg>`;
}
const bars = rows => rows.map(([n, v]) => `<div class="bar"><div><span>${n}</span><b>${v}%</b></div><i><u data-w="${v}"></u></i></div>`).join('');

function home() {
  const d = state.range === 7 ? [212, 248, 231, 290, 342, 318, 386] : Array.from({ length: 30 }, (_, i) => Math.round(190 + i * 5 + Math.sin(i / 2) * 38));
  const tot = d.reduce((a, b) => a + b, 0), open = db.loads.filter(l => l.status === 'Open').length;
  const newReg = Object.values(db.people).flat().filter(p => p.status === 'New').length;
  $('#v-home').innerHTML = `
  <div class="pulse">
    <div class="seg">${[7, 30].map(r => `<button data-a="range" data-id="${r}" class="${state.range === r ? 'on' : ''}">${r} days</button>`).join('')}</div>
    <p class="big">${tot.toLocaleString('en-ZA')}</p>
    <p class="sub">Website visitors, <b>up 18%</b> on the previous ${state.range} days</p>
    ${chart(d)}
  </div>
  <div class="quick"><button class="btn gold" data-a="load">Post a load</button><button class="btn primary" data-a="post">Write article</button></div>
  <div class="kpis">
    <div class="kpi"><b>${open}</b><span>Open loads</span></div>
    <div class="kpi"><b>${newReg}</b><span>New sign-ups</span></div>
    <div class="kpi"><b>3m 12s</b><span>Avg. time on site</span></div>
  </div>
  <h2>Most visited pages</h2><div class="panel">${bars([['Open loads', 42], ['Corridors', 27], ['Careers', 18], ['Transporter sign-up', 13]])}</div>
  <h2>Where visitors come from</h2><div class="panel">${bars([['WhatsApp links', 46], ['Google search', 31], ['Direct', 15], ['Facebook', 8]])}</div>
  <h2>Latest activity</h2>
  <ul class="panel feed"><li>Mthembu Heavy Haulage submitted transporter details<em>12 min</em></li><li>Thabo Nkosi sent a driver pack<em>1 h</em></li><li>Quote request for Durban to Lubumbashi<em>3 h</em></li></ul>`;
  requestAnimationFrame(() => $$('[data-w]').forEach(u => u.style.width = u.dataset.w + '%'));
}

function loads() {
  const fs = ['All', 'Open', 'Assigned', 'Closed'], list = db.loads.filter(l => state.load === 'All' || l.status === state.load);
  $('#v-loads').innerHTML = `<div class="head"><h2>Loads</h2><span class="muted">${db.loads.length} on the website</span></div>
  <div class="chips">${fs.map(f => `<button data-a="filter" data-id="${f}" class="${state.load === f ? 'on' : ''}">${f}</button>`).join('')}</div>
  ${list.map(l => `<button class="card" data-a="load" data-id="${l.id}">
    <div class="row"><span class="chip ${tone(l.status)}">${l.status}</span><span class="muted">Pickup ${fdate(l.date)}</span></div>
    <div class="route"><span>${esc(l.origin)}</span><span>${esc(l.destination)}</span></div>
    <div class="row"><span>${esc(l.commodity)}</span><span class="rate">${money(l.rate, l.cur)}</span></div>
    <div class="tags"><span>${l.trucks} trucks needed</span><span>${l.truck}</span><span>Pay: ${l.terms}</span></div></button>`).join('') || '<p class="empty">No loads here yet. Tap Post a load to add one.</p>'}`;
}

function registry() {
  const tabs = { clients: 'Clients', transporters: 'Transporters', drivers: 'Drivers' }, list = db.people[state.reg], one = tabs[state.reg].slice(0, -1).toLowerCase();
  $('#v-registry').innerHTML = `<div class="seg">${Object.entries(tabs).map(([k, n]) => `<button data-a="regtab" data-id="${k}" class="${state.reg === k ? 'on' : ''}">${n}</button>`).join('')}</div>
  <div class="head" style="margin-top:16px"><h2>${tabs[state.reg]}</h2><span class="muted">${list.length} registered</span></div>
  <div class="link-card"><span>Website ${state.reg === 'drivers' ? 'driver pack' : one} form</span><button class="btn sm" data-a="link">Copy link</button></div>
  ${list.map(p => { const n = Object.values(p.docs), ok = n.filter(Boolean).length; return `<button class="card" data-a="person" data-id="${p.id}">
    <div class="row"><div class="av">${p.name[0]}</div><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="muted">${esc(Object.values(p.info)[1] || '')}</div></div><span class="chip ${tone(p.status)}">${p.status}</span></div>
    <div class="prog"><u style="width:${ok / n.length * 100}%"></u></div><div class="muted" style="margin-top:6px">${ok} of ${n.length} documents received</div></button>`; }).join('')}`;
}
function person(p, keep) {
  const sc = keep ? $('#sBody').scrollTop : 0;
  openSheet(p.name, `<span class="chip ${tone(p.status)}">${p.status}</span><div style="margin:12px 0 20px">${Object.entries(p.info).map(([k, v]) => `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <h3 style="margin-bottom:8px">Documents</h3>${Object.entries(p.docs).map(([k, v]) => `<button class="doc ${v ? 'ok' : ''}" data-a="doc" data-id="${k}"><i>${v ? '&#10003;' : ''}</i>${k}</button>`).join('')}`,
    `<button class="btn" data-a="request">Request missing</button><button class="btn primary" data-a="approve">Approve</button>`);
  $('#sBody').scrollTop = sc; state.person = p;
}

function content() {
  const isP = state.con === 'posts';
  $('#v-content').innerHTML = `<div class="seg"><button data-a="contab" data-id="posts" class="${isP ? 'on' : ''}">Articles</button><button data-a="contab" data-id="jobs" class="${!isP ? 'on' : ''}">Careers</button></div>
  <div class="head" style="margin-top:16px"><h2>${isP ? 'Articles' : 'Careers'}</h2><span class="muted">${isP ? 'Articles help you rank on Google' : 'Jobs shown on your website'}</span></div>
  ${isP ? db.posts.map(p => { const s = seo(p); return `<button class="card" data-a="post" data-id="${p.id}"><div class="row"><span class="chip ${tone(p.status)}">${p.status}</span><span class="chip ${s > 75 ? 'good' : s > 45 ? 'warn' : 'hot'}">Search score ${s}</span></div>
    <h3 style="margin:10px 0 4px;font-size:1rem">${esc(p.title)}</h3><span class="muted">${p.cat}</span></button>`; }).join('')
    : db.jobs.map(j => `<button class="card" data-a="job" data-id="${j.id}"><div class="row"><span class="chip ${tone(j.status)}">${j.status}</span><span class="muted">Closes ${fdate(j.close)}</span></div>
    <h3 style="margin:10px 0 4px;font-size:1rem">${esc(j.title)}</h3><span class="muted">${esc(j.loc)}, ${j.type}</span><div class="tags"><span>${j.apps} applications</span></div></button>`).join('')}`;
}

/* ---------- navigation + actions ---------- */
const V = { home, loads, registry, content };
function render() {
  V[state.view]();
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + state.view));
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.id === state.view));
  const fab = { loads: 'Post a load', content: state.con === 'posts' ? 'New article' : 'New job' }[state.view];
  $('#fab').classList.toggle('on', !!fab); if (fab) $('#fabTxt').textContent = fab;
}
const nav = v => { state.view = v; window.scrollTo(0, 0); render(); };
const miss = p => Object.values(p.docs).filter(d => !d).length;
const A = {
  nav: id => nav(id), close: closeSheet, who: () => toast('Signed in as Admin'),
  range: id => { state.range = +id; render(); },
  filter: id => { state.load = id; render(); },
  regtab: id => { state.reg = id; render(); },
  contab: id => { state.con = id; render(); },
  load: id => edit(db.loads, LOAD_F, id, 'load', { status: 'Open', cur: 'USD', terms: '14 days', trucks: 1 }),
  post: id => edit(db.posts, POST_F, id, 'article', { status: 'Draft', cat: 'Corridors', meta: '', body: '' }),
  job: id => edit(db.jobs, JOB_F, id, 'job', { status: 'Published', type: 'Full time' }),
  fab: () => A[state.view === 'loads' ? 'load' : state.con === 'posts' ? 'post' : 'job'](),
  link: () => toast('Form link copied'),
  person: id => person(db.people[state.reg].find(p => p.id == id)),
  doc: id => { const p = state.person; p.docs[id] = !p.docs[id]; person(p, 1); render(); },
  request: () => { const p = state.person; if (!miss(p)) return toast('Nothing missing'); p.status = 'Pending docs'; closeSheet(); toast('Request sent on WhatsApp'); render(); },
  approve: () => { const p = state.person, m = miss(p); if (m) return toast(`${m} document${m > 1 ? 's' : ''} still missing`); p.status = 'Verified'; closeSheet(); toast('Approved'); render(); }
};
document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t && A[t.dataset.a]) A[t.dataset.a](t.dataset.id); });
render();
