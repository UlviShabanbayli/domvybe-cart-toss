// Cart Toss v3 — a product card as the hero of a page: pop-out + the card flips.
// Choose a colour (the photo slides out and the new one slides in on a spring, and the whole stage re-tints) and a
// size. Tap "Add to cart": the shoe POPS OUT of the card in 3D — it rises out of the image well, over the card's top
// edge, grows, tilts and throws a bigger shadow — then makes a short flight and shrinks into the cart pill. It lands
// with an impact: the pill squashes and glows, a ring and a burst go off, "+1" rises, the badge rolls like an odometer
// and the scene bumps. Meanwhile the CARD FLIPS (rotateY 180° on a spring with a little overshoot) to its back: a
// mini-cart receipt with the item, a working quantity stepper, a rolling subtotal, Checkout and "Keep shopping".
// No size yet? The size chips shake on a spring and a hint appears.
//
// Nothing is sent anywhere: the cart is simulated in this page (an array in memory). In a real shop, add() is where
// you would call your cart API (and roll back if it failed); Checkout would go to your checkout page.
// Three looks share this code: ?look=glass | swiss | luxe (or a | b | c); tokens and styles in style.css.
// Product photos are AI-generated (a fictional sneaker; see ../BRIEF.md).
//
// The six stages of the tutorial:
//   1. the frame, the look, the product and the cart's state    4. Add: the pop-out and the flight
//   2. the drawn parts (radios, stars, particles, motes)        5. the impact, the flip and the receipt
//   3. the springs, the odometer, choosing colour and size      6. drawing everything, the ambient life, the loop

// ================================================================================================================
// STAGE 1 · the frame, the look, the product and the cart's state
// ================================================================================================================
const html = document.documentElement;
const $ = (s, root = document) => root.querySelector(s);
const frameEl = $('.frame'), cardEl = $('.card'), card3d = $('.card-3d'), cardShadow = $('.card-shadow');
const front = $('.front'), back = $('.back'), shades = [$('.shade', front), $('.shade', back)];
const rims = [$('.rim i', front), $('.rim i', back)], rimBoxes = [$('.rim', front), $('.rim', back)];
const shoeBox = $('.shoe-box'), floorEl = $('.floor'), wellFlashEl = $('.well-flash');
const swatchHost = $('.swatches'), chipHost = $('.chips'), sizeHint = $('.size-hint'), colorName = $('.color-name'), idxN = $('.idx-n');
const addBtn = $('.add'), addSweep = $('.add-sweep');
const bagBtn = $('.bag'), bagGlow = $('.bag-glow'), bagIcon = $('.bag-icon'), badgeEl = $('.badge');
const backTitle = $('.back-title'), thumbImg = $('.thumb img'), lineVar = $('.line-var'), linePrice = $('.line-price');
const decBtn = $('.dec'), incBtn = $('.inc'), qtySr = $('.qty-sr'), itemsEl = $('.rows .items'), subSr = $('.sub-sr'), refN = $('.ref-n');
const checkoutBtn = $('.checkout'), coText = $('.co-text'), keepBtn = $('.keep');
const flyer = $('.flyer'), flyerImg = $('.flyer img'), flyShadow = $('.fly-shadow');
const ringEls = [...document.querySelectorAll('.fx-rings i')], partHost = $('.fx-parts'), plusEl = $('.fx-plus');
const live = $('[role=status]'), touch = $('.touch'), amb = $('.amb');
const LOOK = html.dataset.look;                              // set before the first paint (index.html)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (calm) html.classList.add('calm');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2, RAD = Math.PI / 180;

// fit the 432 × 768 composition to the screen
function fit() { html.style.setProperty('--k', Math.min(innerWidth / 432, innerHeight / 768).toFixed(4)); }
fit();
addEventListener('resize', fit);

// the studio clock: the ambient life reads time from here, so a capture tool can pause or drive it
const studio = (window.__studio = window.__studio || {});
if (!studio.now) studio.now = () => performance.now();

