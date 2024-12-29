import { mat3, ReadonlyVec2, vec2, vec3 } from "gl-matrix";
import { createPrograms, GLProgramInfo } from "./gl/program";
import {
  BufferImage,
  ConcreteBufferImage,
  createTexture,
  getImageData,
  GLTextureInfo,
  TexImageSourceProp,
} from "./gl/texture";
import BrushShader from "./shader/BrushShader";
import CheckerboardShader from "./shader/CheckerboardShader";
import ImageShader from "./shader/ImageShader";
import { drawImageMatrix, Rect, Transform } from "./util";

export interface Layer extends GLTextureInfo, Rect {
  id: number;
  name: string;
  locked?: boolean;
}

export interface AppContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  viewport: Rect;
  view: Transform;
  destination: GLTextureInfo;
  drawing: GLTextureInfo;
  layers: Layer[];
  programs: GLProgramInfo[];
}

export function init(): AppContext {
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

  const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
  // 770 = gl.SRC_ALPHA, 771 = gl.ONE_MINUS_SRC_ALPHA, 1 = gl.ONE
  gl.blendFuncSeparate(770, 771, 1, 771);
  gl.enable(gl.BLEND);

  const context: AppContext = {
    canvas,
    gl,
    viewport: Rect(),
    view: Transform(),
    destination: createTexture(gl, { width: 512, height: 512 }),
    drawing: createTexture(gl, { width: 512, height: 512 }),
    layers: [],
    programs: createPrograms(gl, [
      CheckerboardShader,
      ImageShader,
      BrushShader,
    ]),
  };

  new ResizeObserver(() => {
    const { viewport } = context;
    const rect = document.body.getBoundingClientRect();
    viewport.size[0] = rect.width * devicePixelRatio;
    viewport.size[1] = rect.height * devicePixelRatio;
    viewport.xy[1] = canvas.height - viewport.size[1];
    draw(context);
  }).observe(document.body);

  return context;
}

export function addLayer(
  context: AppContext,
  img: TexImageSourceProp | BufferImage,
  name?: string,
) {
  const texture = createTexture(context.gl, img);
  const id = Math.max(-1, ...context.layers.map((it) => it.id)) + 1;
  name ??= `레이어 ${id}`;
  const layer: Layer = { ...texture, id, name, xy: [0, 0] };
  context.layers.push(layer);
  return layer;
}

export function getBufferImage<
  T extends ArrayBufferView<ArrayBufferLike> = ArrayBufferView<ArrayBufferLike>,
>(layer: GLTextureInfo<T>): ConcreteBufferImage<T> {
  return { data: layer.data, width: layer.size[0], height: layer.size[1] };
}

export function getImageBoundingRect(context: AppContext) {
  const { translation, scale } = context.view;
  const [width, height] = context.destination.size;
  return Rect(translation, [width * scale, height * scale]);
}

const mat3temp = mat3.create();

export function draw(context: AppContext) {
  const { gl, destination: imageTexture, viewport, programs } = context;
  const [checkerboardShader, imageShader] = programs;
  const rect = getImageBoundingRect(context);

  gl.bindFramebuffer(gl.FRAMEBUFFER, imageTexture.framebuffer);
  gl.viewport(0, 0, ...imageTexture.size);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const uSrcTextureLoc = imageShader.uniformLocation.srcTexture;
  const uTransformLoc = imageShader.uniformLocation.transform;
  for (const layer of context.layers) {
    gl.useProgram(imageShader.program);
    drawImageMatrix(mat3temp, layer, imageTexture);
    gl.uniformMatrix3fv(uTransformLoc, false, mat3temp);
    gl.uniform1i(uSrcTextureLoc, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layer.texture);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
  }

  const drawingRect = Rect([0, 0], context.drawing.size);
  const transform = drawImageMatrix(mat3temp, drawingRect, imageTexture);
  gl.uniformMatrix3fv(uTransformLoc, false, transform);
  gl.bindTexture(gl.TEXTURE_2D, context.drawing.texture);
  gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);

  drawImageMatrix(transform, rect, viewport);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(...viewport.xy, ...viewport.size);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const uCBTLoc = checkerboardShader.uniformLocation.transform;
  gl.useProgram(checkerboardShader.program);
  gl.viewport(...viewport.xy, ...viewport.size);
  gl.uniformMatrix3fv(uCBTLoc, false, transform);
  gl.uniform2fv(checkerboardShader.uniformLocation.srcSize, rect.size);
  gl.drawArrays(checkerboardShader.mode, 0, checkerboardShader.arrayCount);

  gl.useProgram(imageShader.program);
  gl.uniformMatrix3fv(uTransformLoc, false, transform);
  gl.uniform1i(uSrcTextureLoc, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture.texture);
  gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
}

export function getImageCopy(context: AppContext) {
  const { gl, destination: imageTexture } = context;
  const rect = Rect([0, 0], imageTexture.size);

  gl.bindFramebuffer(gl.FRAMEBUFFER, imageTexture.framebuffer);
  gl.viewport(...rect.xy, ...rect.size);
  gl.readPixels(
    0,
    0,
    rect.size[0],
    rect.size[1],
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    imageTexture.data,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return getImageData(imageTexture);
}

export async function getImageBlob(context: AppContext) {
  const opts = { imageOrientation: "flipY" } as const;
  const bitmap = await createImageBitmap(getImageCopy(context), opts);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve);
  });
  if (!blob) throw new Error("Blob is not created.");
  return blob;
}

export function toImageBoxCoord(
  context: AppContext,
  out: vec2,
  pointer: ReadonlyVec2,
) {
  vec2.scale(out, context.viewport.size, 0.5);
  vec2.add(out, out, context.view.translation);
  vec2.sub(out, pointer, out);
  vec2.scale(out, out, 1 / context.view.scale);
  return out;
}

export function toLayerCoord(
  out: vec2,
  imageCoord: ReadonlyVec2,
  layer: Layer,
) {
  vec2.scale(out, layer.size, 0.5);
  vec2.add(out, out, imageCoord);
  vec2.sub(out, out, layer.xy);
  return out;
}

// Draw brush
export function stepBrush(
  context: AppContext,
  imageCoord: vec2,
  color: vec3,
  size: number,
  hardness: number,
) {
  const { gl, drawing: drawingTexture } = context;
  const brushShader = context.programs[2];
  const rect = Rect(imageCoord, [size * 2, size * 2]);
  const transform = drawImageMatrix(mat3temp, rect, drawingTexture);

  gl.bindFramebuffer(gl.FRAMEBUFFER, drawingTexture.framebuffer);
  gl.viewport(0, 0, ...drawingTexture.size);
  gl.useProgram(brushShader.program);
  gl.uniform3fv(brushShader.uniformLocation.color, color);
  gl.uniform1f(brushShader.uniformLocation.hardness, hardness);
  gl.uniformMatrix3fv(brushShader.uniformLocation.transform, false, transform);
  gl.drawArrays(brushShader.mode, 0, brushShader.arrayCount);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
