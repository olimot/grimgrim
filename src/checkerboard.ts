import { createPrograms } from "./gl/program";
import CheckerboardShader from "./shader/CheckerboardShader";
import { dpr, Rect } from "./util";

export function init(canvas: HTMLCanvasElement, checkerSize: number) {
  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
  // 770 = gl.SRC_ALPHA, 771 = gl.ONE_MINUS_SRC_ALPHA, 1 = gl.ONE
  gl.blendFuncSeparate(770, 771, 1, 771);
  gl.enable(gl.BLEND);

  const context = {
    canvas,
    gl,
    program: createPrograms(gl, [CheckerboardShader])[0],
    viewport: Rect([0, 0], [canvas.width, canvas.height]),
    checkerSize,
  };

  new MutationObserver((mutationList) => {
    for (const { attributeName } of mutationList) {
      if (attributeName === "width" || attributeName === "height") {
        canvas.style.width = `${canvas.width / dpr}px`;
        canvas.style.height = `${canvas.height / dpr}px`;
        draw(context);
        break;
      }
    }
  }).observe(canvas, { attributes: true });

  draw(context);
  return context;
}

function draw(context: ReturnType<typeof init>) {
  const { gl, viewport, checkerSize } = context;
  const checkerboardShader = context.program;

  gl.viewport(...viewport.xy, ...viewport.size);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(checkerboardShader.program);
  gl.uniform1f(checkerboardShader.uniformLocation.checkerSize, checkerSize);
  gl.uniform2fv(checkerboardShader.uniformLocation.srcSize, viewport.size);
  gl.drawArrays(checkerboardShader.mode, 0, checkerboardShader.arrayCount);
}