// the product, and the cart (simulated: an array of lines in memory)
const PRODUCT = { name: 'Halo Runner', price: 148 };
const COLORS = [
  { key: 'ember', name: 'Ember', src: 'img/shoe-ember.webp' },             // swatch colours: --swatch-<key> in style.css
  { key: 'cobalt', name: 'Cobalt', src: 'img/shoe-cobalt.webp' },
  { key: 'magenta', name: 'Magenta', src: 'img/shoe-magenta.webp' },
];
const SIZES = [40, 41, 42, 43, 44];
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const cart = [];                                             // { color, size, qty }
const itemsIn = () => cart.reduce((n, l) => n + l.qty, 0);
const subtotal = () => cart.reduce((s, l) => s + l.qty * PRODUCT.price, 0);
const plural = (n) => `${n} ${n === 1 ? 'item' : 'items'}`;
let color = COLORS.find((c) => c.key === html.dataset.color) || COLORS[0];
let size = null;
let line = null;                                             // the line the receipt shows
let side = 'front';                                          // which face is turned to the visitor
let orders = 0;
// the browser's theme colour follows the look and the colourway: the --meta token (style.css, 1b)
const meta = () => { $('meta[name="theme-color"]').content = getComputedStyle(html).getPropertyValue('--meta').trim(); };
meta();

// every photo decoded up front, so a colour change never waits on the network
COLORS.forEach((c) => { const i = new Image(); i.src = c.src; i.decode().catch(() => {}); });

// ================================================================================================================
// STAGE 2 · the drawn parts
// ================================================================================================================
let seed = 3005;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// the colour chooser and the size chips: native radios (arrow keys, one Tab stop per group)
swatchHost.innerHTML = COLORS.map((c) =>
  `<label class="pick sw"><input type="radio" name="color" value="${c.key}" aria-label="${c.name}"${c === color ? ' checked' : ''}><span class="dot" style="--sw:var(--swatch-${c.key})"></span></label>`).join('');
chipHost.innerHTML = SIZES.map((s) =>
  `<label class="pick chip"><input type="radio" name="size" value="${s}" aria-label="EU ${s}"><span class="face-c">${s}</span></label>`).join('');
const sizeInputs = [...chipHost.querySelectorAll('input')];

// five stars, drawn twice: grey underneath, filled on top, clipped to 4.8 / 5
const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.4l2.95 6.06 6.65.92-4.83 4.65 1.18 6.6L12 17.5l-5.95 3.13 1.18-6.6L2.4 9.38l6.65-.92z"/></svg>';
document.querySelectorAll('.stars > span').forEach((s) => { s.innerHTML = STAR.repeat(5); });

// the impact's burst: dots and short streaks in the colourway's colours (the --burst-1…5 tokens of each look)
const PART_COLORS = [1, 2, 3, 4, 5].map((i) => `var(--burst-${i})`);
const PART_N = 20;
const parts = [];
for (let i = 0; i < PART_N; i++) {
  const el = document.createElement('i');
  if (i % 3 === 1) el.className = 'streak';
  if (LOOK === 'swiss') el.style.borderRadius = '0';
  el.style.setProperty('--c', PART_COLORS[i % PART_COLORS.length]);
  partHost.append(el);
  parts.push({ el, a: (i / PART_N) * TAU + (rand() - 0.5) * 0.35, d: 44 + rand() * 50, z: 0.7 + rand() * 0.8 });
}

// luxe: dust in the spotlight
const motes = [];
if (LOOK === 'luxe') {
  const host = $('.motes');
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('i'), s = 1.2 + rand() * 2.2;
    el.style.width = el.style.height = `${s.toFixed(1)}px`;
    host.append(el);
    motes.push({ el, x: 130 + rand() * 172, y: 40 + rand() * 300, dx: 8 + rand() * 18, dy: 10 + rand() * 22, per: 9 + rand() * 9, ph: rand() * TAU, o: 0.25 + rand() * 0.55 });
  }
}

