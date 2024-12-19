export default function createBrushCanvas() {
  const x = 32;
  const canvas = new OffscreenCanvas(x, x);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't create 2d context");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, x, x);
  const h = x / 2 - 1;
  const gradient = ctx.createRadialGradient(h, h, 0, h, h, h + 0.5);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, x, x);
  return canvas;
}
