// Background field of slowly drifting dots. Dots near the pointer are pushed
// gently away and linked to it (and to each other) with faint lines, so the
// field reacts as you move across the page.

const canvas = document.getElementById("dots");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const SPACING = 34;          // average distance between dots, in CSS px
const REACH = 150;           // pointer influence radius
const LINK = 90;             // max distance for dot-to-dot lines near the pointer
const PUSH = 26;             // how far a dot can be displaced by the pointer

const css = getComputedStyle(document.documentElement);
const DOT = css.getPropertyValue("--dot").trim() || "#9aa3ae";
const ACCENT = css.getPropertyValue("--accent").trim() || "#2e5bff";

let dots = [];
let width = 0;
let height = 0;
const pointer = { x: -9999, y: -9999, active: false };

function build() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // A jittered grid spreads dots evenly without looking like graph paper.
  dots = [];
  for (let y = SPACING / 2; y < height + SPACING; y += SPACING) {
    for (let x = SPACING / 2; x < width + SPACING; x += SPACING) {
      const hx = x + (Math.random() - 0.5) * SPACING * 0.8;
      const hy = y + (Math.random() - 0.5) * SPACING * 0.8;
      dots.push({
        hx, hy,               // home position
        x: hx, y: hy,         // drawn position
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.35,
        r: 1 + Math.random() * 0.6
      });
    }
  }
}

function frame(time) {
  const t = time / 1000;
  ctx.clearRect(0, 0, width, height);

  const near = [];
  for (const d of dots) {
    // Idle drift: each dot circles its home position slowly.
    let tx = d.hx + Math.cos(t * d.speed + d.phase) * 4;
    let ty = d.hy + Math.sin(t * d.speed * 1.3 + d.phase) * 4;

    const dx = tx - pointer.x;
    const dy = ty - pointer.y;
    const dist = Math.hypot(dx, dy);
    let glow = 0;
    if (pointer.active && dist < REACH) {
      glow = 1 - dist / REACH;
      const f = glow * glow * PUSH;
      tx += (dx / (dist || 1)) * f;
      ty += (dy / (dist || 1)) * f;
      near.push(d);
    }

    // Ease toward the target so motion stays smooth.
    d.x += (tx - d.x) * 0.12;
    d.y += (ty - d.y) * 0.12;
    d.glow = glow;
  }

  // Lines between nearby dots and to the pointer, fading with distance.
  ctx.lineWidth = 1;
  for (let i = 0; i < near.length; i++) {
    const a = near[i];
    ctx.strokeStyle = ACCENT;
    ctx.globalAlpha = a.glow * 0.35;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    for (let j = i + 1; j < near.length; j++) {
      const b = near[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > LINK) continue;
      ctx.globalAlpha = (1 - d / LINK) * Math.min(a.glow, b.glow) * 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  for (const d of dots) {
    ctx.globalAlpha = 0.55 + d.glow * 0.45;
    ctx.fillStyle = d.glow > 0.05 ? ACCENT : DOT;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r + d.glow * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (!reduceMotion.matches) requestAnimationFrame(frame);
}

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = e.pointerType === "mouse" || e.pressure > 0;
  if (reduceMotion.matches) requestAnimationFrame(frame);
});
window.addEventListener("pointerleave", () => { pointer.active = false; });
document.addEventListener("mouseleave", () => { pointer.active = false; });

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { build(); if (reduceMotion.matches) requestAnimationFrame(frame); }, 150);
});

build();
requestAnimationFrame(frame);
