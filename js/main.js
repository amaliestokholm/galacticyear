// =============================================================================
// One Galactic Year — script.js
// =============================================================================

const GALACTIC_YEAR    = 225_000_000;   // years per orbit
const SUN_AGE_MYA      = 4600;          // age of the Sun in million years
const TOTAL_ORBITS     = SUN_AGE_MYA / (GALACTIC_YEAR / 1_000_000); // ~20.44

// SVG coordinate constants (viewBox is 0 0 460 460)
const CX = 230, CY = 230, R = 185;
const CIRCUMFERENCE = 2 * Math.PI * R;

const MILESTONES = [
  { mya: 0, era: 'Quaternary', title: 'Present Day', desc: 'You are here.', icon: '🌍' },
  { mya: 0.3, era: 'Quaternary', title: 'Ice Ages & Homo sapiens', desc: 'Modern humans emerges. Repeated glaciations reshape continents. Woolly mammoths wander around Eurasia.', icon: '🧊' },
  { mya: 4500, era: 'Hadean', title: 'Earth & Moon Form', desc: 'A Mars-sized planet named Theia collides with the early planet Earth. The debris forms the Moon. Earth is a hellscape of molten rock and toxic gases.', icon: '🌑'},
  { mya: 4600, era: 'Solar Nebula', title: 'Birth of the Sun', desc: "A cloud of gas and dust collapses under its own gravity. The Sun ignites. This is orbit zero and thus the very beginning of our solar system's Galactic journey.", icon: '☀️' },
];

// State
let totalMya         = 0;     // 0 = present, 4600 = birth of Sun
let isDragging       = false;
let scrubbing        = false;
let prevDragAngle = null;
let lastMilestoneKey = null;
let hasInteracted    = false;
let showSeasons      = false;

const MYA_PER_ORBIT = GALACTIC_YEAR / 1_000_000; // 225

function getOrbitNumber(mya)   { return Math.floor(mya / MYA_PER_ORBIT); }
function getOrbitFraction(mya) { return (mya % MYA_PER_ORBIT) / MYA_PER_ORBIT; }

/** Circle angle (degrees, 0=top, CW) for a given totalMya. */
function myaToAngle(mya) {
  return (180 + getOrbitFraction(mya) * 360) % 360;
}

function angleToMyaInOrbit(deg) {
  return ((deg - 180 + 360) % 360) / 360 * MYA_PER_ORBIT;
}

function formatMya(mya) {
  if (mya < 0.001) return '0 years ago';
  if (mya < 0.01)  return `${Math.round(mya * 1000).toLocaleString()} thousand years ago`;
  if (mya < 1)     return `${(mya * 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} thousand years ago`;
  if (mya < 10)    return `${mya.toFixed(2)} million years ago`;
  if (mya < 1000)  return `${mya.toFixed(1)} million years ago`;
  return `${(mya / 1000).toFixed(2)} billion years ago`;
}

function getActiveMilestone(mya) {
  const windowMya = Math.max(5.6, mya * 0.015);
  let closest = null, minDist = Infinity;
  for (const m of MILESTONES) {
    const dist = Math.abs(m.mya - mya);
    if (dist < windowMya && dist < minDist) { minDist = dist; closest = m; }
  }
  return closest;
}

