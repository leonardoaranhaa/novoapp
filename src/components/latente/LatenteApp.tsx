import { useEffect, useRef, useState } from "react";
import { Bookmark, Contrast, Images, Pause, Play, RotateCcw, X } from "lucide-react";
import {
  advanceFrame,
  currentFrame,
  loadPrints,
  padFrame,
  savePrints,
  type Print,
} from "@/lib/latente/archive";
import { FilmEngine, type Phase } from "@/lib/latente/engine";

const LEDE: Record<Phase, string> = {
  expor: "Arraste devagar para o âmbar, rápido para o ciano. Segurar queima mais prata.",
  banho: "Puxe o líquido para cima com o dedo, ou deite o aparelho para verter o revelador.",
  ouvir: "A cabeça óptica lê a cor — mesmo a que o banho ainda não mostrou. De fone, o som atravessa.",
};

const PHASES: { id: Phase; label: string }[] = [
  { id: "expor", label: "Expor" },
  { id: "banho", label: "Banho" },
  { id: "ouvir", label: "Ouvir" },
];

export function LatenteApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<FilmEngine | null>(null);
  const toldTilt = useRef(false);
  const [phase, setPhase] = useState<Phase>("expor");
  const [prints, setPrints] = useState<Print[]>([]);
  const [frame, setFrame] = useState(1);
  const [drawer, setDrawer] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [status, setStatus] = useState("");
  const [flash, setFlash] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    setPrints(loadPrints());
    setFrame(currentFrame());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new FilmEngine(canvas, {
      onInk: (value) => setHasInk(value),
      onTilt: () => {
        if (toldTilt.current) return;
        toldTilt.current = true;
        setStatus("Inclinação ativa. Deite o aparelho para o banho subir.");
      },
      timeEl: () => timeRef.current,
    });
    engine.setFrame(currentFrame());
    engineRef.current = engine;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    engine.setCalm(mq.matches);
    const onMq = () => engine.setCalm(mq.matches);
    mq.addEventListener("change", onMq);

    const onKey = (event: KeyboardEvent) => {
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
    // choose is stable enough for the lifetime of this mount; keys call the latest via setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setPhase(phase);
    engine.setPlaying(playing);
  }, [phase, playing]);

  useEffect(() => {
    engineRef.current?.setFrame(frame);
  }, [frame]);

  function choose(next: Phase) {
    engineRef.current?.unlock();
    setPhase(next);
    if (next === "ouvir") setPlaying(true);
    if (next === "banho") {
      void engineRef.current?.enableTilt();
    }
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
    const print: Print = {
      id: crypto.randomUUID(),
      frame,
      at: Date.now(),
      jpeg,
    };
    const next = [print, ...prints].slice(0, 12);
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

  async function openPrint(print: Print) {
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

  function removePrint(id: string) {
    const next = prints.filter((print) => print.id !== id);
    setPrints(next);
    savePrints(next);
  }

  return (
    <div className="darkroom">
      <section className="sheet" data-phase={phase} data-ink={hasInk ? "1" : "0"}>
        <div className="gate">
          <canvas ref={canvasRef} aria-label="Película. Arraste para expor luz." />
          <header className="top">
            <div className="brand-row">
              <div>
                <p className="kicker">câmara escura sonora</p>
                <h1>Latente</h1>
              </div>
              <div className="frame-col">
                <span className="frame">{padFrame(frame)}</span>
                <span className="time" ref={timeRef}>
                  0:00.0
                </span>
              </div>
            </div>
            <p className="lede">{LEDE[phase]}</p>
            <p className="status" role="status">
              {status}
            </p>
          </header>
          {phase === "expor" && !hasInk ? (
            <div className="ghost">
              <p>
                A luz ainda não existe.
                <span>toque e arraste</span>
              </p>
            </div>
          ) : null}
          <div className={flash ? "flash on" : "flash"} />
        </div>

        {drawer ? (
          <div className="drawer">
            <div className="drawer-head">
              <p>Gaveta</p>
              <p>{prints.length}/12</p>
            </div>
            {prints.length === 0 ? (
              <p className="drawer-empty">Nada fixado. Revele uma película e arquive.</p>
            ) : (
              <div className="strip">
                {prints.map((print) => (
                  <div className="cell" key={print.id}>
                    <button type="button" className="cell-open" onClick={() => void openPrint(print)}>
                      <img src={print.jpeg} alt={`Película ${padFrame(print.frame)}`} />
                      <span>{padFrame(print.frame)}</span>
                    </button>
                    <button
                      type="button"
                      className="cell-x"
                      aria-label={`Apagar película ${padFrame(print.frame)}`}
                      onClick={() => removePrint(print.id)}
                    >
                      <X size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <footer className="dock">
          <div className="phases" role="tablist" aria-label="Etapas da câmara">
            {PHASES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={phase === item.id}
                onClick={() => choose(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="tools">
            {phase === "ouvir" ? (
              <button
                type="button"
                className="tool"
                aria-pressed={playing}
                onClick={() => {
                  engineRef.current?.unlock();
                  setPlaying((value) => !value);
                }}
              >
                {playing ? <Pause size={16} strokeWidth={1.75} /> : <Play size={16} strokeWidth={1.75} />}
                <span>{playing ? "Parar" : "Tocar"}</span>
              </button>
            ) : null}
            <button type="button" className="tool" onClick={nova}>
              <RotateCcw size={16} strokeWidth={1.75} />
              <span>Nova</span>
            </button>
            <button type="button" className="tool" onClick={solarizar} disabled={!hasInk}>
              <Contrast size={16} strokeWidth={1.75} />
              <span>Solar</span>
            </button>
            <button type="button" className="tool" onClick={() => fixar(false)} disabled={!hasInk}>
              <Bookmark size={16} strokeWidth={1.75} />
              <span>Fixar</span>
            </button>
            <button
              type="button"
              className="tool"
              aria-pressed={drawer}
              onClick={() => setDrawer((value) => !value)}
            >
              <Images size={16} strokeWidth={1.75} />
              <span>Gaveta</span>
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
