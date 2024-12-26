import { mat3, vec2 } from "gl-matrix";
import Checkerboard from "./checkerboard";
import { createPrograms } from "./gl/program";
import ImageShader from "./ImageShader";
import { assert, capturePointer, getCanvasPointerInfo } from "./util";

document.documentElement.style.height = "100%";
document.body.style.margin = "0";
document.body.style.height = "100%";
document.body.style.overflow = "hidden";

const canvas = document.createElement("canvas");
canvas.id = "main-canvas";
canvas.width = screen.width * devicePixelRatio;
canvas.height = screen.height * devicePixelRatio;
canvas.style.width = `${screen.width}px`;
canvas.style.height = `${screen.height}px`;
document.body.appendChild(canvas);

const viewportMemory = new Float32Array(4);
function updateViewport() {
  const rect = document.body.getBoundingClientRect();
  viewportMemory[2] = rect.width * devicePixelRatio;
  viewportMemory[3] = rect.height * devicePixelRatio;
  viewportMemory[1] = canvas.height - viewportMemory[3];
}
type Viewport = [number, number, number, number];
const viewport = viewportMemory as unknown as Viewport;
const viewportSize: vec2 = viewportMemory.subarray(2);

const gl = canvas.getContext("webgl2");
assert(gl instanceof WebGL2RenderingContext);
gl.clearColor(0.055, 0.055, 0.055, 1);

const control = { xy: vec2.create(), scale: 1 };
const image = {
  src: null as TexImageSource | ArrayBufferView<ArrayBufferLike> | null,
  texture: gl.createTexture()!,
  model: mat3.identity(mat3.create()),
  width: 512,
  height: 512,
};

const updateModel = () => {
  const translateMatrix = mat3.fromTranslation(image.model, [
    (2 * control.xy[0]) / viewportSize[0],
    (-2 * control.xy[1]) / viewportSize[1],
  ]);
  const scaleMatrix = mat3.fromScaling(mat3.create(), [
    (control.scale * image.width) / viewportSize[0],
    (control.scale * image.height) / viewportSize[1],
  ]);
  mat3.mul(image.model, translateMatrix, scaleMatrix);
};

gl.bindTexture(gl.TEXTURE_2D, image.texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const programs = createPrograms(gl, [Checkerboard, ImageShader]);
const checkerboard = Checkerboard.setup(gl, programs[0]);
const imageShader = ImageShader.setup(gl, programs[1]);
const draw = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(checkerboard.program);
  gl.viewport(...viewport);
  gl.uniformMatrix3fv(checkerboard.uniformLocation.model, false, image.model);
  const size = [image.width, image.height];
  gl.uniform2fv(checkerboard.uniformLocation.srcSize, size);
  checkerboard.draw();

  if (image.src) {
    gl.useProgram(imageShader.program);
    gl.uniform1i(imageShader.uniformLocation.srcTexture, 0);
    gl.uniformMatrix3fv(imageShader.uniformLocation.model, false, image.model);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, image.texture);
    imageShader.draw();
  }
};

new ResizeObserver(() => {
  updateViewport();
  updateModel();
  draw();
}).observe(document.body);

window.addEventListener("paste", async (e) => {
  console.log("Paste event occured");
  e.preventDefault();
  e.stopPropagation();
  if (!e.clipboardData) return;
  const { items } = e.clipboardData;
  let file: File | null = null;
  for (const item of items) {
    if (["image/png", "image/jpeg"].includes(item.type)) {
      file = item.getAsFile();
      break;
    }
  }
  if (!file) return;
  const src = await createImageBitmap(file, { imageOrientation: "flipY" });
  Object.assign(image, { width: src.width, height: src.height, src });
  gl.bindTexture(gl.TEXTURE_2D, image.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  vec2.zero(control.xy);
  control.scale = 1;
  updateModel();
  draw();
});

let activeHandler = "";
window.addEventListener("keydown", (e) => {
  if (e.code.startsWith("Control") && activeHandler === "grab") {
    activeHandler = "pinch";
  } else if (e.code === "Space") {
    activeHandler = e.ctrlKey ? "pinch" : "grab";
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code.startsWith("Control") && activeHandler === "pinch") {
    activeHandler = "grab";
  } else if (e.code === "Space") {
    activeHandler = "";
  }
});

const scaleOrigin = vec2.create();
capturePointer(canvas, (e) => {
  const [, p1, dp] = getCanvasPointerInfo(canvas, e);
  if (e.type === "pointerdown") {
    vec2.sub(scaleOrigin, vec2.scale(scaleOrigin, viewportSize, 0.5), p1);
  }

  if (activeHandler === "grab") {
    vec2.add(control.xy, control.xy, dp);
    updateModel();
    draw();
  } else if (activeHandler === "pinch") {
    const delta = (Math.sign(dp[0]) * vec2.len(dp)) / devicePixelRatio;
    const r = 1 + delta * 0.005;
    vec2.add(control.xy, control.xy, scaleOrigin);
    vec2.scale(control.xy, control.xy, r);
    vec2.sub(control.xy, control.xy, scaleOrigin);
    control.scale *= r;
    updateModel();
    draw();
  }
});