function getHandlePos(deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

// Rendering
function renderOrbit() {
  const deg      = myaToAngle(totalMya);
  const pos      = getHandlePos(deg);
  const fraction = getOrbitFraction(totalMya);

  document.getElementById('handle').setAttribute('transform', `translate(${pos.x},${pos.y})`);
  document.getElementById('progressArc').setAttribute('stroke-dashoffset', CIRCUMFERENCE * (1 - fraction));
}

function renderDisplay() {
  const orbit    = getOrbitNumber(totalMya);
  const fraction = getOrbitFraction(totalMya);

  // Main year text
  document.getElementById('yearDisplay').textContent = formatMya(totalMya);

  // Sub-label: orbit position
  document.getElementById('yearSub').textContent =
    `Galactic year ${20 -orbit}, Galactic day ${(fraction * 365.25).toFixed(0)}`;
  document.getElementById('orbitCounter').textContent = `Year ${20 - orbit}`;

  // Total progress bar
  document.getElementById('progressFill').style.width = `${(totalMya / SUN_AGE_MYA) * 100}%`;

  // Scrubber thumb
  const thumb = document.getElementById('scrubberThumb');
  if (thumb) thumb.style.left = `${(totalMya / SUN_AGE_MYA) * 100}%`;

  // Orbit nav button states
  document.getElementById('btnPrevOrbit').disabled = orbit === 0;
  document.getElementById('btnNextOrbit').disabled = orbit >= Math.floor(TOTAL_ORBITS);

  // Milestone card
  const milestone = getActiveMilestone(totalMya);
  const container = document.getElementById('milestoneContainer');
  const key       = milestone ? milestone.title : null;

  if (milestone) {
    if (key !== lastMilestoneKey) {
      container.innerHTML = `
        <div class="milestone-card">
          <span class="milestone-icon">${milestone.icon}</span>
          <div class="milestone-era">${milestone.era}</div>
          <div class="milestone-title">${milestone.title}</div>
          <div class="milestone-desc">${milestone.desc}</div>
        </div>`;
      lastMilestoneKey = key;
    }
  } else {
    if (lastMilestoneKey !== null) {
      container.innerHTML = `<p class="no-milestone">Drag the Sun around its orbit to explore what happened this Galactic year. Or scroll through the timeline below to travel through the entire life of the Sun. </p>`;
      lastMilestoneKey = null;
    }
  }
}

function render() {
	renderOrbit();
	renderDisplay();
	drawTicks();
	renderSeasonSlices();
}

// SVG tick marks (per-orbit milestones)
function drawTicks() {
  const tickGroup = document.getElementById('milestoneTicks');
  tickGroup.innerHTML = '';
  const currentOrbit = getOrbitNumber(totalMya);

  for (const m of MILESTONES) {
    const milestoneOrbit = getOrbitNumber(m.mya);
    if (milestoneOrbit !== currentOrbit) continue;

    const posInOrbit = m.mya % MYA_PER_ORBIT;
    const frac = posInOrbit / MYA_PER_ORBIT;
    const deg  = (180 + frac * 360) % 360;
    const rad  = (deg - 90) * Math.PI / 180;
    const inner = R - 10, outer = R + 10;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', CX + inner * Math.cos(rad));
    line.setAttribute('y1', CY + inner * Math.sin(rad));
    line.setAttribute('x2', CX + outer * Math.cos(rad));
    line.setAttribute('y2', CY + outer * Math.sin(rad));
    line.setAttribute('stroke', 'rgba(201,168,76,0.3)');
    line.setAttribute('stroke-width', '2');
    tickGroup.appendChild(line);
  }
}

// Scrubber milestone markers
function drawScrubberMarkers() {
  const container = document.getElementById('scrubberMarkers');
  container.innerHTML = '';
  for (const m of MILESTONES) {
    const frac  = m.mya / SUN_AGE_MYA;
    const mark  = document.createElement('div');
    mark.className  = 'scrubber-mark';
    mark.style.left = `${frac * 100}%`;
    mark.title      = `${m.title} (${m.mya === 0 ? 'now' : formatMya(m.mya)})`;
    mark.addEventListener('click', () => animateTo(m.mya));
    container.appendChild(mark);
  }
}

// Season/months
const SEASONS = [
  { name: 'Spring', color: 'rgba(120,210,120,0.13)', startFrac: 0,    endFrac: 0.25 },
  { name: 'Summer', color: 'rgba(255,200,60,0.13)',  startFrac: 0.25, endFrac: 0.50 },
  { name: 'Autumn', color: 'rgba(210,120,50,0.13)',  startFrac: 0.50, endFrac: 0.75 },
  { name: 'Winter', color: 'rgba(100,180,240,0.13)', startFrac: 0.75, endFrac: 1.00 },
];

function arcPath(startFrac, endFrac) {
  // Orbit starts at bottom (180deg offset), goes CW
  // startFrac 0 = bottom of circle
  function fracToRad(f) { return (Math.PI / 2) + f * 2 * Math.PI; } // bottom = π/2
  const r1 = 168, r2 = 202; // inner/outer radius for the wedge band

  const sa = fracToRad(startFrac);
  const ea = fracToRad(endFrac);

  const x1o = CX + r2 * Math.cos(sa), y1o = CY + r2 * Math.sin(sa);
  const x2o = CX + r2 * Math.cos(ea), y2o = CY + r2 * Math.sin(ea);
  const x1i = CX + r1 * Math.cos(ea), y1i = CY + r1 * Math.sin(ea);
  const x2i = CX + r1 * Math.cos(sa), y2i = CY + r1 * Math.sin(sa);

  const large = (endFrac - startFrac) > 0.5 ? 1 : 0;
  return `M ${x1o} ${y1o} A ${r2} ${r2} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${r1} ${r1} 0 ${large} 0 ${x2i} ${y2i} Z`;
}

function renderSeasonSlices() {
  const group = document.getElementById('seasonSlices');
  group.innerHTML = '';
  if (!showSeasons) return;

  // Month dividers (12 lines) and season fills
  for (const s of SEASONS) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', arcPath(s.startFrac, s.endFrac));
    path.setAttribute('fill', s.color);
    group.appendChild(path);

    const midFrac = (s.startFrac + s.endFrac) / 2;
    const midRad  = (Math.PI / 2) + midFrac * 2 * Math.PI;
    const labelR  = R;
    const tx = CX + labelR * Math.cos(midRad);
    const ty = CY + labelR * Math.sin(midRad);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', tx);
    text.setAttribute('y', ty);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '9');
    text.setAttribute('fill', 'rgba(255,255,255,0.35)');
    text.setAttribute('font-family', 'Montserrat, sans-serif');
    text.setAttribute('letter-spacing', '0.08em');
    text.textContent = s.name.toUpperCase();
    group.appendChild(text);
  }

  for (let i = 0; i < 12; i++) {
    const frac = i / 12;
    const rad  = (Math.PI / 2) + frac * 2 * Math.PI;
    const r1 = 168, r2 = 202;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', CX + r1 * Math.cos(rad));
    line.setAttribute('y1', CY + r1 * Math.sin(rad));
    line.setAttribute('x2', CX + r2 * Math.cos(rad));
    line.setAttribute('y2', CY + r2 * Math.sin(rad));
    line.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    line.setAttribute('stroke-width', '1');
    group.appendChild(line);
  }
}

