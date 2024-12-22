import { mat4 } from "gl-matrix";
import { createF32Texture, createImageShaderProgram } from "./image-shader";

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

window.addEventListener("load", () => {
  const canvas = document.querySelector(
    ".grimgrim-canvas",
  ) as HTMLCanvasElement;
  canvas.style.width = `${canvas.width / devicePixelRatio}px`;
  canvas.style.height = `${canvas.height / devicePixelRatio}px`;
  let canvasLeft = canvas.parentElement!.clientWidth / 2;
  canvasLeft -= canvas.clientWidth / 2;
  let canvasTop = canvas.parentElement!.clientHeight / 2;
  canvasTop -= canvas.clientHeight / 2;
  canvas.style.transform = `translate(${canvasLeft}px, ${canvasTop}px)`;
  const size = [canvas.width, canvas.height];
  const scale = [size[0] / canvas.clientWidth, size[1] / canvas.clientHeight];

  const gl = canvas.getContext("webgl2");
  if (!gl) return;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.depthFunc(gl.LEQUAL);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.blendEquation(gl.FUNC_ADD);
  gl.colorMask(true, true, true, true);
  gl.clearColor(1, 0, 0, 1);
  gl.clearDepth(1);
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_float_blend");

  const paintingTex = createF32Texture(gl, size[0], size[1]);
  paintingTex.data.forEach((_, i) => {
    paintingTex.data[i] = i % 4 === 3 ? 1 : 0;
  });
  paintingTex.upload();

  const hardness = 0;
  const brushSize = 32;
  const softBrushSize = Math.ceil(
    brushSize * (hardness + 1.6 * (1 - hardness)),
  );
  const softBrushCenter = (softBrushSize - 1) / 2;
  const brushData = new Float32Array(softBrushSize * softBrushSize * 4);
  brushData.fill(1);
  for (let by = 0; by < softBrushSize; by++) {
    for (let bx = 0; bx < softBrushSize; bx++) {
      const dx = bx - softBrushCenter;
      const dy = by - softBrushCenter;
      let t = 1 - Math.sqrt(dx * dx + dy * dy) / softBrushCenter;
      t = Math.min(Math.max(0, t), 1);
      const idx = by * softBrushSize + bx;
      brushData[idx * 4 + 0] = 1;
      brushData[idx * 4 + 1] = 1;
      brushData[idx * 4 + 2] = 1;
      brushData[idx * 4 + 3] = toLinear(easeSine(t));
    }
  }
  const brushTex = createF32Texture(
    gl,
    softBrushSize,
    softBrushSize,
    brushData,
  );
  brushTex.upload();

  const pogramInfo = createImageShaderProgram(gl);
  pogramInfo.use();
  pogramInfo.bindFramebuffer(null);
  gl.clear(gl.COLOR_BUFFER_BIT);
  pogramInfo.draw(paintingTex);

  let [x0, y0] = [NaN, NaN];
  let brushPointerId = -1;
  const brushModel = mat4.create();
  const brush = (event = new PointerEvent("")) => {
    if (event.target !== canvas) return;
    const offset = [event.offsetX, event.offsetY];
    const point = offset.map((it, i) => Math.floor(scale[i] * it));
    if (event.type === "pointerdown") {
      if (event.ctrlKey) return;
      brushPointerId = event.pointerId;
      [x0, y0] = point;
    }
    if (brushPointerId !== event.pointerId) return;
    event.preventDefault();
    pogramInfo.bindFramebuffer(paintingTex);
    if (event.type === "pointerdown") {
      mat4.fromTranslation(brushModel, [
        x0 - softBrushCenter,
        y0 - softBrushCenter,
        0,
      ]);
    } else {
      const [x1, y1] = point;
      const distance = Math.hypot(x1 - x0, y1 - y0);
      if (distance < brushSize / 4) return;
      mat4.fromTranslation(brushModel, [
        x1 - softBrushCenter,
        y1 - softBrushCenter,
        0,
      ]);
    }
    mat4.scale(brushModel, brushModel, [softBrushSize, softBrushSize, 1]);
    pogramInfo.draw(brushTex, brushModel, 1);

    pogramInfo.bindFramebuffer(null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFuncSeparate(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    gl.blendEquation(gl.FUNC_ADD);
    pogramInfo.draw(paintingTex);

    [x0, y0] = point;
  };
  window.addEventListener("pointerdown", brush);
  window.addEventListener("pointermove", brush);
  window.addEventListener("pointerup", (event) => {
    if (brushPointerId === event.pointerId) brushPointerId = -1;
  });
  canvas.style.touchAction = "none";
});
