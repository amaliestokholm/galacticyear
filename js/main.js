// =============================================================================
// One Galactic Year — script.js
// =============================================================================

const GALACTIC_YEAR    = 225_000_000;   // years per orbit
const SUN_AGE_MYA      = 4600;          // age of the Sun in million years
const TOTAL_ORBITS     = SUN_AGE_MYA / (GALACTIC_YEAR / 1_000_000); // ~20.44

// SVG coordinate constants (viewBox is 0 0 460 460)
const CX = 230, CY = 230, R = 185;
const CIRCUMFERENCE = 2 * Math.PI * R;
const MYA_PER_ORBIT = GALACTIC_YEAR / 1_000_000; // 225

function getOrbitNumber(mya)   { return Math.floor(mya / MYA_PER_ORBIT); }
function getOrbitFraction(mya) { return (mya % MYA_PER_ORBIT) / MYA_PER_ORBIT; }

const BIRTH_ORBIT_FRAC = (SUN_AGE_MYA % MYA_PER_ORBIT) / MYA_PER_ORBIT; // 100/225 ≈ 0.4444

function getDisplayOffset() {
  return ((BIRTH_ORBIT_FRAC + sunBirthdayFrac) % 1 + 1) % 1;
}

function orbitFracToCalFrac(f) {
  // Negating f: increasing orbitFrac (back in time) now maps anti-clockwise
  return ((-f + getDisplayOffset()) % 1 + 1) % 1;
}

function calFracToScreenRad(calFrac) {
  // Clockwise: calFrac=0 -> top (12 o'clock), increasing -> clockwise
  const cwDeg = ((calFrac % 1) + 1) % 1 * 360;
  return (cwDeg - 90) * Math.PI / 180;
}

function fracToScreenRad(f) {
  return calFracToScreenRad(orbitFracToCalFrac(f));
}