function createRotationArrow() {
  const svg = document.getElementById('orbitSvg');
  const g   = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('id', 'rotationArrow');

const arrowAngleDeg = 90; // 3 o clock
  const arrowRad      = (arrowAngleDeg - 90) * Math.PI / 180;
  const ax = CX + R * Math.cos(arrowRad);
  const ay = CY + R * Math.sin(arrowRad);

const delta = 22 * Math.PI / 180; // span in radians
  const r1rad = arrowRad - delta;
  const r2rad = arrowRad + delta;
  const x1 = CX + (R + 18) * Math.cos(r1rad);
  const y1 = CY + (R + 18) * Math.sin(r1rad);
  const x2 = CX + (R + 18) * Math.cos(r2rad);
  const y2 = CY + (R + 18) * Math.sin(r2rad);


  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.setAttribute('d', `M ${x1} ${y1} A ${R + 18} ${R + 18} 0 0 1 ${x2} ${y2}`);
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'rgba(240,208,128,0.8)');
  arc.setAttribute('stroke-width', '2');
  arc.setAttribute('stroke-linecap', 'round');

  // Arrowhead at end
  const headAngle = Math.atan2(y2 - (CY + (R + 18) * Math.sin(r2rad - 0.01)), x2 - (CX + (R + 18) * Math.cos(r2rad - 0.01)));
  const hw = 7;
  const ah = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  // Simple triangle arrowhead
  const tip   = `${x2},${y2}`;
  const left  = `${x2 - hw * Math.cos(headAngle - 0.5)},${y2 - hw * Math.sin(headAngle - 0.5)}`;
  const right = `${x2 - hw * Math.cos(headAngle + 0.5)},${y2 - hw * Math.sin(headAngle + 0.5)}`;
  ah.setAttribute('points', `${tip} ${left} ${right}`);
  ah.setAttribute('fill', 'rgba(240,208,128,0.8)');


  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', ax + 28);
  label.setAttribute('y', ay - 10);
  label.setAttribute('font-size', '9');
  label.setAttribute('fill', 'rgba(240,208,128,0.8)');
  label.setAttribute('font-family', 'Montserrat, sans-serif');
  label.setAttribute('letter-spacing', '0.18em');
  label.textContent = 'DRAG';

  g.appendChild(arc);
  g.appendChild(ah);
  g.appendChild(label);

  g.style.transition = 'opacity 0.8s ease';
  g.style.opacity  = '1';

const handle = document.getElementById('handle');
  svg.insertBefore(g, handle);
}

function fadeArrow() {
  if (hasInteracted) return;
  hasInteracted = true;
  const arrow = document.getElementById('rotationArrow');
  if (arrow) {
    arrow.style.opacity = '0';
    setTimeout(() => arrow.remove(), 900);
  }
}

