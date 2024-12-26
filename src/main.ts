import Checkerboard from "./checkerboard";
import { createPrograms } from "./gl/program";
import { assert, getCanvasPointerInfo } from "./util";

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

const gl = canvas.getContext("webgl2");
assert(gl instanceof WebGL2RenderingContext);
const programs = createPrograms(gl, [Checkerboard]);
const checkerboard = Checkerboard.setup(gl, programs[0]);
const imageBox = [0, 0, 512, 512];
let viewport = getViewport();
new ResizeObserver(() => {
  viewport = getViewport();

  const imageViewport: Viewport = [
    (viewport[2] - imageBox[2]) / 2 + imageBox[0],
    viewport[1] + (viewport[3] - imageBox[3]) / 2 - imageBox[1],
    imageBox[2],
    imageBox[3],
  ];
  gl.useProgram(checkerboard.program);
  gl.viewport(...imageViewport);
  gl.uniform2fv(checkerboard.uniformLocation.viewportSize, imageBox.slice(2));
  checkerboard.draw();
}).observe(document.body);

window.addEventListener("pointermove", (e) => {
  const [p0, p1, dev] = getCanvasPointerInfo(canvas, e);
  console.log([...p0], [...p1], [...dev]);
});