// SVG x,y for a given orbit fraction
function getHandlePos(orbitFrac) {
  const rad = fracToScreenRad(orbitFrac);
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function screenPointToAngle(cx, cy) {
  const c = getSvgCenter();
  let cwDeg = Math.atan2(cy - c.y, cx - c.x) * 180 / Math.PI + 90;
  if (cwDeg < 0)    cwDeg += 360;
  if (cwDeg >= 360) cwDeg -= 360;
  const calFrac = cwDeg / 360;
  // Inverse of orbitFracToCalFrac: calFrac = -f + offset => f = offset - calFrac
  return ((getDisplayOffset() - calFrac) % 1 + 1) % 1;
}

function orbitFracToMyaInOrbit(frac) { return frac * MYA_PER_ORBIT; }

const MILESTONES = [
  { mya: 0, era: 'Quaternary', title: 'Present Day', desc: 'You are here.', icon: '🌍' },
  { mya: 0.3, era: 'Quaternary', title: 'Ice Ages & Homo sapiens', desc: 'Modern humans emerges. Repeated glaciations reshape continents. Woolly mammoths wander around Eurasia.', icon: '🧊' },
  { mya: 4500, era: 'Hadean', title: 'Earth & Moon Form', desc: 'A Mars-sized planet named Theia collides with the early planet Earth. The debris forms the Moon. Earth is a hellscape of molten rock and toxic gases.', icon: '🌑'},
  { mya: 4600, era: 'Solar Nebula', title: 'Birth of the Sun', desc: "A cloud of gas and dust collapses under its own gravity. The Sun ignites. This is orbit zero and thus the very beginning of our solar system's Galactic journey.", icon: '☀️' },
];

// State
let totalMya = 0;     // This is look-back time. 0 = present, 4600 = birth of Sun
let isDragging = false;
let scrubbing = false;
let prevDragAngle = null;
let lastMilestoneKey = null;
let hasInteracted = false;
let showSeasons = false;
let sunBirthdayFrac = 0;


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

// Galactic year counter: present = 20.44, counts down as we go back
function getGalacticYear(mya) {
  return (TOTAL_ORBITS - mya / MYA_PER_ORBIT).toFixed(1);
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function galDayToDate(galDay, galYear) {
  const leapYear = galYear % 4 === 0;
  const febDays = leapYear ? 29 : 28;
  const monthLengths = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let remaining = galDay - 1;
  for (let m = 0; m < 12; m++) {
    if (remaining < monthLengths[m]) return `${MONTH_NAMES[m]} ${remaining + 1}`;
    remaining -= monthLengths[m];
  }
  return 'December 31';
}

// Rendering
function renderOrbit() {
  const fraction = getOrbitFraction(totalMya);
  const pos = getHandlePos(fraction);
  document.getElementById('handle').setAttribute('transform', `translate(${pos.x},${pos.y})`);

  const calFrac = orbitFracToCalFrac(fraction);
  const arcEl = document.getElementById('progressArc');
  // Clockwise arc from Jan 1 (top) to Sun position
  arcEl.setAttribute('transform', `rotate(-90 ${CX} ${CY})`);
  arcEl.setAttribute('stroke-dashoffset', CIRCUMFERENCE * (1 - calFrac));
}

function renderDisplay() {
  const orbit = getOrbitNumber(totalMya);
  const fraction = getOrbitFraction(totalMya);
  const gyStr = getGalacticYear(totalMya);

  document.getElementById('yearDisplay').textContent = formatMya(totalMya);

  const rawFrac = orbitFracToCalFrac(fraction);
  const galDay = Math.floor(rawFrac * 365.25) + 1;
  const galYear = parseFloat(gyStr);
  const galDate = galDayToDate(galDay, galYear);
  document.getElementById('yearSub').textContent =
    `Galactic year ${galYear.toFixed(0)}, ${galDate} (day ${galDay})`;
  document.getElementById('orbitCounter').textContent = `Year ${gyStr}`;

  // Total progress bar
  document.getElementById('progressFill').style.width = `${(totalMya / SUN_AGE_MYA) * 100}%`;
  const thumb = document.getElementById('scrubberThumb');
  if (thumb) thumb.style.left = `${(totalMya / SUN_AGE_MYA) * 100}%`;

  // Orbit nav button states
  document.getElementById('btnPrevOrbit').disabled = (orbit + 1) * MYA_PER_ORBIT + getOrbitFraction(totalMya) * MYA_PER_ORBIT > SUN_AGE_MYA;
  document.getElementById('btnNextOrbit').disabled = totalMya < MYA_PER_ORBIT;

  // Milestone card
  const milestone = getActiveMilestone(totalMya);
  const container = document.getElementById('milestoneContainer');
  const key = milestone ? milestone.title : null;

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
	updateStarParticles();
}

// SVG tick marks (per-orbit milestones)
function drawTicks() {
  const tickGroup = document.getElementById('milestoneTicks');
  tickGroup.innerHTML = '';
  const currentOrbit = getOrbitNumber(totalMya);

  for (const m of MILESTONES) {
    if (getOrbitNumber(m.mya) !== currentOrbit) continue;
    const rad   = fracToScreenRad(getOrbitFraction(m.mya));
    const inner = R - 10, outer = R + 10;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', CX + inner * Math.cos(rad));
    line.setAttribute('y1', CY + inner * Math.sin(rad));
    line.setAttribute('x2', CX + outer * Math.cos(rad));
    line.setAttribute('y2', CY + outer * Math.sin(rad));
    line.setAttribute('stroke', 'rgba(201,168,76,0.5)');
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
    mark.title = `${m.title} (${m.mya === 0 ? 'now' : formatMya(m.mya)})`;
    mark.addEventListener('click', () => animateTo(m.mya));
    container.appendChild(mark);
  }
}

// Season/months
function seasonFracToScreenRad(calFrac) {
  return calFracToScreenRad(calFrac);
}

function drawAnnularArc(group, startFrac, endFrac, fillColor) {
  const r1 = 168, r2 = 202;
  const sa = seasonFracToScreenRad(startFrac);
  const ea = seasonFracToScreenRad(endFrac);
  const x1o = CX + r2 * Math.cos(sa), y1o = CY + r2 * Math.sin(sa);
  const x2o = CX + r2 * Math.cos(ea), y2o = CY + r2 * Math.sin(ea);
  const x1i = CX + r1 * Math.cos(ea), y1i = CY + r1 * Math.sin(ea);
  const x2i = CX + r1 * Math.cos(sa), y2i = CY + r1 * Math.sin(sa);
  // Span in fracs (0–1); large-arc flag if > half the circle
  const span = ((endFrac - startFrac) % 1 + 1) % 1;
  const large = span > 0.5 ? 1 : 0;
  // Clockwise sweep (sweep-flag = 1) for outer arc, CCW (sweep-flag = 0) for inner
  const d = `M ${x1o} ${y1o} A ${r2} ${r2} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${r1} ${r1} 0 ${large} 0 ${x2i} ${y2i} Z`;
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fillColor);
  group.appendChild(path);
}

function renderSeasonSlices() {
  const group = document.getElementById('seasonSlices');
  group.innerHTML = '';
  if (!showSeasons) return;

  const W = 'rgba(100,180,240,0.13)';
  const Sp = 'rgba(120,210,120,0.13)';
  const Su = 'rgba(255,200,60,0.13)';
  const A  = 'rgba(210,120,50,0.13)';

  // Winter is split at the year boundary: Dec (11/12–1) + Jan–Feb (0–2/12)
  drawAnnularArc(group, 11/12, 1,     W);
  drawAnnularArc(group, 0,     2/12,  W);
  drawAnnularArc(group, 2/12,  5/12,  Sp);
  drawAnnularArc(group, 5/12,  8/12,  Su);
  drawAnnularArc(group, 8/12,  11/12, A);

  const labels = [
    { name: 'WINTER', midFrac: 0.5/12 },
    { name: 'SPRING', midFrac: (2/12 + 5/12) / 2 },
    { name: 'SUMMER', midFrac: (5/12 + 8/12) / 2 },
    { name: 'AUTUMN', midFrac: (8/12 + 11/12) / 2 },
  ];

  for (const ls of labels) {
    const midRad = seasonFracToScreenRad(ls.midFrac);
    const tx = CX + R * Math.cos(midRad);
    const ty = CY + R * Math.sin(midRad);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', tx);
    text.setAttribute('y', ty);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '9');
    text.setAttribute('fill', 'rgba(255,255,255,0.35)');
    text.setAttribute('font-family', 'Montserrat, sans-serif');
    text.setAttribute('letter-spacing', '0.08em');
    text.textContent = ls.name;
    group.appendChild(text);
  }

  for (let i = 0; i < 12; i++) {
    const rad = seasonFracToScreenRad(i / 12);
    const r1 = 168, r2 = 202;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', CX + r1 * Math.cos(rad));
    line.setAttribute('y1', CY + r1 * Math.sin(rad));
    line.setAttribute('x2', CX + r2 * Math.cos(rad));
    line.setAttribute('y2', CY + r2 * Math.sin(rad));
    line.setAttribute('stroke', 'rgba(255,255,255,0.18)');
    line.setAttribute('stroke-width', '1');
    group.appendChild(line);
  }
}

