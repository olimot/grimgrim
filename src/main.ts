import { mat4 } from "gl-matrix";
import { createBrushTexture } from "./brush-texture";
import { createImageShaderProgram, createR8DataTexture } from "./image-shader";

function assert(condition: boolean, ...args: unknown[]): asserts condition {
  console.assert(condition, ...args);
  if (!condition) throw new Error("Assertion failed.");
}

window.addEventListener("load", async () => {
  const canvas = document.querySelector("#grimgrim1 .grimgrim-canvas");
  assert(canvas instanceof HTMLCanvasElement);
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
  assert(gl instanceof WebGL2RenderingContext);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_float_blend");

  const paintingData = new Uint8Array(size[0] * size[1]).fill(0);
  const paintingTex = createR8DataTexture(gl, size[0], size[1], paintingData);

  const brushDiameter = 8;
  const brushTex = createBrushTexture(gl, brushDiameter, 0);
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
  imageShader.draw(paintingTex);

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

    let x: number;
    let y: number;
    if (event.type === "pointerdown") {
      [x, y] = point;
      imageShader.bindFramebuffer(paintingTex);
      imageShader.draw(brushTex, brushTex, computeBrushModel(x, y));
    } else {
      const [dx, dy] = [point[0] - x0, point[1] - y0];
      const distance = Math.hypot(dx, dy);
      const nDots = Math.floor(distance / brushSpacing);
      if (!nDots) return;
      const dt = brushSpacing / distance;
      [x, y] = [x0, y0];
      imageShader.bindFramebuffer(paintingTex);
      for (let i = 0; i < nDots; i++) {
        x += dx * dt;
        y += dy * dt;
        imageShader.draw(brushTex, brushTex, computeBrushModel(x, y));
      }
    }

    imageShader.bindFramebuffer(null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    imageShader.draw(paintingTex);

    [x0, y0] = [x, y];
  };
  window.addEventListener("pointerdown", brush);
  window.addEventListener("pointermove", brush);
  window.addEventListener("pointerup", (event) => {
    if (brushPointerId === event.pointerId) brushPointerId = -1;
  });
  canvas.style.touchAction = "none";
});
