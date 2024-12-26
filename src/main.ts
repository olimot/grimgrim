import { vec2 } from "gl-matrix";
import Checkerboard from "./checkerboard";
import { createPrograms } from "./gl/program";
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

type Viewport = [number, number, number, number];
function getViewport(): Viewport {
  const rect = document.body.getBoundingClientRect();
  const width = rect.width * devicePixelRatio;
  const height = rect.height * devicePixelRatio;
  const y = canvas.height - height;
  return [0, y, width, height];
}

const imageBox = [0, 0, 512, 512];

const gl = canvas.getContext("webgl2");
assert(gl instanceof WebGL2RenderingContext);
gl.clearColor(0.055, 0.055, 0.055, 1);

const programs = createPrograms(gl, [Checkerboard]);
const checkerboard = Checkerboard.setup(gl, programs[0]);
const draw = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(checkerboard.program);
  gl.viewport(
    viewport[0] + (viewport[2] - imageBox[2]) / 2 + imageBox[0],
    viewport[1] + (viewport[3] - imageBox[3]) / 2 - imageBox[1],
    imageBox[2],
    imageBox[3],
  );
  gl.uniform2fv(checkerboard.uniformLocation.viewportSize, imageBox.slice(2));
  checkerboard.draw();
};

let viewport = getViewport();
new ResizeObserver(() => {
  viewport = getViewport();
  draw();
}).observe(document.body);

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

capturePointer(canvas, (e) => {
  const dp = getCanvasPointerInfo(canvas, e)[2];
  if (activeHandler === "grab") {
    imageBox[0] += dp[0];
    imageBox[1] += dp[1];
    draw();
  } else if (activeHandler === "pinch") {
    const length = Math.sign(dp[0]) * vec2.len(dp);
    imageBox[0] -= length / 4;
    imageBox[1] -= length / 4;
    imageBox[2] += length;
    imageBox[3] += length;
    draw();
  }
});
