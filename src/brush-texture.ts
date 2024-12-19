export default function createBrushCanvas() {
  const x = 32;
  const canvas = new OffscreenCanvas(x, x);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't create 2d context");
  return (gl: WebGL2RenderingContext, texture: WebGLTexture, hardness = 0) => {
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(0, 0, x, x);
    const h = (x - 1) / 2;
    const gradient = ctx.createRadialGradient(h, h, 0, h, h, h);
    const centerOpacity = hardness + (1 - hardness) / h;
    gradient.addColorStop(0, `rgba(255, 255, 255, ${centerOpacity})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, x, x);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  };
}
