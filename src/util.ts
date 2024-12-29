import { mat3, ReadonlyVec2, vec2 } from "gl-matrix";

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

export function scaleFromOrigin(
  out: vec2,
  a: ReadonlyVec2,
  b: number,
  origin: ReadonlyVec2,
) {
  return vec2.add(out, vec2.scale(out, vec2.sub(out, a, origin), b), origin);
}

export function assert(
  condition: boolean,
  ...args: unknown[]
): asserts condition {
  console.assert(condition, ...args);
  if (!condition) throw new Error("Assertion failed.");
}

export const dpr = devicePixelRatio;

export function normalizeCanvasSize(canvas: HTMLCanvasElement) {
  if (!canvas.hasAttribute("width")) {
    Object.assign(canvas, { width: 300, height: 150 });
  }
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
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

export function getClipboardImageBitmap(
  e: ClipboardEvent,
  options?: ImageBitmapOptions,
) {
  if (!e.clipboardData) return;
  const { items } = e.clipboardData;
  for (const item of items) {
    if (!["image/png", "image/jpeg"].includes(item.type)) continue;
    const file = item.getAsFile();
    if (!file) continue;
    return createImageBitmap(file, options);
  }
}

export type Transform = {
  translation: [number, number];
  rotation: number;
  scale: number;
  matrix: mat3;
};

export function Transform(): Transform {
  const matrix = mat3.identity(mat3.create());
  return { translation: [0, 0], rotation: 0, scale: 1, matrix };
}

export function toCSSTransform(transform: Transform) {
  const [xt, yt] = transform.translation;
  return `translate(${xt / dpr}px, ${yt / dpr}px) scale(${transform.scale})`;
}

export type Rect = {
  xy: [number, number];
  size: [number, number];
};

export function Rect(
  xy: ReadonlyVec2 = [0, 0],
  size: ReadonlyVec2 = [0, 0],
): Rect {
  return { xy: [xy[0], xy[1]], size: [size[0], size[1]] };
}

export function resetTransform(transform: Transform) {
  vec2.zero(transform.translation);
  transform.rotation = 0;
  transform.scale = 1;
  mat3.identity(transform.matrix);
}

export function drawImageMatrix(
  out: mat3,
  src: { xy: vec2; size: vec2 },
  dst: { size: vec2 },
) {
  const { xy, size } = src;
  mat3.fromScaling(out, [size[0] / dst.size[0], size[1] / dst.size[1]]);

  const denom = vec2.clone(dst.size);
  vec2.mul(denom, denom, [0.5, -0.5]);
  const p = vec2.clone(size);
  vec2.sub(p, p, dst.size);
  vec2.scale(p, p, 0.5);
  vec2.add(p, p, xy);
  vec2.div(p, p, denom);
  return mat3.mul(out, mat3.fromTranslation(mat3.create(), p), out);
}

export function hexColor(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

export function getElementSize(element: HTMLElement): [number, number] {
  return [element.clientWidth, element.clientHeight];
}

export function getCenterAlignXY(element: HTMLElement): [number, number] {
  const parentElement = element.parentElement as HTMLElement | null;
  if (!parentElement) return [0, 0];
  const elementSize = getElementSize(element);
  const xy = vec2.sub(elementSize, getElementSize(parentElement), elementSize);
  return vec2.scale(xy, xy, 0.5 * dpr) as [number, number];
}
