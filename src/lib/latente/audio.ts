export type ColumnVoice = {
  energy: number;
  centroid: number;
  r: number;
  g: number;
  b: number;
  pan: number;
};

const SCALE = [
  146.83, 174.61, 196, 220, 261.63, 293.66, 349.23, 392, 440, 523.25, 587.33, 698.46,
];

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function quantize(centroid: number) {
  const i = Math.round(clamp01(centroid) * (SCALE.length - 1));
  return SCALE[i] ?? 220;
}

export class OpticalBed {
  private ctx: AudioContext | null = null;
  private ready = false;
  private comp: DynamicsCompressorNode | null = null;
  private voice: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private panner: StereoPannerNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscFifth: OscillatorNode | null = null;
  private oscHigh: OscillatorNode | null = null;
  private gA: GainNode | null = null;
  private gSub: GainNode | null = null;
  private gFifth: GainNode | null = null;
  private gHigh: GainNode | null = null;
  private gGrain: GainNode | null = null;
  private fizz: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  unlock() {
    if (this.ready && this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 16;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.005;
    comp.release.value = 0.24;
    comp.connect(ctx.destination);
    this.comp = comp;

    const voice = ctx.createGain();
    voice.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.65;
    const panner = ctx.createStereoPanner();
    voice.connect(filter);
    filter.connect(panner);
    panner.connect(comp);
    this.voice = voice;
    this.filter = filter;
    this.panner = panner;

    const make = (type: OscillatorType) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = 220;
      g.gain.value = 0;
      o.connect(g);
      g.connect(voice);
      o.start();
      return { o, g };
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
    bp.Q.value = 0.7;
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
    void ctx.resume();
  }

  private at(param: AudioParam, value: number, seconds: number) {
    if (!this.ctx) return;
    param.setTargetAtTime(value, this.ctx.currentTime, seconds);
  }

  setListening(on: boolean) {
    if (!this.voice) return;
    this.at(this.voice.gain, on ? 1 : 0, 0.06);
  }

  setFizz(amount: number) {
    if (!this.fizz) return;
    this.at(this.fizz.gain, Math.max(0, Math.min(0.16, amount)), 0.05);
  }

  update(v: ColumnVoice, flutter: number) {
    if (!this.ready || !this.oscA || !this.oscSub || !this.oscFifth || !this.oscHigh) return;
    if (!this.gA || !this.gSub || !this.gFifth || !this.gHigh || !this.gGrain || !this.filter || !this.panner) {
      return;
    }
    const e = Math.min(1, Math.max(0, v.energy) * 2.6);
    const fund = quantize(v.centroid) * flutter;
    this.at(this.oscA.frequency, fund, 0.09);
    this.at(this.oscSub.frequency, Math.max(40, fund / 2), 0.12);
    this.at(this.oscFifth.frequency, fund * 1.4983, 0.1);
    this.at(this.oscHigh.frequency, fund * 2, 0.1);
    this.at(this.gA.gain, e * 0.2, 0.05);
    this.at(this.gSub.gain, e * v.r * 0.15, 0.06);
    this.at(this.gFifth.gain, e * (0.035 + v.g * 0.11), 0.06);
    this.at(this.gHigh.gain, e * v.b * 0.09, 0.06);
    const max = Math.max(v.r, v.g, v.b, 0.0001);
    const min = Math.min(v.r, v.g, v.b);
    const sat = (max - min) / max;
    this.at(this.gGrain.gain, e * (1 - sat) * 0.09, 0.08);
    this.at(this.filter.frequency, 360 + v.centroid * 2100 + v.b * 800, 0.1);
    this.at(this.panner.pan, Math.max(-1, Math.min(1, v.pan)), 0.12);
  }

  tick(strength = 0.05) {
    this.burst(strength, 0.045, 0);
  }

  shutter() {
    this.burst(0.2, 0.07, 0);
    if (!this.ctx || !this.comp) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(210, now);
    o.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o.connect(g);
    g.connect(this.comp);
    o.start(now);
    o.stop(now + 0.22);
  }

  private burst(strength: number, dur: number, delay: number) {
    if (!this.ctx || !this.comp || !this.noiseBuf || strength <= 0) return;
    const now = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    g.gain.setValueAtTime(Math.max(0.001, strength), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(g);
    g.connect(this.comp);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  suspend() {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }

  resumeIfUnlocked() {
    if (this.ready && this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  destroy() {
    this.ready = false;
    if (this.ctx && this.ctx.state !== "closed") void this.ctx.close();
    this.ctx = null;
  }
}
