// Spatial Intent Presets Playground — frontend
// 拉 /api/presets, /api/brands, /api/preset-block, /api/compile 然后渲染 UI。

const state = {
  presets: null,
  brands: [],
  selectedBrandKey: null,
  selectedPreset: null,
  block: null,
  compile: null,
  comparison: [], // [{ preset, charCount, intentSummary, byteEqualVsBalanced }]
};

const $ = (sel) => document.querySelector(sel);

async function fetchJson(path) {
  const r = await fetch(path);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${path} -> ${r.status}: ${text}`);
  }
  return r.json();
}

function renderBrandSelector() {
  const sel = $('#brand-select');
  sel.innerHTML = '';
  for (const b of state.brands) {
    const opt = document.createElement('option');
    opt.value = b.key;
    opt.textContent = `${b.brandName} · ${b.industry ?? '?'} (${b.key})`;
    sel.appendChild(opt);
  }
  if (state.brands.length > 0) {
    sel.value = state.brands[0].key;
    state.selectedBrandKey = sel.value;
  }
  sel.addEventListener('change', () => {
    state.selectedBrandKey = sel.value;
    void refresh();
  });
}

function renderPresetButtons() {
  const wrap = $('#preset-buttons');
  wrap.innerHTML = '';
  for (const p of state.presets.supported) {
    const detail = state.presets.details.find((d) => d.preset === p);
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.dataset.preset = p;
    btn.innerHTML = `
      <strong>${detail.label}</strong>
      <code>${p}</code>
    `;
    btn.addEventListener('click', () => {
      state.selectedPreset = p;
      [...wrap.querySelectorAll('.preset-btn')].forEach((b) =>
        b.classList.toggle('active', b.dataset.preset === p)
      );
      void refresh();
    });
    wrap.appendChild(btn);
  }
  // Default: balanced
  const defaultBtn = wrap.querySelector('[data-preset="balanced"]');
  if (defaultBtn) defaultBtn.click();
}

function renderIntentTable() {
  if (!state.block) return;
  const intent = state.block.spatialIntentPreset.intent;
  $('#intent-brand').textContent = intent.brandExpression;
  $('#intent-arch').textContent = intent.architectureExpression;
  $('#intent-ref').textContent = intent.referenceInfluence;
  $('#intent-industry').textContent = intent.industryConstraint;
}

function renderRuntimeTendency() {
  const wrap = $('#runtime-tendency');
  wrap.innerHTML = '';
  if (!state.block) return;
  const tend = state.block.spatialIntentPreset.runtimeTendency;
  const order = [
    ['enhance', 'Enhance (强化)'],
    ['maintain', 'Maintain (保持)'],
    ['balance', 'Balance (均衡)'],
    ['learn', 'Learn (从参考学)'],
    ['forbiddenCopy', 'Forbidden Copy (禁止复刻)'],
  ];
  for (const [key, label] of order) {
    const items = tend[key];
    if (!items || items.length === 0) continue;
    const sec = document.createElement('div');
    sec.className = 'tend';
    const h = document.createElement('h3');
    h.textContent = label;
    sec.appendChild(h);
    const ul = document.createElement('ul');
    for (const it of items) {
      const li = document.createElement('li');
      li.textContent = it;
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    wrap.appendChild(sec);
  }
}

function renderEmphasisBlock() {
  if (!state.block) {
    $('#emphasis-output').textContent = '(empty)';
    $('#emphasis-meta').textContent = '';
    return;
  }
  $('#emphasis-output').textContent = state.block.content;
  $('#emphasis-meta').textContent = `${state.block.spatialIntentPreset.label} · ${state.block.characterCount} chars`;
}

function renderCompileBlocks() {
  const wrap = $('#blocks-list');
  wrap.innerHTML = '';
  if (!state.compile) return;
  $('#compile-meta').textContent = `${state.compile.blockCount} blocks · ${state.compile.characterCount} chars · ${state.compile.runtimePath}`;
  for (const b of state.compile.blocks) {
    const card = document.createElement('details');
    card.className = 'block-card';
    if (b.id === 'spatial_intent_preset' || b.id === 'architecture_dna' || b.id === 'brand_translation' || b.id === 'space_role_context') {
      card.open = true;
    }
    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="bid">${b.id}</span><span class="bch">${b.charCount} chars</span>`;
    card.appendChild(summary);
    const pre = document.createElement('pre');
    pre.className = 'block-output';
    pre.textContent = b.text;
    card.appendChild(pre);
    wrap.appendChild(card);
  }
}

