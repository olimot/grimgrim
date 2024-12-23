import { mat4 } from "gl-matrix";
import { createBrushTexture } from "./brush-texture";
import {
  createImageShaderProgram,
  createR32FDataTexture,
} from "./image-shader";

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

window.addEventListener("load", async () => {
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
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_float_blend");

  const paintingData = new Float32Array(size[0] * size[1]).fill(0);
  const paintingTex = createR32FDataTexture(gl, size[0], size[1], paintingData);

  const brushDiameter = 32;
  const brushTex = await createBrushTexture(gl, brushDiameter, 0);
  const brushSpacing = brushDiameter / 4;
  const brushModel = mat4.create();
  function computeBrushModel(x = 0, y = 0) {
    const xCenter = (brushTex.width - 1) / 2;
    const yCenter = (brushTex.height - 1) / 2;
    mat4.fromTranslation(brushModel, [x - xCenter, y - yCenter, 0]);
    mat4.scale(brushModel, brushModel, [brushTex.width, brushTex.height, 1]);
    return brushModel;
  }

  const imageShader = createImageShaderProgram(gl);
  imageShader.use();
  imageShader.bindFramebuffer(null);
  gl.clear(gl.COLOR_BUFFER_BIT);
  imageShader.draw(paintingTex, paintingTex, null);

  let [x0, y0] = [NaN, NaN];
  let brushPointerId = -1;

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
    imageShader.bindFramebuffer(paintingTex);

    let x: number;
    let y: number;
    if (event.type === "pointerdown") {
      [x, y] = [x0, y0];
      imageShader.draw(brushTex, brushTex, computeBrushModel(x, y));
    } else {
      const dx = point[0] - x0;
      const dy = point[1] - y0;
      const distance = Math.hypot(dx, dy);
      const nDots = Math.floor(distance / brushSpacing);
      if (!nDots) return;
      const dt = brushSpacing / distance;
      [x, y] = [x0, y0];
      for (let i = 0; i < nDots; i++) {
        x += dx * dt;
        y += dy * dt;
        imageShader.draw(brushTex, brushTex, computeBrushModel(x, y));
      }
    }

    imageShader.bindFramebuffer(null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    imageShader.draw(paintingTex, paintingTex);

    [x0, y0] = point;
  };
  window.addEventListener("pointerdown", brush);
  window.addEventListener("pointermove", brush);
  window.addEventListener("pointerup", (event) => {
    if (brushPointerId === event.pointerId) brushPointerId = -1;
  });
  canvas.style.touchAction = "none";
});