const NUM_PARTICLES = 480;
const particles = [];

function initStarParticles() {
  const svgEl = document.getElementById('orbitSvg');
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('id', 'starParticles');
  // Insert galaxy at very start so it's behind everything
  svgEl.insertBefore(group, svgEl.firstChild);

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const t = Math.random();
    const minR = 6;
    const maxR = 1.9 * R;
    const orbitR = minR + (maxR - minR) * (t * t);

    const baseAngle = Math.random() * 2 * Math.PI;
    // Inner particles move faster (Keplerian differential rotation)
    const speed = 0.055 * Math.pow(maxR / Math.max(orbitR, 4), 0.65);

    const centreness = 1 - orbitR / maxR;
    const size = 0.5 + centreness * 2.2 * Math.random();

    const alpha = (0.12 + 0.7 * centreness * centreness).toFixed(2);
    const isTeal = Math.random() < 0.18;
    const col = isTeal
      ? `rgba(160,235,235,${alpha})`
      : `rgba(255,248,220,${alpha})`;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', Math.max(0.4, size).toFixed(2));
    circle.setAttribute('fill', col);

    if (Math.random() < 0.25) {
      const dur   = (1.2 + Math.random() * 3.5).toFixed(1);
      const delay = (Math.random() * 4).toFixed(1);
      circle.style.animation = `twinkle ${dur}s ${delay}s ease-in-out infinite`;
    }

    group.appendChild(circle);
    particles.push({ el: circle, r: orbitR, baseAngle, speed });
  }
}

