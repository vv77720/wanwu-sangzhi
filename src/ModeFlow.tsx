import { useEffect, useRef, useState } from "react";

const DRAIN_MS = 20 * 60 * 1000;

type Phase =
  | "wait"
  | "alert"
  | "choice"
  | "compact"
  | "dead"
  | "retry"
  | "ended"
  | "done";

const card: React.CSSProperties = {
  position: "relative",
  background: "rgba(28,28,30,0.94)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  borderRadius: 22,
  padding: "26px",
  textAlign: "center",
  width: "min(82%, 336px)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
  fontSize: 15,
  lineHeight: 1.85,
};

const optionButton: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 10,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 14.5,
  lineHeight: 1.6,
};

export default function ModeFlow({
  initial,
  onBattery,
  onCharging,
  onFinish,
  onReboot,
  stage6 = false,
  onStage6PowerOff,
}: {
  initial: number;
  onBattery: (v: number) => void;
  onCharging: (on: boolean) => void;
  onFinish: () => void;
  onReboot: () => void;
  stage6?: boolean;
  onStage6PowerOff?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("wait");
  const [warn, setWarn] = useState(false);
  const warned = useRef(false);

  useEffect(() => {
    if (phase !== "wait") return;
    const timer = setTimeout(() => setPhase("alert"), 1000);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "alert") return;
    const timer = setTimeout(() => setPhase("choice"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "compact") return;
    const started = Date.now();
    const tick = () => {
      const ratio = Math.min(1, (Date.now() - started) / DRAIN_MS);
      const left = Math.max(0, initial * (1 - ratio));
      onBattery(Math.ceil(left));
      if (left <= 10 && !warned.current) {
        warned.current = true;
        setWarn(true);
        setTimeout(() => setWarn(false), 3500);
      }
      if (left <= 0) setPhase("dead");
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phase, initial, onBattery]);

  useEffect(() => {
    if (phase !== "dead") return;
    // 剧情阶段（Stage6）没电：不进入重试，直接满电复活并弹到设置
    if (stage6) {
      const timer = setTimeout(() => {
        onBattery(initial);
        warned.current = false;
        onCharging(true);
        setPhase("done");
        onFinish();
        onStage6PowerOff?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setPhase("retry"), 2000);
    return () => clearTimeout(timer);
  }, [phase, stage6, initial, onBattery, onCharging, onFinish, onStage6PowerOff]);

  useEffect(() => {
    if (phase !== "ended") return;
    const timer = setTimeout(onReboot, 3000);
    return () => clearTimeout(timer);
  }, [phase, onReboot]);

  if (phase === "done") return null;

  const blocking = phase !== "compact" && phase !== "wait";
  const blackout = phase === "dead" || phase === "retry" || phase === "ended";

  const chooseCompact = () => setPhase("compact");
  const chooseCasual = () => {
    onBattery(initial);
    onCharging(true);
    setPhase("done");
    onFinish();
  };

  return (
    <>
      {blocking && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 70,
            background: blackout ? "#000" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.6s ease",
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          {phase === "alert" && <div style={card}>你：啊，只剩下{initial}格电了？</div>}

          {phase === "choice" && (
            <div style={card}>
              <div style={{ marginBottom: 4 }}>你：啊，只剩下{initial}格电了？</div>
              <button style={optionButton} onClick={chooseCompact}>
                <strong>那就没办法了。</strong>
                <div style={{ opacity: 0.72, fontSize: 12.5, marginTop: 2 }}>
                  （选择此选项后，进入紧凑模式，电量耗尽即视为探索失败。）
                </div>
              </button>
              <button style={optionButton} onClick={chooseCasual}>
                <strong>幸好我带了充电宝。</strong>
                <div style={{ opacity: 0.72, fontSize: 12.5, marginTop: 2 }}>
                  （选择此选项后，进入休闲模式，你可以无时间限制地尽情探索。）
                </div>
              </button>
            </div>
          )}

          {phase === "dead" && <div style={card}>手机没电了，你被迫中断了探索。</div>}

          {phase === "retry" && (
            <div style={card}>
              <div style={{ marginBottom: 12 }}>是否回到模式选择环节？</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  style={{ ...optionButton, marginTop: 0, textAlign: "center" }}
                  onClick={() => {
                    onBattery(initial);
                    warned.current = false;
                    setPhase("choice");
                  }}
                >
                  是
                </button>
                <button
                  style={{ ...optionButton, marginTop: 0, textAlign: "center" }}
                  onClick={() => setPhase("ended")}
                >
                  否
                </button>
              </div>
            </div>
          )}

          {phase === "ended" && <div style={card}>没办法了，只能先这样了。</div>}
        </div>
      )}

      {phase === "compact" && warn && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 69,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ ...card, width: "min(64%, 250px)", padding: "18px 20px" }}>
            当前电量不足10%
          </div>
        </div>
      )}
    </>
  );
}