// where an element sits in the frame (its layout box, before any transform)
function inFrame(el) {
  let x = 0, y = 0;
  for (let e = el; e && e !== frameEl; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

// the centre of the cart icon in the pill (an SVG has no offsetLeft: measured from the pill, 12 px padding + 10)
function bagCentre() { const b = inFrame(bagBtn); return { x: b.x + 22, y: b.y + b.h / 2 }; }

// ================================================================================================================
// STAGE 3 · the springs, the odometer, choosing a colour and a size
// ================================================================================================================
const sp = (stiffness, damping) => ({ stiffness, damping });
const crit = (k) => sp(k, 2 * Math.sqrt(k));                 // critically damped: no overshoot
const pop = new Spring(0, sp(190, 14));                      // the shoe rising out of the card, 0 → 1
const flip = new Spring(0, sp(95, 12.5));                    // the card's turn in degrees, 0 ↔ 180 (ζ .64: ~9° past)
const swap = new Spring(1, sp(170, 18));                     // a colour change, 0 old photo → 1 new
const shake = new Spring(0, sp(900, 10));                    // the size chips' shake, px
const hint = new Spring(0, sp(320, 22));                     // the size hint
const press = new Spring(0, sp(520, 22));                    // a button under the finger
const squash = new Spring(0, sp(520, 12));                   // the cart pill swallowing the shoe
const glow = new Spring(0, crit(70));                        // the pill's flash: kicked, a soft pulse
const badgePop = new Spring(0, sp(380, 16));                 // the badge's scale
const bump = new Spring(0, sp(300, 11));                     // the whole scene's jolt at impact
const flash = new Spring(0, crit(90));                       // the well's bloom as the shoe leaves
const rimHover = new Spring(0, crit(120));                   // luxe: the edge light on hover
const springs = [pop, flip, swap, shake, hint, press, squash, glow, badgePop, bump, flash, rimHover];

// the odometer: every character is a window; a character that changes rolls (up for more, down for less)
const odos = [];
class Odo {
  constructor(el) { this.el = el; this.text = ''; this.cols = []; this.dir = 1; this.roll = new Spring(1, sp(240, 20)); odos.push(this); }
  set(text, { dir = 1, animate = !calm } = {}) {
    if (text === this.text) return;
    const n = Math.max(this.text.length, text.length), A = this.text.padStart(n), B = text.padStart(n);
    this.el.innerHTML = [...B].map((ch, i) => `<span class="col"><span>${A[i] === ch ? '' : A[i].trim()}</span><span>${ch.trim()}</span></span>`).join('');
    this.cols = [...this.el.children].map((c, i) => ({ o: c.children[0], n: c.children[1], mv: A[i] !== B[i] }));
    this.text = text; this.dir = dir;
    this.roll.velocity = 0; this.roll.value = animate ? 0 : 1; this.roll.target = 1;
    this.done = false; this.render();
  }
  render() {
    if (this.done) return;
    const r = this.roll.value, d = this.dir;
    for (const c of this.cols) {
      if (!c.mv) continue;
      c.o.style.transform = `translateY(${(-d * r * 110).toFixed(2)}%)`;
      c.n.style.transform = `translateY(${(d * (1 - r) * 110).toFixed(2)}%)`;
    }
    if (this.roll.resting(0.002)) { this.cols.forEach((c) => { c.o.remove(); c.n.style.transform = ''; }); this.done = true; }
  }
}
const badgeOdo = new Odo($('.badge .odo')), qtyOdo = new Odo($('.qty-n')), subOdo = new Odo($('.sub-n'));
const odoSprings = odos.map((o) => o.roll);

// a colour: the photo slides out, the new one slides in on a spring; the stage re-tints through CSS (0.7 s)
let imgs = [...shoeBox.querySelectorAll('.shoe')];          // [the one on show, the spare]
let swapDir = 1, swapping = false;
function finishSwap() {
  if (!swapping) return;
  swapping = false;
  imgs = [imgs[1], imgs[0]];
  imgs[0].classList.add('is-cur'); imgs[1].classList.remove('is-cur');
  imgs[1].style.opacity = '0'; imgs[0].style.opacity = '1'; imgs[0].style.transform = imgs[1].style.transform = '';
  swap.value = swap.target = 1; swap.velocity = 0;
}
function setColor(c) {
  if (c === color) return;
  const dir = COLORS.indexOf(c) > COLORS.indexOf(color) ? 1 : -1;
  color = c;
  html.dataset.color = c.key;
  meta();
  colorName.textContent = c.name;
  idxN.textContent = String(COLORS.indexOf(c) + 1).padStart(2, '0');
  finishSwap();
  imgs[1].src = c.src;
  flyerImg.src = c.src;                                      // the flyer is ready before the next Add
  imgs[1].alt = `${PRODUCT.name} in ${c.name}`; imgs[1].removeAttribute('aria-hidden');
  imgs[0].alt = ''; imgs[0].setAttribute('aria-hidden', 'true');
  swapping = true; swapDir = dir;
  if (calm) { finishSwap(); return; }
  swap.value = 0; swap.velocity = 0; swap.target = 1;
  flash.velocity += 5;
  wake();
}
swatchHost.addEventListener('change', (e) => setColor(COLORS.find((c) => c.key === e.target.value)));
idxN.textContent = String(COLORS.indexOf(color) + 1).padStart(2, '0');
colorName.textContent = color.name;
if (color !== COLORS[0]) { imgs[0].src = flyerImg.src = color.src; imgs[0].alt = `${PRODUCT.name} in ${color.name}`; }

// a size; without one, Add makes the chips shake and the hint appear
chipHost.addEventListener('change', (e) => {
  size = +e.target.value;
  chipHost.classList.remove('is-bad'); chipHost.removeAttribute('aria-invalid');
  hint.target = 0; wake();
});
function needSize() {
  chipHost.classList.add('is-bad'); chipHost.setAttribute('aria-invalid', 'true');
  hint.target = 1;
  if (!calm) { shake.velocity -= 420; press.velocity -= 6; }
  say('Choose a size first.');
  sizeInputs[0].focus({ preventScroll: true });              // the keyboard lands where the choice is
  wake();
}

// ================================================================================================================
// STAGE 4 · Add: the pop-out, then a short flight into the cart pill
// ================================================================================================================
const POP = 0.34;              // s from the tap until the flight starts (the shoe hovers, popped out)
const FLY = 0.42;              // s of flight
const FLIP_AT = 0.28;          // s from the tap until the card starts to turn
const fly = { on: false, phase: '', t0: 0, t1: 0, ox: 0, oy: 0, fy: 0, fr: 0, P2: null };
const queue = [];
let clock = 0;
function later(s, fn) { queue.push({ at: clock + s, fn }); }

function add() {
  if (side !== 'front' || fly.on) return;
  if (size == null) { needSize(); return; }
  // the truth changes at once (here: a call to your cart API)
  let l = cart.find((x) => x.color === color && x.size === size);
  if (l) l.qty += 1; else cart.push((l = { color, size, qty: 1 }));
  line = l; orders += 1;
  sweepT = clock;
  if (calm) { showBack(); land(); return; }
  launch();
  later(FLIP_AT, showBack);
}
function launch() {
  const o = inFrame(shoeBox);
  fly.on = true; fly.phase = 'pop'; fly.t0 = clock;
  fly.ox = o.x + o.w / 2; fly.oy = o.y + o.h / 2 + floatY;  // the shoe's centre, where it floats right now
  fly.fr = floatR;
  flyer.style.left = `${fly.ox - o.w / 2}px`; flyer.style.top = `${fly.oy - o.h / 2}px`;
  flyShadow.style.left = `${fly.ox - 150}px`; flyShadow.style.top = `${o.y + o.h * 0.84 - 30 + floatY}px`;   // the sole: the photo has a clear margin
  pop.value = 0; pop.velocity = 0; pop.target = 1;
  flash.velocity += 14;
  later(POP, () => {
    fly.P2 = bagCentre();
    fly.phase = 'fly'; fly.t1 = clock;
  });
  wake();
}
// the shoe's pose at a pop value p: risen out of the well, bigger, tilted towards the viewer
function popPose(p) {
  return { x: -10 * p, y: -96 * p, s: 1 + 0.34 * p, rx: 20 * p, ry: -26 * p, rz: lerp(fly.fr, -11, clamp(p, 0, 1.2)) };
}
function drawFlight() {
  // at rest the flyer stays on screen at opacity .002 (not 0), so it is already rasterized when it pops out
  if (!fly.on) { flyer.style.opacity = flyShadow.style.opacity = calm ? '0' : '0.002'; return; }
  const p = pop.value;
  let x, y, s, rx, ry, rz, o = 1, sh = 1;
  const a = popPose(p);
  if (fly.phase === 'pop') {
    ({ x, y, s, rx, ry, rz } = a);
  } else {
    const u = clamp((clock - fly.t1) / FLY, 0, 1), e = Math.pow(u, 1.7);          // it accelerates into the cart: sucked in
    const P0 = { x: fly.ox + a.x, y: fly.oy + a.y }, P2 = fly.P2;
    const P1 = { x: lerp(P0.x, P2.x, 0.2), y: Math.min(P0.y, P2.y) - 56 };   // a short arc, up and over
    const k = 1 - e;
    x = k * k * P0.x + 2 * k * e * P1.x + e * e * P2.x - fly.ox;
    y = k * k * P0.y + 2 * k * e * P1.y + e * e * P2.y - fly.oy;
    s = lerp(a.s, 0.09, Math.pow(e, 0.8));
    rx = lerp(a.rx, 4, e); ry = lerp(a.ry, -58, e); rz = lerp(a.rz, 24, e);
    o = u < 0.84 ? 1 : 1 - (u - 0.84) / 0.16;
    sh = clamp(1 - u * 3, 0, 1);
    bagBtn.classList.toggle('is-front', u > 0.62);           // the last bit goes in behind the pill
    if (u >= 1) { fly.on = false; impact(); }
  }
  flyer.style.opacity = o.toFixed(3);
  flyer.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) perspective(820px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;
  // its cast shadow on the card: further below and wider the higher it rises — clearly in front of the card
  const q = clamp(p, 0, 1.2);
  flyShadow.style.opacity = Math.max(0.002, sh * (0.25 + 0.55 * clamp(p, 0, 1))).toFixed(3);
  flyShadow.style.transform = `translate(${(a.x * 0.4).toFixed(2)}px, ${(26 * q).toFixed(2)}px) scale(${(1 + 0.32 * q).toFixed(3)}, ${(1 + 0.7 * q).toFixed(3)})`;
}

// ================================================================================================================
// STAGE 5 · the impact, the flip, and the receipt on the back
// ================================================================================================================
let fxT = -9;                                                // when the last impact went off (clock)
let fxAt = { x: 0, y: 0 };
let sweepT = -9;                                             // the light sweep over Add
function impact() {
  later(0.32, () => bagBtn.classList.remove('is-front'));   // the burst comes out from behind the pill
  squash.velocity += 15; glow.velocity += 16; bump.velocity += 5; badgePop.velocity += 9;
  fxT = clock;
  fxAt = bagCentre();
  land();
}
// the cart has the item: the badge, the receipt's numbers, the announcement
function land() {
  const n = itemsIn();
  if (badgePop.target === 0) badgePop.target = 1;
  badgeOdo.set(String(n));
  bagBtn.setAttribute('aria-label', `Cart, ${plural(n)}`);
  setNumbers(1);
  say(`Added ${PRODUCT.name}, size ${line.size}, ${line.color.name}. ${plural(n)} in cart.`);
  wake();
}
function setNumbers(dir) {
  qtyOdo.set(String(line.qty), { dir });
  subOdo.set(money.format(subtotal()), { dir });
  subSr.textContent = money.format(subtotal());
  qtySr.textContent = `Quantity ${line.qty}`;
  itemsEl.textContent = plural(itemsIn());
  decBtn.setAttribute('aria-disabled', String(line.qty <= 1));
  incBtn.setAttribute('aria-disabled', String(line.qty >= 10));
}
function fillReceipt() {
  thumbImg.src = line.color.src;
  lineVar.textContent = `${line.color.name} · EU ${line.size}`;
  linePrice.textContent = money.format(PRODUCT.price);
  refN.textContent = String(orders).padStart(4, '0');
}

// the flip. The hidden face is inert and aria-hidden; focus goes to the back's heading, and back to Add on return.
function showBack() {
  if (!line) return;
  side = 'back';
  fillReceipt();
  if (fly.on) {                                               // the numbers as they were; they roll when it lands
    qtyOdo.set(String(Math.max(1, line.qty - 1)), { animate: false });
    subOdo.set(money.format(subtotal() - PRODUCT.price), { animate: false });
  }
  front.inert = true; front.setAttribute('aria-hidden', 'true');
  back.inert = false; back.removeAttribute('aria-hidden');
  flip.target = 180;
  if (calm) { flip.value = 180; flip.velocity = 0; }
  backTitle.focus({ preventScroll: true });
  wake();
}
function showFront() {
  side = 'front';
  back.inert = true; back.setAttribute('aria-hidden', 'true');
  front.inert = false; front.removeAttribute('aria-hidden');
  flip.target = 0;
  if (calm) { flip.value = 0; flip.velocity = 0; }
  addBtn.focus({ preventScroll: true });
  wake();
}
function step(d) {
  if (!line) return;
  const q = clamp(line.qty + d, 1, 10);
  if (q === line.qty) return;
  line.qty = q;
  setNumbers(d);
  badgeOdo.set(String(itemsIn()), { dir: d });
  if (!calm) { badgePop.velocity += 5; squash.velocity += 6 * d; }
  bagBtn.setAttribute('aria-label', `Cart, ${plural(itemsIn())}`);
  say(`Quantity ${q}. Subtotal ${money.format(subtotal())}.`);
  wake();
}
let coTimer = 0;
function checkout() {                                         // simulated: a real shop would go to its checkout page
  coText.textContent = 'Demo — nothing sent';
  say('Checkout is simulated in this demo. Nothing was sent.');
  clearTimeout(coTimer);
  coTimer = setTimeout(() => { coText.textContent = 'Checkout'; }, 1800);
}
let sayTimer = 0;
function say(text) {                                          // re-set, so the same message is announced again
  live.textContent = '';
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { live.textContent = text; }, 30);
}

// ================================================================================================================
// STAGE 6 · input, drawing everything from the springs, the ambient life, the loop
// ================================================================================================================
addBtn.addEventListener('click', add);
decBtn.addEventListener('click', () => step(-1));
incBtn.addEventListener('click', () => step(1));
keepBtn.addEventListener('click', showFront);
checkoutBtn.addEventListener('click', checkout);
back.addEventListener('keydown', (e) => { if (e.key === 'Escape') showFront(); });
bagBtn.addEventListener('click', () => {
  if (fly.on) return;
  if (side === 'back') { showFront(); return; }
  if (!cart.length) { say('Your cart is empty.'); if (!calm) squash.velocity -= 8; wake(); return; }
  line = line || cart[cart.length - 1];
  showBack(); setNumbers(1);
});
[addBtn, checkoutBtn].forEach((b) => {
  b.addEventListener('pointerdown', (e) => { if (e.button > 0 || calm) return; press.target = 1; pressed = b; wake(); });
  b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !calm) { press.target = 1; pressed = b; wake(); } });
});
let pressed = addBtn;
const unpress = () => { press.target = 0; wake(); };
['pointerup', 'pointerleave', 'pointercancel', 'keyup'].forEach((t) => { addBtn.addEventListener(t, unpress); checkoutBtn.addEventListener(t, unpress); });
cardEl.addEventListener('pointerenter', () => { rimHover.target = 1; wake(); });
cardEl.addEventListener('pointerleave', () => { rimHover.target = 0; wake(); });
// the touch circle, for the video
let down = false;
const showTouch = (e) => { touch.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; touch.classList.add('is-on'); };
addEventListener('pointerdown', (e) => { down = true; showTouch(e); });
addEventListener('pointermove', (e) => { if (down) showTouch(e); });
addEventListener('pointerup', () => { down = false; touch.classList.remove('is-on'); });