function updateStarParticles() {
  const sunRevs = totalMya / MYA_PER_ORBIT;
  const sunRad = sunRevs * 2 * Math.PI;

  for (const p of particles) {
    const angle = p.baseAngle + sunRad * p.speed;
    p.el.setAttribute('cx', (CX + p.r * Math.cos(angle)).toFixed(2));
    p.el.setAttribute('cy', (CY + p.r * Math.sin(angle)).toFixed(2));
  }
}

function createRotationArrow() {
  const svg = document.getElementById('orbitSvg');
  const g   = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('id', 'rotationArrow');

  // Arc centred at 3 o'clock, sweeping anti-clockwise
  // In screen coords, 3 o'clock = angle 0 rad. We span ±25° around it.
  // Anti-clockwise means from +25° back to -25° (sweep-flag = 0).
  const delta = 25 * Math.PI / 180;
  const arcR  = R + 22;
  const startRad = delta;          // 25° past 3 o'clock (clockwise side)
  const endRad   = -delta;         // 25° before 3 o'clock (anti-clockwise side)

  const x1 = CX + arcR * Math.cos(startRad);
  const y1 = CY + arcR * Math.sin(startRad);
  const x2 = CX + arcR * Math.cos(endRad);
  const y2 = CY + arcR * Math.sin(endRad);

  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.setAttribute('d', `M ${x1} ${y1} A ${arcR} ${arcR} 0 0 0 ${x2} ${y2}`);
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'rgba(240,208,128,0.8)');
  arc.setAttribute('stroke-width', '2');
  arc.setAttribute('stroke-linecap', 'round');

  // Arrowhead at x2,y2 (the anti-clockwise end), tangent to the arc going CCW.
  // At endRad, the CCW tangent direction = endRad - PI/2 (pointing upward at 3 o'clock)
  const tangentAngle = endRad - Math.PI / 2;
  const hw = 5;
  const ah = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const tip    = `${x2},${y2}`;
  const left   = `${x2 - hw * Math.cos(tangentAngle - 0.5)},${y2 - hw * Math.sin(tangentAngle - 0.5)}`;
  const right  = `${x2 - hw * Math.cos(tangentAngle + 0.5)},${y2 - hw * Math.sin(tangentAngle + 0.5)}`;
  ah.setAttribute('points', `${tip} ${left} ${right}`);
  ah.setAttribute('fill', 'rgba(240,208,128,0.8)');

  // "DRAG" label just outside the arc at 3 o'clock
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', CX + arcR + 10);
  label.setAttribute('y', CY + 4);
  label.setAttribute('font-size', '9');
  label.setAttribute('fill', 'rgba(240,208,128,0.8)');
  label.setAttribute('font-family', 'Montserrat, sans-serif');
  label.setAttribute('letter-spacing', '0.18em');
  label.textContent = 'DRAG';

  g.appendChild(arc);
  g.appendChild(ah);
  g.appendChild(label);

  g.style.transition = 'opacity 0.8s ease';
  g.style.opacity = '1';

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
  const div = document.createElement('div');
  div.className = 'season-toggle-row';

  const monthOptions = MONTH_NAMES.map((m, i) =>
    `<option value="${i}"${i === 0 ? ' selected' : ''}>${m}</option>`
  ).join('');

  div.innerHTML = `
    <label class="season-toggle-label">
      <input type="checkbox" id="seasonToggle" />
      <span class="season-toggle-box"></span>
      Show Galactic months &amp; seasons
    </label>
    <div id="birthdayRow" class="birthday-row" style="display:none;">
      <span class="birthday-label">Sun's birthday (start of Galactic year):</span>
      <select id="birthdayMonth" class="birthday-select">${monthOptions}</select>
      <input type="number" id="birthdayDay" class="birthday-day-input" min="1" max="31" value="1" />
    </div>`;
  wrap.appendChild(div);

  function updateBirthday() {
    const month = parseInt(document.getElementById('birthdayMonth').value);
    const day = Math.max(1, Math.min(31, parseInt(document.getElementById('birthdayDay').value) || 1));
    const galYear = Math.round(TOTAL_ORBITS - totalMya / MYA_PER_ORBIT);
    const leapYear = galYear % 4 === 0;
    const febDays = leapYear ? 29 : 28;
    const monthLengths = [31, febDays, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = monthLengths.slice(0, month).reduce((a,b) => a+b, 0) + (day - 1);
    sunBirthdayFrac = (dayOfYear / (leapYear ? 366 : 365.25));
    render();
  }

  document.getElementById('seasonToggle').addEventListener('change', (e) => {
    showSeasons = e.target.checked;
    document.getElementById('birthdayRow').style.display = showSeasons ? 'flex' : 'none';
    render();
  });

  document.getElementById('birthdayMonth').addEventListener('change', updateBirthday);
  document.getElementById('birthdayDay').addEventListener('change', updateBirthday);
  document.getElementById('birthdayDay').addEventListener('input', updateBirthday);
}

