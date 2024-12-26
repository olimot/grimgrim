import { vec2 } from "gl-matrix";

export const mix = (x: number, y: number, a: number) => x * (1 - a) + y * a;

export const clamp = (x: number, min: number, max: number) =>
  Math.min(Math.max(x, min), max);

export function toSRGB(x: number) {
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1.0 / 2.4) - 0.055;
}

export function toLinear(x: number) {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function easePower(x: number, y = 2) {
  return x < 0.5 ? Math.pow(2 * x, y) / 2 : 1 - Math.pow(-2 * x + 2, y) / 2;
}

export function easeSine(x: number): number {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function* bline(x0 = 0, y0 = 0, x1 = 0, y1 = 0) {
  const [sx, sy] = [x0 < x1 ? 1 : -1, y0 < y1 ? 1 : -1];
  const [dx, dy] = [Math.abs(x1 - x0), Math.abs(y1 - y0)];
  const p = [x0, y0];
  let err = (dx > dy ? dx : -dy) / 2;
  while (true) {
    yield p;
    if (p[0] === x1 && p[1] === y1) break;
    const e2 = err;
    if (e2 > -dx) [err, p[0]] = [err - dy, p[0] + sx];
    if (e2 < dy) [err, p[1]] = [err + dx, p[1] + sy];
  }
}

export function assert(
  condition: boolean,
  ...args: unknown[]
): asserts condition {
  console.assert(condition, ...args);
  if (!condition) throw new Error("Assertion failed.");
}

export function normalizeCanvasSize(canvas: HTMLCanvasElement) {
  if (!canvas.hasAttribute("width")) {
    Object.assign(canvas, { width: 300, height: 150 });
  }
  canvas.style.width = `${canvas.width / devicePixelRatio}px`;
  canvas.style.height = `${canvas.height / devicePixelRatio}px`;
}

export function getCanvasPointerInfo(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): readonly [vec2, vec2, vec2] {
  const { left, top, width, height } = canvas.getBoundingClientRect();
  const scale = vec2.fromValues(canvas.width / width, canvas.height / height);
  const offset = vec2.fromValues(event.clientX - left, event.clientY - top);
  const p1 = vec2.mul(offset, offset, scale);
  const delta = vec2.fromValues(event.movementX, event.movementY);
  if (!vec2.len(delta)) return [p1, p1, delta];
  const p0 = vec2.sub(vec2.create(), p1, vec2.mul(delta, delta, scale));
  return [p0, p1, delta];
}

export function capturePointer(
  target: HTMLElement,
  callback: (e: PointerEvent) => unknown,
) {
  let activePointerId = -1;

  const capture = (event: PointerEvent) => {
    if (event.type === "pointerdown") activePointerId = event.pointerId;
    if (activePointerId !== event.pointerId) return;
    event.preventDefault();
    return callback(event);
  };

  const release = (event: PointerEvent) => {
    if (activePointerId === event.pointerId) {
      activePointerId = -1;
      callback(event);
    }
  };

  const prevTouchAction = target.style.touchAction;
  target.style.touchAction = "none";
  window.addEventListener("pointerdown", capture);
  window.addEventListener("pointermove", capture);
  window.addEventListener("pointerup", release);
  window.addEventListener(
    "contextmenu",
    (e) => !e.ctrlKey && e.preventDefault(),
  );

  return () => {
    window.removeEventListener("pointerdown", capture);
    window.removeEventListener("pointermove", capture);
    window.removeEventListener("pointerup", release);
    target.style.touchAction = prevTouchAction;
  };
}