// the card: its turn, its lift, the shading on each face, which face is shown
let shownSide = 'front';
function drawCard(t) {
  const th = flip.value, s = Math.sin(th * RAD), c = Math.cos(th * RAD);
  if (calm) {
    front.style.opacity = side === 'front' ? '1' : '0';
    back.style.opacity = side === 'back' ? '1' : '0';
    front.style.visibility = back.style.visibility = '';
  } else {
    // a lift towards the viewer and a slight tilt while it turns
    card3d.style.transform = `translateZ(${(40 * Math.abs(s)).toFixed(2)}px) rotateX(${(-3 * s).toFixed(2)}deg) rotateY(${th.toFixed(2)}deg)`;
    const now = c >= 0 ? 'front' : 'back';
    if (now !== shownSide) { shownSide = now; front.style.opacity = now === 'front' ? '1' : '0.002'; back.style.opacity = now === 'back' ? '1' : '0.002'; }
    shades[0].style.opacity = (0.55 * clamp(s, 0, 1)).toFixed(3);
    shades[1].style.opacity = (0.55 * clamp(Math.abs(s), 0, 1)).toFixed(3);
    cardShadow.style.transform = `scaleX(${(0.3 + 0.7 * Math.abs(c)).toFixed(3)})`;
  }
  // luxe: the light runs round the metal edge on hover and while the card turns
  if (LOOK === 'luxe') {
    const on = clamp(Math.max(rimHover.value, Math.abs(s) * 1.4, flash.value * 0.6), 0, 1);
    rimBoxes[0].style.opacity = rimBoxes[1].style.opacity = on.toFixed(3);
    const turn = (t * 50 + th * 1.6) % 360;
    rims[0].style.transform = rims[1].style.transform = `rotate(${turn.toFixed(2)}deg)`;
  }
}
// the photo in the well: a slow float; during a colour change, the slide
let floatY = 0, floatR = 0;
function drawWell(t) {
  floatY = calm ? 0 : -3 + 4 * Math.sin(t * 1.5);
  floatR = calm ? -1 : -1.2 + 1.1 * Math.sin(t * 0.95 + 0.6);
  const out = fly.on ? 0 : 1;                                // the shoe is out of the card
  shoeBox.style.opacity = String(out);
  shoeBox.style.transform = `translateY(${floatY.toFixed(2)}px) rotate(${floatR.toFixed(2)}deg)`;
  const pOut = fly.on ? clamp(pop.value, 0, 1) : 0;
  floorEl.style.opacity = ((1 - pOut) * (0.85 + 0.15 * Math.sin(t * 1.5 + Math.PI))).toFixed(3);
  floorEl.style.transform = `scale(${(1 - 0.06 * Math.sin(t * 1.5)).toFixed(3)})`;
  wellFlashEl.style.opacity = clamp(flash.value, 0.002, 1).toFixed(3);   // never 0: kept rasterized
  wellFlashEl.style.transform = `scale(${(0.7 + 0.5 * clamp(flash.value, 0, 1.4)).toFixed(3)})`;
  if (swapping) {
    const s = swap.value, d = swapDir, [o, n] = imgs;
    o.style.opacity = clamp(1 - 1.7 * s, 0, 1).toFixed(3);
    o.style.transform = `translateX(${(-d * 190 * s).toFixed(2)}px) rotate(${(-d * 16 * s).toFixed(2)}deg) scale(${(1 - 0.22 * clamp(s, 0, 1)).toFixed(3)})`;
    n.style.opacity = clamp(1.8 * s - 0.2, 0, 1).toFixed(3);
    n.style.transform = `translateX(${(d * 190 * (1 - s)).toFixed(2)}px) rotate(${(d * 14 * (1 - s)).toFixed(2)}deg) scale(${(0.84 + 0.16 * s).toFixed(3)})`;
    if (swap.resting(0.002)) finishSwap();
  }
}
// the cart pill, the badge, the burst, the ring, the "+1"
function drawImpact() {
  const q = squash.value;
  bagBtn.style.transform = `scale(${(1 + 0.12 * q).toFixed(4)}, ${(1 - 0.1 * q).toFixed(4)})`;
  const g = clamp(glow.value, 0, 1.2);
  bagGlow.style.opacity = clamp(g, 0, 1).toFixed(3);
  bagGlow.style.transform = `scale(${(0.8 + 0.35 * g).toFixed(3)})`;
  badgeEl.style.transform = `scale(${Math.max(0, badgePop.value).toFixed(4)})`;
  const u0 = clock - fxT;
  ringEls.forEach((r, i) => {
    const u = (u0 - i * 0.08) / 0.55;
    if (u < 0 || u > 1) { r.style.opacity = '0'; return; }
    const e = 1 - Math.pow(1 - u, 3);
    r.style.opacity = ((1 - u) * (i ? 0.6 : 0.95)).toFixed(3);
    r.style.transform = `translate(${fxAt.x}px, ${fxAt.y}px) scale(${(0.25 + (i ? 1.7 : 2.3) * e).toFixed(3)})`;
  });
  const up = u0 / 0.62;
  parts.forEach((p) => {
    if (up < 0 || up > 1) { p.el.style.opacity = '0'; return; }
    const e = 1 - Math.pow(1 - up, 3), x = fxAt.x + Math.cos(p.a) * p.d * e, y = fxAt.y + Math.sin(p.a) * p.d * e + 22 * up * up;
    p.el.style.opacity = (1 - up * up).toFixed(3);
    const grow = up < 0.12 ? up / 0.12 : 1 - (up - 0.12) / 0.88;
    p.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(p.a / RAD).toFixed(1)}deg) scale(${(grow * p.z).toFixed(3)})`;
  });
  const uu = u0 / 0.85;
  if (uu < 0 || uu > 1) plusEl.style.opacity = '0';
  else {
    plusEl.style.opacity = (uu < 0.12 ? uu / 0.12 : 1 - (uu - 0.12) / 0.88).toFixed(3);
    plusEl.style.transform = `translate(${(fxAt.x - 34).toFixed(1)}px, ${(fxAt.y - 34 - 30 * (1 - Math.pow(1 - uu, 2))).toFixed(1)}px) scale(${(0.6 + 0.4 * Math.min(1, uu * 6)).toFixed(3)})`;
  }
  // the button's light sweep, on every add
  const us = (clock - sweepT) / 0.55;
  if (us < 0 || us > 1) addSweep.style.opacity = '0.002';
  else { addSweep.style.opacity = (Math.sin(us * Math.PI)).toFixed(3); addSweep.style.transform = `translateX(${(-90 + 440 * us).toFixed(1)}px) skewX(-18deg)`; }
}
function drawControls() {
  chipHost.style.transform = `translateX(${shake.value.toFixed(2)}px)`;
  const h = clamp(hint.value, 0, 1.2);
  sizeHint.style.opacity = clamp(h, 0, 1).toFixed(3);
  sizeHint.style.transform = `translateX(${(10 * (1 - h)).toFixed(2)}px)`;
  (pressed || addBtn).style.transform = `scale(${(1 - 0.045 * press.value).toFixed(4)})`;
  html.style.setProperty('--bump', (1 + 0.04 * bump.value).toFixed(4));
}
// ambient life, a pure function of the studio clock (the same still for the same time)
const BLOBS = [[60, 160, 40, 30, 17], [380, 300, 34, 40, 21], [90, 640, 44, 26, 19], [330, 520, 30, 36, 23]];
const blobEls = [...amb.querySelectorAll('.blob')];
const beam = $('.beam'), pool = $('.pool');
function drawAmbient(t) {
  if (LOOK === 'glass') {
    blobEls.forEach((b, i) => {
      const [x, y, dx, dy, per] = BLOBS[i], w = TAU / per, ph = i * 1.9;
      const px = x + dx * Math.sin(w * t + ph), py = y + dy * Math.sin(w * 0.8 * t + ph * 1.3), s = 1 + 0.12 * Math.sin(w * 1.3 * t + ph);
      b.style.transform = `translate(${(px - b.offsetWidth / 2).toFixed(1)}px, ${(py - b.offsetHeight / 2).toFixed(1)}px) scale(${s.toFixed(3)})`;
    });
  } else if (LOOK === 'luxe') {
    beam.style.opacity = (0.5 + 0.08 * Math.sin(t * 0.8)).toFixed(3);
    pool.style.opacity = (0.5 + 0.1 * Math.sin(t * 0.6 + 1)).toFixed(3);
    motes.forEach((m) => {
      const w = TAU / m.per;
      m.el.style.transform = `translate(${(m.x + m.dx * Math.sin(w * t + m.ph)).toFixed(1)}px, ${(m.y - m.dy * Math.sin(w * 0.7 * t + m.ph * 1.7)).toFixed(1)}px)`;
      m.el.style.opacity = (m.o * (0.55 + 0.45 * Math.sin(w * 2.1 * t + m.ph))).toFixed(3);
    });
  }
}

// the loop. With ambient life it runs every frame; with reduced motion only while something moves.
let running = false, last = 0;
function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
// frame times, for measuring: __perf.start() … __perf.stop() → { frames, p50, p95, max, over20, js }
const perf = (window.__perf = {
  on: false, gaps: [], js: [],
  start() { this.on = true; this.gaps = []; this.js = []; this.prev = 0; },
  stop() {
    this.on = false;
    const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return +(s[Math.min(s.length - 1, Math.floor(p * s.length))] || 0).toFixed(2); };
    return { frames: this.gaps.length, p50: q(this.gaps, 0.5), p95: q(this.gaps, 0.95), max: q(this.gaps, 1), over20: this.gaps.filter((g) => g > 20).length, jsP50: q(this.js, 0.5), jsMax: q(this.js, 1) };
  },
});
function frame(now) {
  const t0 = performance.now();
  if (perf.on) { if (perf.prev) perf.gaps.push(now - perf.prev); perf.prev = now; }
  const dt = Math.min(0.032, Math.max(0, (now - last) / 1000)); last = now;
  clock += dt;
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].at <= clock) queue.splice(i, 1)[0].fn();
  springs.forEach((s) => s.step(dt));
  odoSprings.forEach((s) => s.step(dt));
  draw();
  if (perf.on) perf.js.push(performance.now() - t0);
  const still = springs.every((s) => s.resting(0.002)) && odos.every((o) => o.done) && !fly.on && !queue.length && clock - fxT > 1;
  if (!calm || !still) requestAnimationFrame(frame); else running = false;
}
function draw() {
  const t = calm ? 0 : studio.now() / 1000;
  drawWell(t);
  drawFlight();
  drawCard(t);
  drawImpact();
  drawControls();
  odos.forEach((o) => o.render());
  drawAmbient(t);
}

// the receipt's punched notches sit level with its tear line
function notch() { const tr = $('.tear'); back.style.setProperty('--notch', `${tr.offsetTop + tr.offsetHeight / 2}px`); }
notch();
document.fonts.ready.then(() => { notch(); draw(); });
draw();
wake();

// for scripts and the tutorial's console
window.__cart = {
  add, setColor: (k) => { const c = COLORS.find((x) => x.key === k); if (c) { $(`input[name=color][value=${k}]`).checked = true; setColor(c); } },
  setSize: (n) => { const i = sizeInputs.find((x) => +x.value === n); if (i) { i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); } },
  front: showFront, back: showBack, step,
  state: () => ({ look: LOOK, color: color.key, size, side, flip: +flip.value.toFixed(2), flying: fly.on, items: itemsIn(), subtotal: subtotal(),
    lines: cart.map((l) => `${l.color.key}/${l.size}×${l.qty}`), badge: badgeOdo.text, sub: subOdo.text, live: live.textContent,
    focus: document.activeElement.className || document.activeElement.tagName, frontInert: front.inert, backInert: back.inert }),
};
