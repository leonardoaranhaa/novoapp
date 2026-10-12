import { OpticalBed, type ColumnVoice } from "@/lib/latente/audio";

export type Phase = "expor" | "banho" | "ouvir";

export type EngineHooks = {
  onInk: (has: boolean) => void;
  onTilt: () => void;
  timeEl: () => HTMLElement | null;
};

type Columns = {
  n: number;
  energy: Float32Array;
  centroid: Float32Array;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
};

type Bubble = { x: number; y: number; r: number; v: number; a: number };
type Speck = { x: number; y: number; r: number; a: number };
type Scratch = { x: number; y: number; len: number; w: number; a: number };

const AMBER = [255, 136, 52];
const VIRIDIAN = [36, 198, 148];
const CYAN = [130, 230, 255];

const SILENCE: ColumnVoice = { energy: 0, centroid: 0.5, r: 0, g: 0, b: 0, pan: 0 };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function mix(a: number[], b: number[], t: number): [number, number, number] {
  return [
    Math.round(a[0]! + (b[0]! - a[0]!) * t),
    Math.round(a[1]! + (b[1]! - a[1]!) * t),
    Math.round(a[2]! + (b[2]! - a[2]!) * t),
  ];
}

function emulsion(speed: number): [number, number, number] {
  if (speed < 0.5) return mix(AMBER, VIRIDIAN, smooth(speed / 0.5));
  return mix(VIRIDIAN, CYAN, smooth((speed - 0.5) / 0.5));
}

