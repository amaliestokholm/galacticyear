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
let lastMilestoneKey = null;

// Maths helpers
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

  // Orbit badge
  document.getElementById('orbitCounter').textContent = `Orbit ${orbit + 1} / 20`;

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

function render() { renderOrbit(); renderDisplay(); }

// SVG tick marks (per-orbit milestones)
function drawTicks() {
  const tickGroup = document.getElementById('milestoneTicks');
  tickGroup.innerHTML = '';

  for (const m of MILESTONES) {
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
    line.setAttribute('stroke-width', '5');
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
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    const myaInOrbit = angleToMyaInOrbit(screenPointToAngle(e.clientX, e.clientY));
    totalMya = Math.max(0, Math.min(SUN_AGE_MYA, getOrbitNumber(totalMya) * MYA_PER_ORBIT + myaInOrbit));
    render();
  }
});

svg.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const myaInOrbit = angleToMyaInOrbit(screenPointToAngle(e.clientX, e.clientY));
  totalMya = Math.max(0, Math.min(SUN_AGE_MYA, getOrbitNumber(totalMya) * MYA_PER_ORBIT + myaInOrbit));
  render();
});

svg.addEventListener('pointerup',     () => { isDragging = false; });
svg.addEventListener('pointercancel', () => { isDragging = false; });

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
drawTicks();
drawScrubberMarkers();
render();

setTimeout(() => {
  document.getElementById('milestoneContainer').innerHTML =
    `<p class="no-milestone">Drag the Sun around its orbit to explore what happened this Galactic year. Or scroll through the timeline below to travel through the entire life of the Sun. </p>`;
}, 50);
