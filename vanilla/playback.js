// The one composition clock: preview, scrubbing, frame stepping, and export all read its time.
// Each page owns one engine and passes it to every control that plays or previews motion.
// The animation frame loop runs only while playing. Time and play state are transient; never save them.
// total, range, and fps are functions read when needed; call refresh() after changing what they return.
import { clamp } from "../src/lib/values.js";

// One animation frame: advance by the elapsed seconds (at most 0.1 s), wrap a looping range, stop at a range's end.
// elapsed is null on the first frame after starting, which only takes a timestamp.
export function tick(time, elapsed, { start, end, loop }) {
  if (elapsed !== null) {
    const next = time + Math.min(0.1, elapsed);
    if (loop && end > start) time = next >= end ? start + ((next - end) % (end - start)) : next;
    else time = Math.min(end, next);
  }
  return { time, playing: loop || time < end };
}

export function createPlayback({ total, range = () => ({ start: 0, end: total(), loop: false }), fps }) {
  if (typeof total !== "function" || typeof range !== "function" || typeof fps !== "function")
    throw new Error("createPlayback: total, range, and fps must be functions.");
  let time = 0;
  let playing = false;
  let frame = 0;
  let last = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener({ time, playing }));

  function loop(now) {
    const next = tick(time, last === null ? null : (now - last) / 1000, range());
    last = now;
    time = next.time;
    if (next.playing) frame = requestAnimationFrame(loop);
    else setPlaying(false, false);
    notify();
  }
  function setPlaying(on, announce = true) {
    if (on === playing) return;
    playing = on;
    cancelAnimationFrame(frame);
    last = null;
    if (on) frame = requestAnimationFrame(loop);
    if (announce) notify();
  }
  // Playing from outside the range, or from its end, starts at its beginning.
  function toggle() {
    const { start, end } = range();
    if (!playing && (time >= end || time < start)) time = start;
    setPlaying(!playing, false);
    notify();
  }
  function scrub(value) {
    setPlaying(false, false);
    time = clamp(value, 0, total());
    notify();
  }
  function stepFrame(delta) {
    scrub((Math.round(time * fps()) + delta) / fps());
  }
  function refresh() {
    if (time > total()) time = total();
    notify();
  }
  const pause = () => {
    if (document.hidden) setPlaying(false);
  };
  document.addEventListener("visibilitychange", pause);

  return {
    get time() { return time; },
    get playing() { return playing; },
    get total() { return total(); },
    get range() { return range(); },
    get fps() { return fps(); },
    toggle,
    scrub,
    stepFrame,
    refresh,
    // Calls listener({ time, playing }) after every change; returns a function that unsubscribes.
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", pause);
      listeners.clear();
    },
  };
}