export class FilmEngine {
  private audio = new OpticalBed();
  private view: CanvasRenderingContext2D | null = null;
  private color!: HTMLCanvasElement;
  private colorCtx!: CanvasRenderingContext2D;
  private silver!: HTMLCanvasElement;
  private silverCtx!: CanvasRenderingContext2D;
  private grain!: HTMLCanvasElement;
  private aCanvas: HTMLCanvasElement | null = null;
  private aCtx: CanvasRenderingContext2D | null = null;
  private columns: Columns | null = null;
  private dpr = 1;
  private pw = 0;
  private ph = 0;
  private phase: Phase = "expor";
  private playing = true;
  private calm = false;
  private level = 0;
  private prevLevel = 0;
  private tiltTarget = 0;
  private hasTilt = false;
  private tiltListening = false;
  private draggingBath = false;
  private drawing = false;
  private scrubbing = false;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private holdSpeed = 0;
  private holdAcc = 0;
  private pressure = 0.55;
  private scan = 0;
  private time = 0;
  private lastFrame = 0;
  private raf = 0;
  private dirty = true;
  private ink = false;
  private dead = false;
  private frameLabel = "001";
  private ro: ResizeObserver | null = null;
  private bubbles: Bubble[] = [];
  private dust: Speck[] = [];
  private scratches: Scratch[] = [];
  private tiltX = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: EngineHooks,
  ) {
    this.grain = makeGrain(180);
    this.seedWear();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) this.ro.observe(this.canvas.parentElement);
    this.canvas.addEventListener("pointerdown", this.onDown);
    this.canvas.addEventListener("pointermove", this.onMove);
    this.canvas.addEventListener("pointerup", this.onUp);
    this.canvas.addEventListener("pointercancel", this.onUp);
    this.canvas.addEventListener("contextmenu", this.onMenu);
    document.addEventListener("visibilitychange", this.onHide);
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  setPhase(phase: Phase) {
    this.phase = phase;
    if (phase !== "expor") this.drawing = false;
    if (phase !== "banho") this.draggingBath = false;
    if (phase !== "ouvir") this.scrubbing = false;
  }

  setPlaying(playing: boolean) {
    this.playing = playing;
  }

  setCalm(calm: boolean) {
    this.calm = calm;
  }

  setFrame(n: number) {
    this.frameLabel = String(Math.max(0, Math.floor(n))).padStart(3, "0");
  }

  unlock() {
    this.audio.unlock();
  }

  hasInk() {
    if (this.dirty) this.rebuild();
    return this.ink;
  }

  shutter() {
    this.audio.shutter();
  }

  async enableTilt(): Promise<"ok" | "denied" | "unavailable"> {
    const D = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof D.requestPermission === "function") {
      try {
        const result = await D.requestPermission();
        if (result !== "granted") return "denied";
      } catch {
        return "denied";
      }
    } else if (typeof DeviceOrientationEvent === "undefined") {
      return "unavailable";
    }
    this.listenTilt();
    return "ok";
  }

  clear() {
    this.colorCtx.clearRect(0, 0, this.pw, this.ph);
    this.silverCtx.clearRect(0, 0, this.pw, this.ph);
    this.fog();
    this.colorCtx.globalCompositeOperation = "lighter";
    this.level = 0;
    this.prevLevel = 0;
    this.scan = 0;
    this.dirty = true;
    this.rebuild();
  }

  solarize() {
    if (!this.ink && this.dirty) this.rebuild();
    if (!this.ink) return;
    const img = this.colorCtx.getImageData(0, 0, this.pw, this.ph);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      d[i] = 255 - (d[i] ?? 0);
      d[i + 1] = 255 - (d[i + 1] ?? 0);
      d[i + 2] = 255 - (d[i + 2] ?? 0);
    }
    this.colorCtx.putImageData(img, 0, 0);
    this.colorCtx.globalCompositeOperation = "lighter";
    this.dirty = true;
    this.rebuild();
  }

  exportJpeg(): string | null {
    if (this.dirty) this.rebuild();
    if (!this.ink) return null;
    const w = 280;
    const h = Math.max(1, Math.round(w * (this.ph / Math.max(1, this.pw))));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    if (!x) return null;
    x.fillStyle = "#14110e";
    x.fillRect(0, 0, w, h);
    x.drawImage(this.color, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.72);
  }

  load(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.colorCtx.globalCompositeOperation = "source-over";
        this.colorCtx.clearRect(0, 0, this.pw, this.ph);
        this.colorCtx.drawImage(img, 0, 0, this.pw, this.ph);
        this.colorCtx.globalCompositeOperation = "lighter";
        this.silverCtx.clearRect(0, 0, this.pw, this.ph);
        this.level = 1;
        this.prevLevel = 1;
        this.dirty = true;
        this.rebuild();
        resolve();
      };
      img.onerror = () => reject(new Error("load"));
      img.src = url;
    });
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("contextmenu", this.onMenu);
    document.removeEventListener("visibilitychange", this.onHide);
    window.removeEventListener("deviceorientation", this.onTilt);
    this.audio.destroy();
  }

  private listenTilt() {
    if (this.tiltListening) return;
    this.tiltListening = true;
    window.addEventListener("deviceorientation", this.onTilt);
  }

  private onTilt = (event: DeviceOrientationEvent) => {
    if (event.beta == null) return;
    if (!this.hasTilt) {
      this.hasTilt = true;
      this.hooks.onTilt();
    }
    const gamma = event.gamma ?? 0;
    this.tiltX = clamp(gamma / 28, -1, 1) * 12 * this.dpr;
    if (this.phase !== "banho" || this.draggingBath) return;
    this.tiltTarget = clamp((78 - event.beta) / 62, 0, 1);
  };

  private onHide = () => {
    if (document.hidden) {
      this.audio.suspend();
      cancelAnimationFrame(this.raf);
      return;
    }
    this.audio.resumeIfUnlocked();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  };

  private onMenu = (event: Event) => {
    event.preventDefault();
  };

  private point(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = rect.width > 0 ? ((event.clientX - rect.left) / rect.width) * this.pw : 0;
    const y = rect.height > 0 ? ((event.clientY - rect.top) / rect.height) * this.ph : 0;
    return { x, y };
  }

  private onDown = (event: PointerEvent) => {
    if (this.pw < 2) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.unlock();
    const { x, y } = this.point(event);
    this.pressure = event.pressure > 0 ? event.pressure : 0.55;
    if (this.phase === "expor") {
      this.drawing = true;
      this.lastX = x;
      this.lastY = y;
      this.lastT = performance.now();
      this.holdSpeed = 0;
      this.audio.tick(0.045);
      this.stamp(x, y, 0, this.pressure);
    } else if (this.phase === "banho") {
      this.draggingBath = true;
      this.level = clamp(1 - y / this.ph, 0, 1);
    } else {
      this.scrubbing = true;
      this.scan = this.scanAt(x);
    }
  };

  private onMove = (event: PointerEvent) => {
    const list = event.getCoalescedEvents?.() ?? [event];
    for (const item of list) {
      const { x, y } = this.point(item);
      if (this.phase === "expor" && this.drawing) {
        const now = performance.now();
        const dt = Math.max(8, now - this.lastT);
        const dist = Math.hypot(x - this.lastX, y - this.lastY);
        const speed = clamp(dist / dt / Math.max(1, this.dpr) / 1.7, 0, 1);
        this.pressure = item.pressure > 0 ? item.pressure : this.pressure;
        this.stroke(this.lastX, this.lastY, x, y, speed, this.pressure);
        this.holdSpeed = speed;
        this.lastX = x;
        this.lastY = y;
        this.lastT = now;
      } else if (this.phase === "banho" && this.draggingBath) {
        this.level = clamp(1 - y / this.ph, 0, 1);
      } else if (this.phase === "ouvir" && this.scrubbing) {
        this.scan = this.scanAt(x);
      }
    }
  };

  private onUp = () => {
    this.drawing = false;
    this.draggingBath = false;
    this.scrubbing = false;
    if (this.dirty) this.rebuild();
  };

  private scanAt(x: number) {
    const gate = this.gate();
    const inner = Math.max(1, gate.right - gate.left);
    return clamp((x - gate.left) / inner, 0, 1);
  }

  private stroke(x0: number, y0: number, x1: number, y1: number, speed: number, pressure: number) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / (3.2 * this.dpr)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.stamp(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, speed, pressure);
    }
  }

  private stamp(x: number, y: number, speed: number, pressure: number) {
    const rad = (12 + (1 - speed) * 36) * clamp(pressure, 0.35, 1) * this.dpr;
    if (rad < 0.8) return;
    const [cr, cg, cb] = emulsion(speed);
    const a = 0.16 + (1 - speed) * 0.2;
    const col = this.colorCtx;
    col.globalCompositeOperation = "lighter";
    const g = col.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(255,246,236,${a})`);
    g.addColorStop(0.2, `rgba(${cr},${cg},${cb},${a})`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    col.fillStyle = g;
    col.beginPath();
    col.arc(x, y, rad, 0, Math.PI * 2);
    col.fill();

    const silver = this.silverCtx;
    silver.globalCompositeOperation = "source-over";
    const gs = silver.createRadialGradient(x, y, 0, x, y, rad * 1.05);
    gs.addColorStop(0, "rgba(255,248,236,0.55)");
    gs.addColorStop(1, "rgba(255,248,236,0)");
    silver.fillStyle = gs;
    silver.beginPath();
    silver.arc(x, y, rad * 1.05, 0, Math.PI * 2);
    silver.fill();
    this.dirty = true;
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (w === this.pw && h === this.ph) return;
    const prevColor = this.color;
    const prevSilver = this.silver;
    const prevW = this.pw;
    this.dpr = dpr;
    this.pw = w;
    this.ph = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.view = this.canvas.getContext("2d");
    this.color = document.createElement("canvas");
    this.color.width = w;
    this.color.height = h;
    this.silver = document.createElement("canvas");
    this.silver.width = w;
    this.silver.height = h;
    const colorCtx = this.color.getContext("2d");
    const silverCtx = this.silver.getContext("2d");
    if (!this.view || !colorCtx || !silverCtx) return;
    this.colorCtx = colorCtx;
    this.silverCtx = silverCtx;
    if (prevColor && prevW > 0) {
      this.colorCtx.drawImage(prevColor, 0, 0, w, h);
      this.silverCtx.drawImage(prevSilver, 0, 0, w, h);
    } else {
      this.fog();
    }
    this.colorCtx.globalCompositeOperation = "lighter";
    this.dirty = true;
  }

  private fog() {
    const s = this.silverCtx;
    s.globalCompositeOperation = "source-over";
    s.clearRect(0, 0, this.pw, this.ph);
    for (let i = 0; i < 4; i++) {
      const x = Math.random() * this.pw;
      const y = Math.random() * this.ph;
      const r = this.pw * (0.28 + Math.random() * 0.45);
      const g = s.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,248,240,0.045)");
      g.addColorStop(1, "rgba(255,248,240,0)");
      s.fillStyle = g;
      s.fillRect(0, 0, this.pw, this.ph);
    }
  }

  private seedWear() {
    this.dust = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.35 + Math.random() * 1.3,
      a: 0.08 + Math.random() * 0.28,
    }));
    this.scratches = Array.from({ length: 5 }, () => ({
      x: 0.12 + Math.random() * 0.76,
      y: Math.random() * 0.7,
      len: 0.08 + Math.random() * 0.22,
      w: 0.4 + Math.random() * 0.7,
      a: 0.08 + Math.random() * 0.12,
    }));
  }

  private rebuild() {
    const aw = 128;
    const ah = 96;
    if (!this.aCanvas) {
      this.aCanvas = document.createElement("canvas");
      this.aCanvas.width = aw;
      this.aCanvas.height = ah;
      this.aCtx = this.aCanvas.getContext("2d", { willReadFrequently: true });
    }
    if (!this.aCtx) return;
    this.aCtx.clearRect(0, 0, aw, ah);
    this.aCtx.drawImage(this.color, 0, 0, aw, ah);
    const img = this.aCtx.getImageData(0, 0, aw, ah);
    const d = img.data;
    const energy = new Float32Array(aw);
    const centroid = new Float32Array(aw);
    const r = new Float32Array(aw);
    const g = new Float32Array(aw);
    const b = new Float32Array(aw);
    let total = 0;
    for (let x = 0; x < aw; x++) {
      let er = 0;
      let eg = 0;
      let eb = 0;
      let e = 0;
      let cy = 0;
      for (let y = 0; y < ah; y++) {
        const i = (y * aw + x) * 4;
        const R = (d[i] ?? 0) / 255;
        const G = (d[i + 1] ?? 0) / 255;
        const B = (d[i + 2] ?? 0) / 255;
        const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        er += R;
        eg += G;
        eb += B;
        e += lum;
        cy += lum * (1 - y / ah);
      }
      const inv = 1 / ah;
      energy[x] = e * inv;
      r[x] = er * inv;
      g[x] = eg * inv;
      b[x] = eb * inv;
      centroid[x] = e > 0.001 ? cy / e : 0.5;
      total += energy[x] ?? 0;
    }
    this.columns = { n: aw, energy, centroid, r, g, b };
    const nextInk = total / aw > 0.006;
    if (nextInk !== this.ink) {
      this.ink = nextInk;
      this.hooks.onInk(nextInk);
    }
    this.dirty = false;
  }

  private sample(scan: number): ColumnVoice {
    const c = this.columns;
    if (!c) return SILENCE;
    const x = clamp(scan, 0, 1) * (c.n - 1);
    const i = Math.floor(x);
    const f = x - i;
    const j = Math.min(c.n - 1, i + 1);
    const mixAt = (arr: Float32Array) => (arr[i] ?? 0) * (1 - f) + (arr[j] ?? 0) * f;
    return {
      energy: mixAt(c.energy),
      centroid: mixAt(c.centroid),
      r: mixAt(c.r),
      g: mixAt(c.g),
      b: mixAt(c.b),
      pan: scan * 2 - 1,
    };
  }

  private gate() {
    const left = 24 * this.dpr;
    const trackH = 28 * this.dpr;
    const bottom = 8 * this.dpr;
    return {
      left,
      right: this.pw - left,
      trackTop: this.ph - bottom - trackH,
      trackH,
    };
  }

  private meniscusY(x: number) {
    const base = this.ph * (1 - clamp(this.level, 0, 1));
    if (this.calm) return base;
    const amp = 4.5 * this.dpr;
    return (
      base +
      Math.sin(x * 0.012 + this.time * 1.7) * amp +
      Math.sin(x * 0.005 - this.time * 0.85) * amp * 0.45
    );
  }

  private traceWave(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    const step = 8 * this.dpr;
    for (let x = 0; x <= this.pw; x += step) {
      const y = this.meniscusY(x);
      if (x === 0) ctx.moveTo(0, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(this.pw, this.meniscusY(this.pw));
  }

  private loop = (now: number) => {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000 || 0.016);
    this.lastFrame = now;
    this.time += dt;

    if (this.drawing && this.phase === "expor") {
      this.holdSpeed *= Math.exp(-2.8 * dt);
      this.holdAcc += dt;
      if (this.holdAcc > 0.055) {
        this.holdAcc = 0;
        this.stamp(this.lastX, this.lastY, this.holdSpeed, this.pressure);
      }
    }

    if (this.phase === "banho" && this.hasTilt && !this.draggingBath) {
      this.level += (this.tiltTarget - this.level) * Math.min(1, dt * 4.5);
    }

    if (this.phase === "ouvir" && this.playing && !this.scrubbing) {
      this.scan = (this.scan + dt / 12) % 1;
    }

    const moved = Math.abs(this.level - this.prevLevel);
    if (!this.calm) this.tickBubbles(dt, moved);
    if (this.phase === "banho") this.audio.setFizz(moved / Math.max(dt, 0.008) * 0.012);
    else this.audio.setFizz(0);
    this.prevLevel = this.level;

    if (this.dirty) this.rebuild();
    const listening = this.phase === "ouvir";
    this.audio.setListening(listening);
    if (listening) {
      const flutter = this.calm
        ? 1
        : 1 + Math.sin(this.time * 3.1) * 0.0032 + Math.sin(this.time * 8.4) * 0.0014;
      this.audio.update(this.sample(this.scan), flutter);
    }
    const timeEl = this.hooks.timeEl();
    if (timeEl) {
      const sec = this.scan * 12;
      const s = Math.floor(sec);
      const tenth = Math.floor((sec - s) * 10);
      timeEl.textContent = `0:${String(s).padStart(2, "0")}.${tenth}`;
    }

    this.paint();
    this.raf = requestAnimationFrame(this.loop);
  };

  private tickBubbles(dt: number, moved: number) {
    if (this.level > 0.03 && Math.random() < (moved > 0.001 ? 16 : 1.6) * dt) {
      this.bubbles.push({
        x: 0.14 + Math.random() * 0.72,
        y: Math.min(0.98, 1 - this.level + Math.random() * this.level),
        r: 0.8 + Math.random() * 2,
        v: 0.05 + Math.random() * 0.09,
        a: 0.2 + Math.random() * 0.45,
      });
    }
    const surface = 1 - this.level;
    this.bubbles = this.bubbles
      .map((b) => ({ ...b, y: b.y - b.v * dt }))
      .filter((b) => b.y > surface - 0.01)
      .slice(-36);
  }

  private paint() {
    const ctx = this.view;
    if (!ctx) return;
    const { pw: w, ph: h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#4e433a";
    ctx.fillRect(0, 0, w, h);

    const drift = this.calm ? 0 : (this.time * 14) % 180;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.globalCompositeOperation = "overlay";
    const pattern = ctx.createPattern(this.grain, "repeat");
    if (pattern) {
      ctx.translate(drift, drift * 0.4);
      ctx.fillStyle = pattern;
      ctx.fillRect(-drift - 20, -drift, w + 220, h + 220);
    }
    ctx.restore();

    const shift = this.calm ? 0 : this.tiltX;
    ctx.save();
    this.traceWave(ctx);
    ctx.lineTo(w, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.silver, -shift * 0.45, 0);
    ctx.restore();

    ctx.save();
    this.traceWave(ctx);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(this.color, shift, 0);
    ctx.restore();

    if (this.level > 0.012 && this.level < 0.995) {
      this.traceWave(ctx);
      ctx.save();
      ctx.strokeStyle = "rgba(255, 176, 110, 0.22)";
      ctx.lineWidth = 16 * this.dpr;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 214, 180, 0.9)";
      ctx.lineWidth = 1.4 * this.dpr;
      ctx.stroke();
      ctx.restore();
    }

    if (!this.calm) {
      for (const b of this.bubbles) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 206, 170, ${b.a})`;
        ctx.lineWidth = this.dpr;
        ctx.arc(b.x * w, b.y * h, b.r * this.dpr, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (this.drawing && this.phase === "expor") {
      const lamp = ctx.createRadialGradient(this.lastX, this.lastY, 0, this.lastX, this.lastY, 78 * this.dpr);
      lamp.addColorStop(0, "rgba(255, 170, 110, 0.2)");
      lamp.addColorStop(1, "rgba(255, 170, 110, 0)");
      ctx.fillStyle = lamp;
      ctx.beginPath();
      ctx.arc(this.lastX, this.lastY, 78 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    const wash = ctx.createRadialGradient(w * 0.5, 0, 10, w * 0.5, 0, h * 0.9);
    wash.addColorStop(0, "rgba(255, 106, 42, 0.28)");
    wash.addColorStop(0.45, "rgba(255, 106, 42, 0.08)");
    wash.addColorStop(1, "rgba(255, 106, 42, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);

    for (const speck of this.dust) {
      ctx.fillStyle = `rgba(243, 234, 223, ${speck.a})`;
      ctx.fillRect(speck.x * w, speck.y * h, speck.r * this.dpr, speck.r * this.dpr);
    }
    ctx.strokeStyle = "rgba(243, 234, 223, 0.16)";
    for (const scratch of this.scratches) {
      ctx.globalAlpha = scratch.a;
      ctx.lineWidth = scratch.w * this.dpr;
      ctx.beginPath();
      ctx.moveTo(scratch.x * w, scratch.y * h);
      ctx.lineTo(scratch.x * w + 2 * this.dpr, (scratch.y + scratch.len) * h);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.7, "rgba(0,0,0,0.08)");
    vignette.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    this.paintPerfs(ctx);
    this.paintTrack(ctx);
    if (this.phase === "ouvir") this.paintHead(ctx);
  }

  private paintPerfs(ctx: CanvasRenderingContext2D) {
    const holeW = 9 * this.dpr;
    const holeH = 13 * this.dpr;
    const gap = 20 * this.dpr;
    ctx.fillStyle = "#0c0a09";
    for (let y = 8 * this.dpr; y < this.ph - gap; y += holeH + gap) {
      round(ctx, 6 * this.dpr, y, holeW, holeH, 2 * this.dpr);
      round(ctx, this.pw - 6 * this.dpr - holeW, y, holeW, holeH, 2 * this.dpr);
      ctx.fill();
    }
  }

  private paintTrack(ctx: CanvasRenderingContext2D) {
    const gate = this.gate();
    const { left, right, trackTop, trackH } = gate;
    ctx.fillStyle = "#070605";
    ctx.fillRect(left, trackTop, right - left, trackH);
    const cols = this.columns;
    const mid = trackTop + trackH / 2;
    ctx.beginPath();
    if (!cols || cols.n < 2) {
      ctx.moveTo(left, mid);
      ctx.lineTo(right, mid);
      ctx.strokeStyle = "rgba(243,234,223,0.45)";
      ctx.lineWidth = this.dpr;
      ctx.stroke();
      return;
    }
    const span = right - left;
    ctx.moveTo(left, mid);
    for (let i = 0; i < cols.n; i++) {
      const e = cols.energy[i] ?? 0;
      const x = left + (i / (cols.n - 1)) * span;
      ctx.lineTo(x, mid - Math.min(trackH * 0.46, e * trackH * 1.6));
    }
    for (let i = cols.n - 1; i >= 0; i--) {
      const e = cols.energy[i] ?? 0;
      const x = left + (i / (cols.n - 1)) * span;
      ctx.lineTo(x, mid + Math.min(trackH * 0.46, e * trackH * 1.6));
    }
    ctx.closePath();
    ctx.fillStyle = "#f3eadf";
    ctx.fill();

    ctx.font = `${Math.round(10 * this.dpr)}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillStyle = "rgba(243,234,223,0.82)";
    ctx.textBaseline = "bottom";
    ctx.fillText(`LATENTE  ·  500T  ·  ${this.frameLabel}`, left, trackTop - 6 * this.dpr);
  }

  private paintHead(ctx: CanvasRenderingContext2D) {
    const gate = this.gate();
    const x = gate.left + this.scan * (gate.right - gate.left);
    const glow = ctx.createLinearGradient(x - 14 * this.dpr, 0, x + 14 * this.dpr, 0);
    glow.addColorStop(0, "rgba(255,106,42,0)");
    glow.addColorStop(0.5, "rgba(255,106,42,0.16)");
    glow.addColorStop(1, "rgba(255,106,42,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 14 * this.dpr, 0, 28 * this.dpr, gate.trackTop);
    ctx.beginPath();
    ctx.moveTo(x, 8 * this.dpr);
    ctx.lineTo(x, this.ph - 6 * this.dpr);
    ctx.strokeStyle = "rgba(255,106,42,0.95)";
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.stroke();
  }
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function makeGrain(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 90 + Math.random() * 165;
    d[i] = n;
    d[i + 1] = n;
    d[i + 2] = n;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
