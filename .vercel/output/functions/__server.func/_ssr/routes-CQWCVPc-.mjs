import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Pause, c as Bookmark, i as Play, o as Images, r as RotateCcw, s as Contrast, t as X } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CQWCVPc-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEY = "latente.archive.v1";
var FRAME_KEY = "latente.frame.v1";
var MAX = 12;
function loadPrints() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item) => {
			if (!item || typeof item !== "object") return false;
			const p = item;
			return typeof p.id === "string" && typeof p.jpeg === "string" && typeof p.frame === "number";
		}).slice(0, MAX);
	} catch {
		return [];
	}
}
function savePrints(prints) {
	const slim = prints.slice(0, MAX);
	try {
		localStorage.setItem(KEY, JSON.stringify(slim));
	} catch {
		const smaller = slim.slice(0, Math.max(1, Math.floor(slim.length / 2)));
		try {
			localStorage.setItem(KEY, JSON.stringify(smaller));
		} catch {
			localStorage.removeItem(KEY);
		}
	}
}
function currentFrame() {
	try {
		const n = Number(localStorage.getItem(FRAME_KEY));
		return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
	} catch {
		return 1;
	}
}
function advanceFrame() {
	const n = currentFrame() + 1;
	localStorage.setItem(FRAME_KEY, String(n));
	return n;
}
function padFrame(n) {
	return String(Math.max(0, Math.floor(n))).padStart(3, "0");
}
var SCALE = [
	146.83,
	174.61,
	196,
	220,
	261.63,
	293.66,
	349.23,
	392,
	440,
	523.25,
	587.33,
	698.46
];
function clamp01(n) {
	return Math.min(1, Math.max(0, n));
}
function quantize(centroid) {
	return SCALE[Math.round(clamp01(centroid) * (SCALE.length - 1))] ?? 220;
}
var OpticalBed = class {
	ctx = null;
	ready = false;
	comp = null;
	voice = null;
	filter = null;
	panner = null;
	oscA = null;
	oscSub = null;
	oscFifth = null;
	oscHigh = null;
	gA = null;
	gSub = null;
	gFifth = null;
	gHigh = null;
	gGrain = null;
	fizz = null;
	noiseBuf = null;
	unlock() {
		if (this.ready && this.ctx) {
			this.ctx.resume();
			return;
		}
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) return;
		const ctx = new Ctx();
		this.ctx = ctx;
		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -18;
		comp.knee.value = 16;
		comp.ratio.value = 3.5;
		comp.attack.value = .005;
		comp.release.value = .24;
		comp.connect(ctx.destination);
		this.comp = comp;
		const voice = ctx.createGain();
		voice.gain.value = 0;
		const filter = ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 1400;
		filter.Q.value = .65;
		const panner = ctx.createStereoPanner();
		voice.connect(filter);
		filter.connect(panner);
		panner.connect(comp);
		this.voice = voice;
		this.filter = filter;
		this.panner = panner;
		const make = (type) => {
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.type = type;
			o.frequency.value = 220;
			g.gain.value = 0;
			o.connect(g);
			g.connect(voice);
			o.start();
			return {
				o,
				g
			};
		};
		const a = make("sine");
		const sub = make("sine");
		const fifth = make("triangle");
		const high = make("sine");
		this.oscA = a.o;
		this.gA = a.g;
		this.oscSub = sub.o;
		this.gSub = sub.g;
		this.oscFifth = fifth.o;
		this.gFifth = fifth.g;
		this.oscHigh = high.o;
		this.gHigh = high.g;
		const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		this.noiseBuf = buffer;
		const grain = ctx.createBufferSource();
		grain.buffer = buffer;
		grain.loop = true;
		const bp = ctx.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = 1600;
		bp.Q.value = .7;
		const gGrain = ctx.createGain();
		gGrain.gain.value = 0;
		grain.connect(bp);
		bp.connect(gGrain);
		gGrain.connect(voice);
		grain.start();
		this.gGrain = gGrain;
		const fizzSrc = ctx.createBufferSource();
		fizzSrc.buffer = buffer;
		fizzSrc.loop = true;
		const hp = ctx.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 2200;
		const fizz = ctx.createGain();
		fizz.gain.value = 0;
		fizzSrc.connect(hp);
		hp.connect(fizz);
		fizz.connect(comp);
		fizzSrc.start();
		this.fizz = fizz;
		this.ready = true;
		ctx.resume();
	}
	at(param, value, seconds) {
		if (!this.ctx) return;
		param.setTargetAtTime(value, this.ctx.currentTime, seconds);
	}
	setListening(on) {
		if (!this.voice) return;
		this.at(this.voice.gain, on ? 1 : 0, .06);
	}
	setFizz(amount) {
		if (!this.fizz) return;
		this.at(this.fizz.gain, Math.max(0, Math.min(.16, amount)), .05);
	}
	update(v, flutter) {
		if (!this.ready || !this.oscA || !this.oscSub || !this.oscFifth || !this.oscHigh) return;
		if (!this.gA || !this.gSub || !this.gFifth || !this.gHigh || !this.gGrain || !this.filter || !this.panner) return;
		const e = Math.min(1, Math.max(0, v.energy) * 2.6);
		const fund = quantize(v.centroid) * flutter;
		this.at(this.oscA.frequency, fund, .09);
		this.at(this.oscSub.frequency, Math.max(40, fund / 2), .12);
		this.at(this.oscFifth.frequency, fund * 1.4983, .1);
		this.at(this.oscHigh.frequency, fund * 2, .1);
		this.at(this.gA.gain, e * .2, .05);
		this.at(this.gSub.gain, e * v.r * .15, .06);
		this.at(this.gFifth.gain, e * (.035 + v.g * .11), .06);
		this.at(this.gHigh.gain, e * v.b * .09, .06);
		const max = Math.max(v.r, v.g, v.b, 1e-4);
		const sat = (max - Math.min(v.r, v.g, v.b)) / max;
		this.at(this.gGrain.gain, e * (1 - sat) * .09, .08);
		this.at(this.filter.frequency, 360 + v.centroid * 2100 + v.b * 800, .1);
		this.at(this.panner.pan, Math.max(-1, Math.min(1, v.pan)), .12);
	}
	tick(strength = .05) {
		this.burst(strength, .045, 0);
	}
	shutter() {
		this.burst(.2, .07, 0);
		if (!this.ctx || !this.comp) return;
		const now = this.ctx.currentTime;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = "sine";
		o.frequency.setValueAtTime(210, now);
		o.frequency.exponentialRampToValueAtTime(55, now + .18);
		g.gain.setValueAtTime(.1, now);
		g.gain.exponentialRampToValueAtTime(.001, now + .2);
		o.connect(g);
		g.connect(this.comp);
		o.start(now);
		o.stop(now + .22);
	}
	burst(strength, dur, delay) {
		if (!this.ctx || !this.comp || !this.noiseBuf || strength <= 0) return;
		const now = this.ctx.currentTime + delay;
		const src = this.ctx.createBufferSource();
		const g = this.ctx.createGain();
		src.buffer = this.noiseBuf;
		g.gain.setValueAtTime(Math.max(.001, strength), now);
		g.gain.exponentialRampToValueAtTime(.001, now + dur);
		src.connect(g);
		g.connect(this.comp);
		src.start(now);
		src.stop(now + dur + .02);
	}
	suspend() {
		if (this.ctx && this.ctx.state === "running") this.ctx.suspend();
	}
	resumeIfUnlocked() {
		if (this.ready && this.ctx && this.ctx.state === "suspended") this.ctx.resume();
	}
	destroy() {
		this.ready = false;
		if (this.ctx && this.ctx.state !== "closed") this.ctx.close();
		this.ctx = null;
	}
};
var AMBER = [
	255,
	136,
	52
];
var VIRIDIAN = [
	36,
	198,
	148
];
var CYAN = [
	130,
	230,
	255
];
var SILENCE = {
	energy: 0,
	centroid: .5,
	r: 0,
	g: 0,
	b: 0,
	pan: 0
};
function clamp(n, min, max) {
	return Math.min(max, Math.max(min, n));
}
function smooth(t) {
	return t * t * (3 - 2 * t);
}
function mix(a, b, t) {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t)
	];
}
function emulsion(speed) {
	if (speed < .5) return mix(AMBER, VIRIDIAN, smooth(speed / .5));
	return mix(VIRIDIAN, CYAN, smooth((speed - .5) / .5));
}
var FilmEngine = class {
	canvas;
	hooks;
	audio = new OpticalBed();
	view = null;
	color;
	colorCtx;
	silver;
	silverCtx;
	grain;
	aCanvas = null;
	aCtx = null;
	columns = null;
	dpr = 1;
	pw = 0;
	ph = 0;
	phase = "expor";
	playing = true;
	calm = false;
	level = 0;
	prevLevel = 0;
	tiltTarget = 0;
	hasTilt = false;
	tiltListening = false;
	draggingBath = false;
	drawing = false;
	scrubbing = false;
	lastX = 0;
	lastY = 0;
	lastT = 0;
	holdSpeed = 0;
	holdAcc = 0;
	pressure = .55;
	scan = 0;
	time = 0;
	lastFrame = 0;
	raf = 0;
	dirty = true;
	ink = false;
	dead = false;
	frameLabel = "001";
	ro = null;
	bubbles = [];
	dust = [];
	scratches = [];
	tiltX = 0;
	constructor(canvas, hooks) {
		this.canvas = canvas;
		this.hooks = hooks;
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
	setPhase(phase) {
		this.phase = phase;
		if (phase !== "expor") this.drawing = false;
		if (phase !== "banho") this.draggingBath = false;
		if (phase !== "ouvir") this.scrubbing = false;
	}
	setPlaying(playing) {
		this.playing = playing;
	}
	setCalm(calm) {
		this.calm = calm;
	}
	setFrame(n) {
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
	async enableTilt() {
		const D = DeviceOrientationEvent;
		if (typeof D.requestPermission === "function") try {
			if (await D.requestPermission() !== "granted") return "denied";
		} catch {
			return "denied";
		}
		else if (typeof DeviceOrientationEvent === "undefined") return "unavailable";
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
	exportJpeg() {
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
		return c.toDataURL("image/jpeg", .72);
	}
	load(url) {
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
			img.onerror = () => reject(/* @__PURE__ */ new Error("load"));
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
	listenTilt() {
		if (this.tiltListening) return;
		this.tiltListening = true;
		window.addEventListener("deviceorientation", this.onTilt);
	}
	onTilt = (event) => {
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
	onHide = () => {
		if (document.hidden) {
			this.audio.suspend();
			cancelAnimationFrame(this.raf);
			return;
		}
		this.audio.resumeIfUnlocked();
		this.lastFrame = performance.now();
		this.raf = requestAnimationFrame(this.loop);
	};
	onMenu = (event) => {
		event.preventDefault();
	};
	point(event) {
		const rect = this.canvas.getBoundingClientRect();
		return {
			x: rect.width > 0 ? (event.clientX - rect.left) / rect.width * this.pw : 0,
			y: rect.height > 0 ? (event.clientY - rect.top) / rect.height * this.ph : 0
		};
	}
	onDown = (event) => {
		if (this.pw < 2) return;
		this.canvas.setPointerCapture(event.pointerId);
		this.unlock();
		const { x, y } = this.point(event);
		this.pressure = event.pressure > 0 ? event.pressure : .55;
		if (this.phase === "expor") {
			this.drawing = true;
			this.lastX = x;
			this.lastY = y;
			this.lastT = performance.now();
			this.holdSpeed = 0;
			this.audio.tick(.045);
			this.stamp(x, y, 0, this.pressure);
		} else if (this.phase === "banho") {
			this.draggingBath = true;
			this.level = clamp(1 - y / this.ph, 0, 1);
		} else {
			this.scrubbing = true;
			this.scan = this.scanAt(x);
		}
	};
	onMove = (event) => {
		const list = event.getCoalescedEvents?.() ?? [event];
		for (const item of list) {
			const { x, y } = this.point(item);
			if (this.phase === "expor" && this.drawing) {
				const now = performance.now();
				const dt = Math.max(8, now - this.lastT);
				const speed = clamp(Math.hypot(x - this.lastX, y - this.lastY) / dt / Math.max(1, this.dpr) / 1.7, 0, 1);
				this.pressure = item.pressure > 0 ? item.pressure : this.pressure;
				this.stroke(this.lastX, this.lastY, x, y, speed, this.pressure);
				this.holdSpeed = speed;
				this.lastX = x;
				this.lastY = y;
				this.lastT = now;
			} else if (this.phase === "banho" && this.draggingBath) this.level = clamp(1 - y / this.ph, 0, 1);
			else if (this.phase === "ouvir" && this.scrubbing) this.scan = this.scanAt(x);
		}
	};
	onUp = () => {
		this.drawing = false;
		this.draggingBath = false;
		this.scrubbing = false;
		if (this.dirty) this.rebuild();
	};
	scanAt(x) {
		const gate = this.gate();
		const inner = Math.max(1, gate.right - gate.left);
		return clamp((x - gate.left) / inner, 0, 1);
	}
	stroke(x0, y0, x1, y1, speed, pressure) {
		const dist = Math.hypot(x1 - x0, y1 - y0);
		const steps = Math.max(1, Math.ceil(dist / (3.2 * this.dpr)));
		for (let i = 1; i <= steps; i++) {
			const t = i / steps;
			this.stamp(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, speed, pressure);
		}
	}
	stamp(x, y, speed, pressure) {
		const rad = (12 + (1 - speed) * 36) * clamp(pressure, .35, 1) * this.dpr;
		if (rad < .8) return;
		const [cr, cg, cb] = emulsion(speed);
		const a = .16 + (1 - speed) * .2;
		const col = this.colorCtx;
		col.globalCompositeOperation = "lighter";
		const g = col.createRadialGradient(x, y, 0, x, y, rad);
		g.addColorStop(0, `rgba(255,246,236,${a})`);
		g.addColorStop(.2, `rgba(${cr},${cg},${cb},${a})`);
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
	resize() {
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
		} else this.fog();
		this.colorCtx.globalCompositeOperation = "lighter";
		this.dirty = true;
	}
	fog() {
		const s = this.silverCtx;
		s.globalCompositeOperation = "source-over";
		s.clearRect(0, 0, this.pw, this.ph);
		for (let i = 0; i < 4; i++) {
			const x = Math.random() * this.pw;
			const y = Math.random() * this.ph;
			const r = this.pw * (.28 + Math.random() * .45);
			const g = s.createRadialGradient(x, y, 0, x, y, r);
			g.addColorStop(0, "rgba(255,248,240,0.045)");
			g.addColorStop(1, "rgba(255,248,240,0)");
			s.fillStyle = g;
			s.fillRect(0, 0, this.pw, this.ph);
		}
	}
	seedWear() {
		this.dust = Array.from({ length: 42 }, () => ({
			x: Math.random(),
			y: Math.random(),
			r: .35 + Math.random() * 1.3,
			a: .08 + Math.random() * .28
		}));
		this.scratches = Array.from({ length: 5 }, () => ({
			x: .12 + Math.random() * .76,
			y: Math.random() * .7,
			len: .08 + Math.random() * .22,
			w: .4 + Math.random() * .7,
			a: .08 + Math.random() * .12
		}));
	}
	rebuild() {
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
		const d = this.aCtx.getImageData(0, 0, aw, ah).data;
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
				const lum = .2126 * R + .7152 * G + .0722 * B;
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
			centroid[x] = e > .001 ? cy / e : .5;
			total += energy[x] ?? 0;
		}
		this.columns = {
			n: aw,
			energy,
			centroid,
			r,
			g,
			b
		};
		const nextInk = total / aw > .006;
		if (nextInk !== this.ink) {
			this.ink = nextInk;
			this.hooks.onInk(nextInk);
		}
		this.dirty = false;
	}
	sample(scan) {
		const c = this.columns;
		if (!c) return SILENCE;
		const x = clamp(scan, 0, 1) * (c.n - 1);
		const i = Math.floor(x);
		const f = x - i;
		const j = Math.min(c.n - 1, i + 1);
		const mixAt = (arr) => (arr[i] ?? 0) * (1 - f) + (arr[j] ?? 0) * f;
		return {
			energy: mixAt(c.energy),
			centroid: mixAt(c.centroid),
			r: mixAt(c.r),
			g: mixAt(c.g),
			b: mixAt(c.b),
			pan: scan * 2 - 1
		};
	}
	gate() {
		const left = 24 * this.dpr;
		const trackH = 28 * this.dpr;
		const bottom = 8 * this.dpr;
		return {
			left,
			right: this.pw - left,
			trackTop: this.ph - bottom - trackH,
			trackH
		};
	}
	meniscusY(x) {
		const base = this.ph * (1 - clamp(this.level, 0, 1));
		if (this.calm) return base;
		const amp = 4.5 * this.dpr;
		return base + Math.sin(x * .012 + this.time * 1.7) * amp + Math.sin(x * .005 - this.time * .85) * amp * .45;
	}
	traceWave(ctx) {
		ctx.beginPath();
		const step = 8 * this.dpr;
		for (let x = 0; x <= this.pw; x += step) {
			const y = this.meniscusY(x);
			if (x === 0) ctx.moveTo(0, y);
			else ctx.lineTo(x, y);
		}
		ctx.lineTo(this.pw, this.meniscusY(this.pw));
	}
	loop = (now) => {
		if (this.dead) return;
		const dt = Math.min(.05, (now - this.lastFrame) / 1e3 || .016);
		this.lastFrame = now;
		this.time += dt;
		if (this.drawing && this.phase === "expor") {
			this.holdSpeed *= Math.exp(-2.8 * dt);
			this.holdAcc += dt;
			if (this.holdAcc > .055) {
				this.holdAcc = 0;
				this.stamp(this.lastX, this.lastY, this.holdSpeed, this.pressure);
			}
		}
		if (this.phase === "banho" && this.hasTilt && !this.draggingBath) this.level += (this.tiltTarget - this.level) * Math.min(1, dt * 4.5);
		if (this.phase === "ouvir" && this.playing && !this.scrubbing) this.scan = (this.scan + dt / 12) % 1;
		const moved = Math.abs(this.level - this.prevLevel);
		if (!this.calm) this.tickBubbles(dt, moved);
		if (this.phase === "banho") this.audio.setFizz(moved / Math.max(dt, .008) * .012);
		else this.audio.setFizz(0);
		this.prevLevel = this.level;
		if (this.dirty) this.rebuild();
		const listening = this.phase === "ouvir";
		this.audio.setListening(listening);
		if (listening) {
			const flutter = this.calm ? 1 : 1 + Math.sin(this.time * 3.1) * .0032 + Math.sin(this.time * 8.4) * .0014;
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
	tickBubbles(dt, moved) {
		if (this.level > .03 && Math.random() < (moved > .001 ? 16 : 1.6) * dt) this.bubbles.push({
			x: .14 + Math.random() * .72,
			y: Math.min(.98, 1 - this.level + Math.random() * this.level),
			r: .8 + Math.random() * 2,
			v: .05 + Math.random() * .09,
			a: .2 + Math.random() * .45
		});
		const surface = 1 - this.level;
		this.bubbles = this.bubbles.map((b) => ({
			...b,
			y: b.y - b.v * dt
		})).filter((b) => b.y > surface - .01).slice(-36);
	}
	paint() {
		const ctx = this.view;
		if (!ctx) return;
		const { pw: w, ph: h } = this;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "#4e433a";
		ctx.fillRect(0, 0, w, h);
		const drift = this.calm ? 0 : this.time * 14 % 180;
		ctx.save();
		ctx.globalAlpha = .55;
		ctx.globalCompositeOperation = "overlay";
		const pattern = ctx.createPattern(this.grain, "repeat");
		if (pattern) {
			ctx.translate(drift, drift * .4);
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
		ctx.globalAlpha = .85;
		ctx.drawImage(this.silver, -shift * .45, 0);
		ctx.restore();
		ctx.save();
		this.traceWave(ctx);
		ctx.lineTo(w, h);
		ctx.lineTo(0, h);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(this.color, shift, 0);
		ctx.restore();
		if (this.level > .012 && this.level < .995) {
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
		if (!this.calm) for (const b of this.bubbles) {
			ctx.beginPath();
			ctx.strokeStyle = `rgba(255, 206, 170, ${b.a})`;
			ctx.lineWidth = this.dpr;
			ctx.arc(b.x * w, b.y * h, b.r * this.dpr, 0, Math.PI * 2);
			ctx.stroke();
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
		const wash = ctx.createRadialGradient(w * .5, 0, 10, w * .5, 0, h * .9);
		wash.addColorStop(0, "rgba(255, 106, 42, 0.28)");
		wash.addColorStop(.45, "rgba(255, 106, 42, 0.08)");
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
		const vignette = ctx.createRadialGradient(w * .5, h * .45, w * .2, w * .5, h * .5, w * .78);
		vignette.addColorStop(0, "rgba(0,0,0,0)");
		vignette.addColorStop(.7, "rgba(0,0,0,0.08)");
		vignette.addColorStop(1, "rgba(0,0,0,0.38)");
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, w, h);
		this.paintPerfs(ctx);
		this.paintTrack(ctx);
		if (this.phase === "ouvir") this.paintHead(ctx);
	}
	paintPerfs(ctx) {
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
	paintTrack(ctx) {
		const { left, right, trackTop, trackH } = this.gate();
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
			const x = left + i / (cols.n - 1) * span;
			ctx.lineTo(x, mid - Math.min(trackH * .46, e * trackH * 1.6));
		}
		for (let i = cols.n - 1; i >= 0; i--) {
			const e = cols.energy[i] ?? 0;
			const x = left + i / (cols.n - 1) * span;
			ctx.lineTo(x, mid + Math.min(trackH * .46, e * trackH * 1.6));
		}
		ctx.closePath();
		ctx.fillStyle = "#f3eadf";
		ctx.fill();
		ctx.font = `${Math.round(10 * this.dpr)}px "IBM Plex Mono", ui-monospace, monospace`;
		ctx.fillStyle = "rgba(243,234,223,0.82)";
		ctx.textBaseline = "bottom";
		ctx.fillText(`LATENTE  ·  500T  ·  ${this.frameLabel}`, left, trackTop - 6 * this.dpr);
	}
	paintHead(ctx) {
		const gate = this.gate();
		const x = gate.left + this.scan * (gate.right - gate.left);
		const glow = ctx.createLinearGradient(x - 14 * this.dpr, 0, x + 14 * this.dpr, 0);
		glow.addColorStop(0, "rgba(255,106,42,0)");
		glow.addColorStop(.5, "rgba(255,106,42,0.16)");
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
};
function round(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}
function makeGrain(size) {
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
var LEDE = {
	expor: "Arraste devagar para o âmbar, rápido para o ciano. Segurar queima mais prata.",
	banho: "Puxe o líquido para cima com o dedo, ou deite o aparelho para verter o revelador.",
	ouvir: "A cabeça óptica lê a cor — mesmo a que o banho ainda não mostrou. De fone, o som atravessa."
};
var PHASES = [
	{
		id: "expor",
		label: "Expor"
	},
	{
		id: "banho",
		label: "Banho"
	},
	{
		id: "ouvir",
		label: "Ouvir"
	}
];
function LatenteApp() {
	const canvasRef = (0, import_react.useRef)(null);
	const timeRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const toldTilt = (0, import_react.useRef)(false);
	const [phase, setPhase] = (0, import_react.useState)("expor");
	const [prints, setPrints] = (0, import_react.useState)([]);
	const [frame, setFrame] = (0, import_react.useState)(1);
	const [drawer, setDrawer] = (0, import_react.useState)(false);
	const [playing, setPlaying] = (0, import_react.useState)(true);
	const [status, setStatus] = (0, import_react.useState)("");
	const [flash, setFlash] = (0, import_react.useState)(false);
	const [hasInk, setHasInk] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setPrints(loadPrints());
		setFrame(currentFrame());
	}, []);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const engine = new FilmEngine(canvas, {
			onInk: (value) => setHasInk(value),
			onTilt: () => {
				if (toldTilt.current) return;
				toldTilt.current = true;
				setStatus("Inclinação ativa. Deite o aparelho para o banho subir.");
			},
			timeEl: () => timeRef.current
		});
		engine.setFrame(currentFrame());
		engineRef.current = engine;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		engine.setCalm(mq.matches);
		const onMq = () => engine.setCalm(mq.matches);
		mq.addEventListener("change", onMq);
		const onKey = (event) => {
			if (event.key === "1") choose("expor");
			else if (event.key === "2") choose("banho");
			else if (event.key === "3") choose("ouvir");
			else if (event.key === " ") {
				event.preventDefault();
				setPlaying((value) => !value);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => {
			mq.removeEventListener("change", onMq);
			window.removeEventListener("keydown", onKey);
			engine.destroy();
			engineRef.current = null;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const engine = engineRef.current;
		if (!engine) return;
		engine.setPhase(phase);
		engine.setPlaying(playing);
	}, [phase, playing]);
	(0, import_react.useEffect)(() => {
		engineRef.current?.setFrame(frame);
	}, [frame]);
	function choose(next) {
		engineRef.current?.unlock();
		setPhase(next);
		if (next === "ouvir") setPlaying(true);
		if (next === "banho") engineRef.current?.enableTilt();
	}
	function pulse() {
		setFlash(true);
		window.setTimeout(() => setFlash(false), 340);
	}
	function fixar(silent = false) {
		const engine = engineRef.current;
		if (!engine) return false;
		engine.unlock();
		const jpeg = engine.exportJpeg();
		if (!jpeg) return false;
		engine.shutter();
		const next = [{
			id: crypto.randomUUID(),
			frame,
			at: Date.now(),
			jpeg
		}, ...prints].slice(0, 12);
		setPrints(next);
		savePrints(next);
		if (!silent) {
			setStatus(`Película ${padFrame(frame)} fixada na gaveta.`);
			pulse();
		}
		return true;
	}
	function nova() {
		const engine = engineRef.current;
		if (!engine) return;
		const saved = engine.hasInk() ? fixar(true) : false;
		engine.clear();
		const n = advanceFrame();
		setFrame(n);
		setHasInk(false);
		setPhase("expor");
		setStatus(saved ? "A anterior foi para a gaveta. Película virgem." : "Película virgem.");
		if (saved) pulse();
	}
	function solarizar() {
		const engine = engineRef.current;
		if (!engine || !engine.hasInk()) return;
		engine.unlock();
		engine.solarize();
		engine.shutter();
		setStatus("Solarizada. A harmonia virou o negativo.");
		pulse();
	}
	async function openPrint(print) {
		const engine = engineRef.current;
		if (!engine) return;
		engine.unlock();
		try {
			await engine.load(print.jpeg);
		} catch {
			setStatus("Não deu para abrir essa película.");
			return;
		}
		setHasInk(true);
		setPhase("ouvir");
		setPlaying(true);
		setDrawer(false);
		setStatus(`Película ${padFrame(print.frame)} na mesa. Pode reexpor por cima.`);
	}
	function removePrint(id) {
		const next = prints.filter((print) => print.id !== id);
		setPrints(next);
		savePrints(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "darkroom",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "sheet",
			"data-phase": phase,
			"data-ink": hasInk ? "1" : "0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "gate",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
							ref: canvasRef,
							"aria-label": "Película. Arraste para expor luz."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "top",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "brand-row",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "kicker",
										children: "câmara escura sonora"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Latente" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "frame-col",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "frame",
											children: padFrame(frame)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "time",
											ref: timeRef,
											children: "0:00.0"
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "lede",
									children: LEDE[phase]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "status",
									role: "status",
									children: status
								})
							]
						}),
						phase === "expor" && !hasInk ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "ghost",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["A luz ainda não existe.", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "toque e arraste" })] })
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: flash ? "flash on" : "flash" })
					]
				}),
				drawer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "drawer",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "drawer-head",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Gaveta" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [prints.length, "/12"] })]
					}), prints.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "drawer-empty",
						children: "Nada fixado. Revele uma película e arquive."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "strip",
						children: prints.map((print) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cell",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "cell-open",
								onClick: () => void openPrint(print),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: print.jpeg,
									alt: `Película ${padFrame(print.frame)}`
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: padFrame(print.frame) })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "cell-x",
								"aria-label": `Apagar película ${padFrame(print.frame)}`,
								onClick: () => removePrint(print.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
									size: 14,
									strokeWidth: 1.75
								})
							})]
						}, print.id))
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
					className: "dock",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "phases",
						role: "tablist",
						"aria-label": "Etapas da câmara",
						children: PHASES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							"aria-selected": phase === item.id,
							onClick: () => choose(item.id),
							children: item.label
						}, item.id))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "tools",
						children: [
							phase === "ouvir" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "tool",
								"aria-pressed": playing,
								onClick: () => {
									engineRef.current?.unlock();
									setPlaying((value) => !value);
								},
								children: [playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {
									size: 16,
									strokeWidth: 1.75
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
									size: 16,
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: playing ? "Parar" : "Tocar" })]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "tool",
								onClick: nova,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {
									size: 16,
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Nova" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "tool",
								onClick: solarizar,
								disabled: !hasInk,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contrast, {
									size: 16,
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Solar" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "tool",
								onClick: () => fixar(false),
								disabled: !hasInk,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, {
									size: 16,
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Fixar" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "tool",
								"aria-pressed": drawer,
								onClick: () => setDrawer((value) => !value),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Images, {
									size: 16,
									strokeWidth: 1.75
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gaveta" })]
							})
						]
					})]
				})
			]
		})
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LatenteApp, {});
}
//#endregion
export { Home as component };