// Smooth animation
function animateTo(targetMya) {
  targetMya = Math.max(0, Math.min(SUN_AGE_MYA, targetMya));
  const start = totalMya;
  const diff = targetMya - start;
  const duration = 700;
  const startTime = performance.now();

  function step(t) {
    const progress = Math.min((t - startTime) / duration, 1);
    totalMya = start + diff * (1 - Math.pow(1 - progress, 3));
    render();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Circular orbit drag
const svg = document.getElementById('orbitSvg');

function getSvgCenter() {
  const r = svg.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function getScreenRadius() { return (185 / 460) * svg.getBoundingClientRect().width; }
function distFromCenter(cx, cy) { const c = getSvgCenter(); return Math.hypot(cx - c.x, cy - c.y); }

svg.addEventListener('pointerdown', (e) => {
  if (Math.abs(distFromCenter(e.clientX, e.clientY) - getScreenRadius()) < 40) {
    isDragging = true;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    fadeArrow();
    const clickedOrbitFrac = screenPointToAngle(e.clientX, e.clientY);
    totalMya = Math.max(0, Math.min(SUN_AGE_MYA, getOrbitNumber(totalMya) * MYA_PER_ORBIT + orbitFracToMyaInOrbit(clickedOrbitFrac)));
    prevDragAngle = screenPointToAngle(e.clientX, e.clientY);
    render();
  }
});

svg.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const newOrbitFrac = screenPointToAngle(e.clientX, e.clientY);
  // Delta in orbit fracs; wrap around [-0.5, 0.5]
  let delta = newOrbitFrac - prevDragAngle;
  if (delta >  0.5) delta -= 1;
  if (delta < -0.5) delta += 1;

  const deltaMya = delta * MYA_PER_ORBIT;
  const newMya = Math.max(0, Math.min(SUN_AGE_MYA, totalMya + deltaMya));
  totalMya = newMya;
  // Only advance the reference angle if we weren't clamped, so dragging
  // back immediately picks up without a dead zone.
  if (newMya > 0 && newMya < SUN_AGE_MYA) prevDragAngle = newOrbitFrac;
  render();
});

svg.addEventListener('pointerup', () => { isDragging = false; prevDragAngle = null; });
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

scrubberTrack.addEventListener('pointerup', () => { scrubbing = false; });
scrubberTrack.addEventListener('pointercancel', () => { scrubbing = false; });

// Orbit jump buttons
document.getElementById('btnPrevOrbit').addEventListener('click', () => {
  const orbit = getOrbitNumber(totalMya);
  if (orbit < Math.floor(TOTAL_ORBITS)) animateTo((orbit + 1) * MYA_PER_ORBIT + getOrbitFraction(totalMya) * MYA_PER_ORBIT);
});

document.getElementById('btnNextOrbit').addEventListener('click', () => {
  const orbit = getOrbitNumber(totalMya);
  if (orbit > 0) animateTo((orbit - 1) * MYA_PER_ORBIT + getOrbitFraction(totalMya) * MYA_PER_ORBIT);
});

// Init
initStarParticles();
drawScrubberMarkers();
createSeasonToggle();
createRotationArrow();
render();

setTimeout(() => {
  document.getElementById('milestoneContainer').innerHTML =
    `<p class="no-milestone">Drag the Sun around its orbit to explore what happened this Galactic year.</p>`;
}, 50);
