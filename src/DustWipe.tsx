import { useEffect, useRef, useState } from "react";

const BRUSH_RATIO = 0.09;
const FINISH_AT = 0.7;

export default function DustWipe({ onDone }: { onDone: () => void }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const paint = useRef({
    drawing: false,
    last: null as { x: number; y: number } | null,
    done: false,
    ctx: null as CanvasRenderingContext2D | null,
    brush: 32,
    moves: 0,
  });
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 3000);
    const t2 = window.setTimeout(() => setPhase(2), 6000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    paint.current.ctx = ctx;
    paint.current.brush = Math.max(36, canvas.width * BRUSH_RATIO);
    const w = canvas.width;
    const h = canvas.height;
    let seed = 20261110;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // 底灰：半透明偏暖灰尘色，隐约透出屏幕的光
    ctx.fillStyle = "rgba(198,190,177,0.56)";
    ctx.fillRect(0, 0, w, h);

    // 少量灰尘晕染
    for (let i = 0; i < 8; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.08 + rnd() * 0.2) * w;
      const v = 148 + Math.floor(rnd() * 60);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${v},${v - 6},${v - 18},${0.1 + rnd() * 0.12})`);
      g.addColorStop(1, "rgba(190,184,170,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 干泥渍：哑光的土褐色软斑块，边角偏多（像掉在地上沾的）
    const mudBlotch = (x: number, y: number, r: number, a: number) => {
      const hue = 96 + Math.floor(rnd() * 22);
      const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(${hue},${hue - 22},${hue - 46},${a})`);
      g.addColorStop(0.75, `rgba(${hue + 12},${hue - 8},${hue - 34},${a * 0.62})`);
      g.addColorStop(1, `rgba(${hue + 20},${hue + 2},${hue - 22},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    };
    for (let i = 0; i < 22; i++) {
      mudBlotch(rnd() * w, rnd() * h, (0.05 + rnd() * 0.11) * w, 0.3 + rnd() * 0.26);
    }
    for (let i = 0; i < 16; i++) {
      const edge = Math.floor(rnd() * 4);
      const x = edge === 0 ? rnd() * w * 0.14 : edge === 1 ? w - rnd() * w * 0.14 : rnd() * w;
      const y = edge === 2 ? rnd() * h * 0.12 : edge === 3 ? h - rnd() * h * 0.12 : rnd() * h;
      mudBlotch(x, y, (0.06 + rnd() * 0.13) * w, 0.34 + rnd() * 0.28);
    }

    // 几道干泥抹痕
    for (let i = 0; i < 8; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const len = (0.25 + rnd() * 0.45) * w;
      const ang = rnd() * Math.PI;
      const hue = 100 + Math.floor(rnd() * 16);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
      g.addColorStop(0, `rgba(${hue},${hue - 20},${hue - 42},0)`);
      g.addColorStop(0.5, `rgba(${hue},${hue - 20},${hue - 42},${0.16 + rnd() * 0.16})`);
      g.addColorStop(1, `rgba(${hue},${hue - 20},${hue - 42},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-len / 2, -len * 0.05, len, len * 0.1);
      ctx.restore();
    }

    // 泥点溅斑（密集、哑光）
    for (let i = 0; i < 1900; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.6 + rnd() * 2.3) * dpr;
      const hue = 88 + Math.floor(rnd() * 40);
      ctx.fillStyle = `rgba(${hue},${hue - 18},${hue - 38},${0.14 + rnd() * 0.34})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 少量灰尘颗粒
    for (let i = 0; i < 600; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = (0.5 + rnd() * 1.4) * dpr;
      const v = 80 + Math.floor(rnd() * 160);
      ctx.fillStyle = `rgba(${v},${v - 4},${v - 12},${0.06 + rnd() * 0.18})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const eraseAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const p = paint.current;
    if (!canvas || !p.ctx || p.done) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const ctx = p.ctx;
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (p.last) {
      ctx.lineWidth = p.brush * 2;
      ctx.beginPath();
      ctx.moveTo(p.last.x, p.last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, p.brush, 0, Math.PI * 2);
    ctx.fill();
    p.last = { x, y };
  };

  // 完成擦屏：淡出后回调，幂等（done 守卫防止重复触发）
  const finish = () => {
    const p = paint.current;
    if (p.done) return;
    p.done = true;
    setFading(true);
    window.setTimeout(onDone, 650);
  };

  const measure = () => {
    const canvas = canvasRef.current;
    const p = paint.current;
    if (!canvas || !p.ctx || p.done) return;
    const sw = 72;
    const sh = Math.max(1, Math.round((canvas.height / canvas.width) * sw));
    const off = document.createElement("canvas");
    off.width = sw;
    off.height = sh;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return;
    octx.drawImage(canvas, 0, 0, sw, sh);
    const data = octx.getImageData(0, 0, sw, sh).data;
    let clear = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 40) clear++;
    if (clear / (sw * sh) >= FINISH_AT) finish();
  };

  // 兜底：进入可擦阶段后 10 秒还没擦干净，就自动恢复干净，避免玩家卡住
  useEffect(() => {
    if (phase < 2) return;
    const t = window.setTimeout(() => {
      if (!paint.current.done) finish();
    }, 10000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 999,
        borderRadius: "inherit",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (phase < 2) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        paint.current.drawing = true;
        setStarted(true);
        eraseAt(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (phase < 2) return;
        if (!paint.current.drawing) return;
        eraseAt(e.clientX, e.clientY);
        paint.current.moves += 1;
        if (paint.current.moves % 15 === 0) measure();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        if (phase < 2) return;
        paint.current.drawing = false;
        paint.current.last = null;
        measure();
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        paint.current.drawing = false;
        paint.current.last = null;
        measure();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {!started && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "rgba(20,20,22,0.78)",
              color: "#fff",
              borderRadius: 20,
              padding: "24px 28px",
              textAlign: "center",
              width: "min(76%, 310px)",
              minHeight: 128,
              boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                lineHeight: 1.9,
                opacity: phase === 0 ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            >
              这部手机算不上干净，你很好奇，到底是发生了什么，它才变成了现在这样。
            </div>
            <div
              style={{
                position: "absolute",
                inset: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                lineHeight: 1.9,
                opacity: phase === 1 ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            >
              你：不管怎么样，先拿纸巾擦一下吧。
            </div>
            <div
              style={{
                position: "absolute",
                inset: "24px 28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.8,
                opacity: phase === 2 ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            >
              按住屏幕来回摩擦，把手机擦干净
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