function renderComparison() {
  const wrap = $('#comparison-list');
  wrap.innerHTML = '';
  if (state.comparison.length === 0) return;
  const baseline = state.comparison.find((c) => c.preset === 'balanced');
  for (const c of state.comparison) {
    const card = document.createElement('div');
    card.className = `compare-card ${c.preset === state.selectedPreset ? 'active' : ''}`;
    const intent = c.intent;
    const tags = [
      `brand:${intent.brandExpression}`,
      `arch:${intent.architectureExpression}`,
      `ref:${intent.referenceInfluence}`,
      `industry:${intent.industryConstraint}`,
    ].map((t) => `<span class="tag">${t}</span>`).join('');
    const archEq = c.byteEqualVsBalanced?.archDnaEqual ? '✓' : '✗';
    const btEq = c.byteEqualVsBalanced?.brandTransEqual ? '✓' : '✗';
    const srEq = c.byteEqualVsBalanced?.spaceRoleEqual ? '✓' : '✗';
    const equal = archEq === '✓' && btEq === '✓' && srEq === '✓';
    card.innerHTML = `
      <header>
        <strong>${c.label}</strong>
        <code>${c.preset}</code>
      </header>
      <div class="tags">${tags}</div>
      <div class="byte-equal ${equal ? 'pass' : 'fail'}">
        vs balanced: arch_dna ${archEq} · brand_translation ${btEq} · space_role_context ${srEq}
        ${equal ? '✓ all byte-equal' : '✗ not equal'}
      </div>
      <div class="charcount">emphasis block: ${c.charCount} chars</div>
    `;
    wrap.appendChild(card);
  }
}

async function refresh() {
  if (!state.selectedBrandKey || !state.selectedPreset) return;
  try {
    const [block, compile] = await Promise.all([
      fetchJson(`/api/preset-block?brand=${state.selectedBrandKey}&preset=${state.selectedPreset}`),
      fetchJson(`/api/compile?brand=${state.selectedBrandKey}&preset=${state.selectedPreset}`),
    ]);
    state.block = block;
    state.compile = compile;
    renderIntentTable();
    renderRuntimeTendency();
    renderEmphasisBlock();
    renderCompileBlocks();
  } catch (err) {
    $('#emphasis-output').textContent = 'Error: ' + err.message;
  }
}

async function refreshComparison() {
  if (!state.selectedBrandKey) return;
  const results = [];
  const baseline = await fetchJson(`/api/compile?brand=${state.selectedBrandKey}&preset=balanced`);
  const baselineArch = baseline.blocks.find((b) => b.id === 'architecture_dna').text;
  const baselineBt = baseline.blocks.find((b) => b.id === 'brand_translation').text;
  const baselineSr = baseline.blocks.find((b) => b.id === 'space_role_context').text;
  for (const p of state.presets.supported) {
    const compile = await fetchJson(`/api/compile?brand=${state.selectedBrandKey}&preset=${p}`);
    const block = await fetchJson(`/api/preset-block?brand=${state.selectedBrandKey}&preset=${p}`);
    results.push({
      preset: p,
      label: block.spatialIntentPreset.label,
      intent: block.spatialIntentPreset.intent,
      charCount: block.characterCount,
      byteEqualVsBalanced: {
        archDnaEqual: compile.blocks.find((b) => b.id === 'architecture_dna').text === baselineArch,
        brandTransEqual: compile.blocks.find((b) => b.id === 'brand_translation').text === baselineBt,
        spaceRoleEqual: compile.blocks.find((b) => b.id === 'space_role_context').text === baselineSr,
      },
    });
  }
  state.comparison = results;
  renderComparison();
}

async function init() {
  try {
    const [presets, brands] = await Promise.all([
      fetchJson('/api/presets'),
      fetchJson('/api/brands'),
    ]);
    state.presets = presets;
    state.brands = brands.brands;
    renderBrandSelector();
    renderPresetButtons();
    await refreshComparison();
  } catch (err) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      `<pre class="err">Init error: ${err.message}</pre>`,
    );
  }
}

void init();
