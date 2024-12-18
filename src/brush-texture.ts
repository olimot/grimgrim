export default function createBrushCanvas() {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't create 2d context");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16.5);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return canvas;
}
