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
