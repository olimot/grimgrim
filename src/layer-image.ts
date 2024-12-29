import { mat3, vec2 } from "gl-matrix";
import { AppContext, Layer, getBufferImage } from "./app";
import { createPrograms } from "./gl/program";
import { createTexture, texImage } from "./gl/texture";
import CheckerboardShader from "./shader/CheckerboardShader";
import ImageShader from "./shader/ImageShader";
import { drawImageMatrix, Rect } from "./util";

export function init(canvas: HTMLCanvasElement, appContext: AppContext) {
  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
  // 770 = gl.SRC_ALPHA, 771 = gl.ONE_MINUS_SRC_ALPHA, 1 = gl.ONE
  gl.blendFuncSeparate(770, 771, 1, 771);
  gl.enable(gl.BLEND);

  const res = 64;
  const base = appContext.destination;
  const isLandscape = base.size[0] > base.size[1];
  const scale = isLandscape ? res / base.size[0] : res / base.size[1];
  canvas.width = scale * base.size[0];
  canvas.height = scale * base.size[1];

  const context = {
    canvas,
    gl,
    scale,
    imageTexture: createTexture(gl, canvas),
    programs: createPrograms(gl, [CheckerboardShader, ImageShader]),
    viewport: Rect([0, 0], [canvas.width, canvas.height]),
  };

  return context;
}

const transform = mat3.create();

export function draw(context: ReturnType<typeof init>, layer: Layer) {
  const { gl, programs, imageTexture, viewport, scale } = context;
  const [checkerboardShader, imageShader] = programs;
  const layerRect = Rect(layer.xy, layer.size);

  vec2.scale(layerRect.xy, layerRect.xy, scale);
  vec2.scale(layerRect.size, layerRect.size, scale);

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const uCBTLoc = checkerboardShader.uniformLocation.transform;
  gl.useProgram(checkerboardShader.program);
  drawImageMatrix(transform, viewport, viewport);
  gl.uniformMatrix3fv(uCBTLoc, false, transform);
  gl.uniform1f(checkerboardShader.uniformLocation.checkerSize, 8);
  gl.uniform2fv(checkerboardShader.uniformLocation.srcSize, viewport.size);
  gl.drawArrays(checkerboardShader.mode, 0, checkerboardShader.arrayCount);

  const uSrcTextureLoc = imageShader.uniformLocation.srcTexture;
  const uTransformLoc = imageShader.uniformLocation.transform;
  gl.useProgram(imageShader.program);
  drawImageMatrix(transform, layerRect, viewport);
  gl.uniformMatrix3fv(uTransformLoc, false, transform);
  gl.uniform1i(uSrcTextureLoc, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture.texture);
  texImage(imageTexture, getBufferImage(layer));
  gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
}
