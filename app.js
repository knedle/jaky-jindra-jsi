(function () {
  const PAGES = [
    { key: 'jindra', path: '',        label: 'Jindra' },
    { key: 'dan',    path: 'dan/',    label: 'Dan' },
    { key: 'filip',  path: 'filip/',  label: 'Filip' },
    { key: 'adam',   path: 'adam/',   label: 'Adam' },
    { key: 'random', path: 'random/', label: 'Create' },
  ];
  const cfg = window.PAGE;           // { key, root, defaults: [nadpis, tl, tr, bl, br] }
  const MAX = 60;
  const FIELDS = ['Nadpis', 'Vlevo nahoře', 'Vpravo nahoře', 'Vlevo dole', 'Vpravo dole'];
  const CORNERS = ['tl', 'tr', 'bl', 'br'];
  const ANGLE = { tl: -45, tr: 45, br: 135, bl: 225 };

  // ---- sdílení přes ?d= (base64 z JSON pole pěti hodnot, UTF-8) ----
  function encode(values) {
    const bytes = new TextEncoder().encode(JSON.stringify(values));
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function decode(str) {
    const bin = atob(str);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const arr = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(arr) || arr.length !== 5) throw new Error('čekám pole 5 hodnot');
    return arr.map(v => String(v ?? '').slice(0, MAX));
  }

  let values = cfg.defaults.slice();
  let fromLink = false;
  const d = new URLSearchParams(location.search).get('d');
  if (d) {
    try { values = decode(d); fromLink = true; }
    catch (e) { console.warn('Poškozený odkaz, používám výchozí texty.', e); }
  }

  // ---- kostra stránky ----
  const nav = document.createElement('nav');
  PAGES.forEach(p => {
    const a = document.createElement('a');
    a.href = cfg.root + p.path;
    a.textContent = p.label;
    if (p.key === cfg.key) a.className = 'active';
    nav.appendChild(a);
  });

  const main = document.createElement('main');
  main.innerHTML = `
    <form id="form" autocomplete="off">
      <h2>Nastav texty</h2>
      ${FIELDS.map((f, i) => `<label>${f}<input name="f${i}" maxlength="${MAX}"></label>`).join('')}
      <div class="buttons">
        <button type="submit" class="primary">Použít</button>
        <button type="button" class="secondary hidden" id="share">Sdílet</button>
      </div>
    </form>
    <section class="preview">
      <h1 class="title" id="title"></h1>
      <div class="dial-wrap" id="wrap">
        ${CORNERS.map(c => `<button type="button" class="lbl ${c}" data-c="${c}"></button>`).join('')}
        <svg class="dial" id="dial" viewBox="0 0 400 400" role="button" aria-label="Roztočit ručičku">
          <circle cx="200" cy="200" r="186" fill="hsl(28 10% 10%)" stroke="hsl(36 72% 55%)" stroke-width="2"/>
          <circle cx="200" cy="200" r="168" fill="none" stroke="hsl(32 12% 22%)" stroke-width="1"/>
          ${[-45, 45, 135, 225].map(a => `<line x1="200" y1="22" x2="200" y2="52" stroke="hsl(36 72% 55%)" stroke-width="4" stroke-linecap="round" transform="rotate(${a} 200 200)"/>`).join('')}
          ${[0, 90, 180, 270].map(a => `<line x1="200" y1="24" x2="200" y2="36" stroke="hsl(32 12% 30%)" stroke-width="2" transform="rotate(${a} 200 200)"/>`).join('')}
          <g id="needle">
            <polygon points="200,46 210,200 200,222 190,200" fill="hsl(5 72% 52%)"/>
            <polygon points="200,46 200,222 190,200" fill="hsl(5 72% 42%)"/>
          </g>
          <circle cx="200" cy="200" r="16" fill="hsl(36 72% 55%)"/>
          <circle cx="200" cy="200" r="6" fill="hsl(28 12% 7%)"/>
        </svg>
      </div>
    </section>`;
  document.body.append(nav, main);

  const form = main.querySelector('#form');
  const shareBtn = main.querySelector('#share');
  const titleEl = main.querySelector('#title');
  const needle = main.querySelector('#needle');
  const labels = {};
  main.querySelectorAll('.lbl').forEach(b => { labels[b.dataset.c] = b; });

  FIELDS.forEach((_, i) => { form.elements['f' + i].value = values[i]; });
  if (fromLink) shareBtn.classList.remove('hidden');

  // ---- náhled ----
  function fitTitle() {
    const avail = titleEl.clientWidth;
    let size = 64;
    titleEl.style.fontSize = size + 'px';
    while (titleEl.scrollWidth > avail && size > 14) {
      size -= 1;
      titleEl.style.fontSize = size + 'px';
    }
  }
  function renderPreview() {
    titleEl.textContent = values[0];
    CORNERS.forEach((c, i) => { labels[c].textContent = values[i + 1]; });
    document.title = values[0] || 'Jaký Jindra jsi?';
    fitTitle();
  }

  // ---- ručička ----
  let rotation = 0; // na začátku míří nahoru, mimo všechny rohy
  let active = null;
  let spinning = false;
  needle.style.transform = `rotate(${rotation}deg)`;

  function highlight(c) {
    active = c;
    CORNERS.forEach(k => labels[k].classList.toggle('on', k === c));
  }
  function rotateTo(c, extraTurns, quick) {
    const target = ANGLE[c];
    const cur = ((rotation % 360) + 360) % 360;
    let delta = ((target - cur) % 360 + 360) % 360;
    if (delta === 0 && !extraTurns) return Promise.resolve();
    rotation += delta + 360 * extraTurns;
    needle.classList.toggle('quick', !!quick);
    needle.style.transform = `rotate(${rotation}deg)`;
    return new Promise(res => setTimeout(res, quick ? 700 : 2400));
  }
  function spin() {
    if (spinning) return;
    spinning = true;
    highlight(null);
    const c = CORNERS[Math.floor(Math.random() * 4)];
    rotateTo(c, 3 + Math.floor(Math.random() * 3), false).then(() => {
      highlight(c);
      spinning = false;
    });
  }
  main.querySelector('#dial').addEventListener('click', spin);
  CORNERS.forEach(c => labels[c].addEventListener('click', () => {
    if (spinning) return;
    highlight(c);
    rotateTo(c, 0, true);
  }));

  // ---- formulář a sdílení ----
  form.addEventListener('submit', e => {
    e.preventDefault();
    values = FIELDS.map((_, i) => form.elements['f' + i].value.slice(0, MAX));
    const url = new URL(location.href);
    url.searchParams.set('d', encode(values));
    history.replaceState(null, '', url);
    shareBtn.classList.remove('hidden');
    renderPreview();
  });
  shareBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = 'Zkopírováno';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  });

  window.addEventListener('resize', fitTitle);
  if (document.fonts) document.fonts.ready.then(fitTitle);
  renderPreview();
})();
