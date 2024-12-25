import { assert } from "./util";
import vertexShaderSource from "./shader/full.vert?raw";
import fragmentShaderSource from "./shader/checkerboard.frag?raw";
import { createPrograms } from "./gl/program";

export function setupCheckerboard(artboard: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.className = "checkerboard";
  artboard.appendChild(canvas);
  const rect = artboard.getBoundingClientRect();
  Object.assign(canvas, {
    width: rect.width * devicePixelRatio,
    height: rect.height * devicePixelRatio,
  });

  const gl = canvas.getContext("webgl2");
  assert(gl instanceof WebGL2RenderingContext);

  const [checkerboard] = createPrograms(gl, [
    {
      name: "Checkerboard Shader",
      vertexShaderSource,
      fragmentShaderSource,
    },
  ]);

  const uViewportLoc = gl.getUniformLocation(checkerboard.program, "viewport");
  const draw = () => {
    gl.useProgram(checkerboard.program);
    const viewport = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    gl.viewport(0, 0, viewport[0], viewport[1]);
    gl.uniform2fv(uViewportLoc, viewport);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let resizeTimerID = 0;
  new ResizeObserver(([entry]) => {
    clearTimeout(resizeTimerID);
    const [{ inlineSize, blockSize }] = entry.devicePixelContentBoxSize;
    const size = { width: inlineSize, height: blockSize };
    resizeTimerID = setTimeout(() => {
      Object.assign(canvas, size);
      draw();
    }, 150);
  }).observe(canvas, { box: "content-box" });

  return { canvas, gl, checkerboard, draw };
}