function createSeasonToggle() {
  const wrap = document.querySelector('.scrubber-wrap');
  const div  = document.createElement('div');
  div.className = 'season-toggle-row';
  div.innerHTML = `
    <label class="season-toggle-label">
      <input type="checkbox" id="seasonToggle" />
      <span class="season-toggle-box"></span>
      Show Galactic months &amp; seasons
    </label>`;
  wrap.appendChild(div);

  document.getElementById('seasonToggle').addEventListener('change', (e) => {
    showSeasons = e.target.checked;
    render();
  });
}

// Smooth animation
function animateTo(targetMya) {
  targetMya       = Math.max(0, Math.min(SUN_AGE_MYA, targetMya));
  const start     = totalMya;
  const diff      = targetMya - start;
  const duration  = 700;
  const startTime = performance.now();

  function step(t) {
    const progress = Math.min((t - startTime) / duration, 1);
    totalMya       = start + diff * (1 - Math.pow(1 - progress, 3));
    render();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Circular orbit drag
const svg = document.getElementById('orbitSvg');

function getSvgCenter()    { const r = svg.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function getScreenRadius() { return (185 / 460) * svg.getBoundingClientRect().width; }
function distFromCenter(cx, cy) { const c = getSvgCenter(); return Math.hypot(cx - c.x, cy - c.y); }
function screenPointToAngle(cx, cy) {
  const c = getSvgCenter();
  let deg = Math.atan2(cy - c.y, cx - c.x) * 180 / Math.PI + 90;
  if (deg < 0) deg += 360;
  if (deg >= 360) deg -= 360;
  return deg;
}

svg.addEventListener('pointerdown', (e) => {
  if (Math.abs(distFromCenter(e.clientX, e.clientY) - getScreenRadius()) < 40) {
    isDragging = true;
    prevDragAngle = screenPointToAngle(e.clientX, e.clientY);
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    fadeArrow();
    const myaInOrbit = angleToMyaInOrbit(prevDragAngle);
    totalMya = Math.max(0, Math.min(SUN_AGE_MYA, getOrbitNumber(totalMya) * MYA_PER_ORBIT + myaInOrbit));
    render();
  }
});

svg.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const newAngle = screenPointToAngle(e.clientX, e.clientY);
  // Fix that you cannot 'go to future'
  let delta = newAngle - prevDragAngle;
  if (delta > 180)  delta -= 360;
  if (delta < -180) delta += 360;

  const deltaMya = (delta / 360) * MYA_PER_ORBIT;
  const candidate = totalMya + deltaMya;
  totalMya = Math.max(0, Math.min(SUN_AGE_MYA, candidate));
  prevDragAngle = newAngle;
  render();
});

svg.addEventListener('pointerup',     () => { isDragging = false; prevDragAngle = null; });
svg.addEventListener('pointercancel', () => { isDragging = false; prevDragAngle = null; });

// Linear time line
const scrubberTrack = document.getElementById('scrubberTrack');

function scrubberToMya(e) {
  const rect     = scrubberTrack.getBoundingClientRect();
  const clientX  = e.touches ? e.touches[0].clientX : e.clientX;
  const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return fraction * SUN_AGE_MYA;
}

scrubberTrack.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  scrubberTrack.setPointerCapture(e.pointerId);
  e.preventDefault();
  totalMya = scrubberToMya(e);
  render();
});

scrubberTrack.addEventListener('pointermove', (e) => {
  if (!scrubbing) return;
  totalMya = scrubberToMya(e);
  render();
});

scrubberTrack.addEventListener('pointerup',     () => { scrubbing = false; });
scrubberTrack.addEventListener('pointercancel', () => { scrubbing = false; });

// Orbit jump buttons
document.getElementById('btnPrevOrbit').addEventListener('click', () => {
  const orbit = getOrbitNumber(totalMya);
  if (orbit > 0) animateTo((orbit - 1) * MYA_PER_ORBIT + getOrbitFraction(totalMya) * MYA_PER_ORBIT);
});

document.getElementById('btnNextOrbit').addEventListener('click', () => {
  const orbit = getOrbitNumber(totalMya);
  if (orbit < Math.floor(TOTAL_ORBITS)) animateTo((orbit + 1) * MYA_PER_ORBIT + getOrbitFraction(totalMya) * MYA_PER_ORBIT);
});

// Init
drawScrubberMarkers();
createSeasonToggle();
createRotationArrow();
render();

setTimeout(() => {
  document.getElementById('milestoneContainer').innerHTML =
    `<p class="no-milestone">Drag the Sun around its orbit to explore what happened this Galactic year.</p>`;
}, 50);
