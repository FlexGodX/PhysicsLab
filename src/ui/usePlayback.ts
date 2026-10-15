import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
export function usePlayback(duration: number) {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const reduced =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last: number | null = null;
    let active = true;
    function tick(now: number) {
      if (!active) return;
      if (last !== null) {
        const elapsed = ((now - last) / 1000) * speed;
        // Commit before this animation frame is painted, keeping all views in sync.
        flushSync(() => setTime((t) => Math.min(duration, t + elapsed)));
      }
      last = now;
      if (active) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [running, speed, duration]);
  useEffect(() => {
    if (time >= duration) setRunning(false);
  }, [time, duration]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  return {
    time,
    running,
    speed,
    reduced,
    setSpeed,
    setRunning,
    seek: (t: number) => {
      setRunning(false);
      setTime(Math.max(0, Math.min(duration, t)));
    },
    reset: () => {
      setRunning(false);
      setTime(0);
    },
  };
}
