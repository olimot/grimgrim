import { mat3, ReadonlyVec2, vec2, vec3 } from "gl-matrix";
import { createPrograms, GLProgramInfo } from "./gl/program";
import {
  BufferImage,
  createTexture,
  getImageData,
  GLTextureInfo,
  TexImageSourceProp,
} from "./gl/texture";
import BrushShader from "./shader/BrushShader";
import ImageShader from "./shader/ImageShader";
import {
  dpr,
  drawImageMatrix,
  getCenterAlignXY,
  hexColor,
  Rect,
  scaleFromOrigin,
  toCSSTransform,
  Transform,
} from "./util";
import { init as initCheckerboard } from "./checkerboard";

export interface Layer extends GLTextureInfo, Rect {
  id: number;
  name: string;
  locked?: boolean;
}

const m3tmp = mat3.create();
const vec2temp = vec2.create();

export default class GrimgrimContext {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  readonly view = Transform();
  private readonly checkerboard: HTMLCanvasElement;
  private readonly programs: GLProgramInfo[];
  private readonly drawing: GLTextureInfo;
  readonly destination: GLTextureInfo;
  readonly content: GLTextureInfo;
  readonly layers: Layer[] = [];
  readonly selectedLayers: Layer[] = [];
  activeLayer: Layer;
  color = "#000000";
  size = "32";
  hardness = "50";

  constructor(public readonly element: HTMLElement) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    canvas.style.transformOrigin = "left top";
    canvas.style.pointerEvents = "none";

    const checkerboard = document.createElement("canvas");
    checkerboard.width = canvas.width;
    checkerboard.height = canvas.height;
    checkerboard.style.position = "absolute";
    checkerboard.style.top = "0px";
    checkerboard.style.left = "0px";
    checkerboard.style.width = `${checkerboard.width / dpr}px`;
    checkerboard.style.height = `${checkerboard.height / dpr}px`;
    checkerboard.style.transformOrigin = "left top";
    checkerboard.style.pointerEvents = "none";
    checkerboard.style.zIndex = "-1";
    initCheckerboard(checkerboard, 16);

    element.appendChild(canvas);
    element.appendChild(checkerboard);

    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
    // 770 = gl.SRC_ALPHA, 771 = gl.ONE_MINUS_SRC_ALPHA, 1 = gl.ONE
    gl.blendFuncSeparate(770, 771, 1, 771);
    gl.enable(gl.BLEND);

    this.canvas = canvas;
    this.checkerboard = checkerboard;
    this.gl = gl;
    this.destination = createTexture(gl, canvas);
    this.content = createTexture(gl, canvas);
    this.drawing = createTexture(gl, canvas);
    this.programs = createPrograms(gl, [BrushShader, ImageShader]);

    const fill = [255, 255, 255];
    const empty = { width: canvas.width, height: canvas.height, fill };
    this.activeLayer = this.addLayer(empty);
    this.activeLayer.locked = true;
    this.selectedLayers = [this.activeLayer];

    this.view = Transform();
    vec2.copy(this.view.translation, getCenterAlignXY(canvas));
    canvas.style.transform = toCSSTransform(this.view);
    checkerboard.style.transform = toCSSTransform(this.view);

    this.render();
  }

  applyViewToTransform() {
    this.canvas.style.transform = toCSSTransform(this.view);
    this.checkerboard.style.transform = toCSSTransform(this.view);
  }

  resetView() {
    vec2.copy(this.view.translation, getCenterAlignXY(this.canvas));
    this.applyViewToTransform();
  }

  translateView(delta: ReadonlyVec2) {
    vec2.add(this.view.translation, this.view.translation, delta);
    this.applyViewToTransform();
  }

  scaleView(origin: ReadonlyVec2, r: number) {
    scaleFromOrigin(this.view.translation, this.view.translation, r, origin);
    this.view.scale *= r;
    this.applyViewToTransform();
  }

  render() {
    const { gl, destination, content, layers } = this;
    const imageShader = this.programs[1];

    gl.bindFramebuffer(gl.FRAMEBUFFER, content.framebuffer);
    gl.viewport(0, 0, ...content.size);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(imageShader.program);
    gl.activeTexture(gl.TEXTURE0);

    const uTransformLoc = imageShader.uniformLocation.transform;
    for (const layer of layers) {
      drawImageMatrix(m3tmp, layer, content);
      gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
      gl.bindTexture(gl.TEXTURE_2D, layer.texture);
      gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
    }

    drawImageMatrix(m3tmp, Rect([0, 0], content.size), destination);

    gl.bindTexture(gl.TEXTURE_2D, this.drawing.texture);
    gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, ...destination.size);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, content.texture);
    gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
  }

  addLayer(img: TexImageSourceProp | BufferImage, name?: string) {
    const texture = createTexture(this.gl, img);
    console.log(texture.data);
    const id = Math.max(-1, ...this.layers.map((it) => it.id)) + 1;
    name ??= `레이어 ${id}`;
    const layer: Layer = { ...texture, id, name, xy: [0, 0] };
    this.layers.push(layer);
    this.activeLayer = layer;
    return layer;
  }

  selectLayer(xy: vec2) {
    vec2.floor(xy, xy);
    const selected = this.layers.toReversed().find((layer) => {
      const coord = vec2.sub(vec2temp, xy, layer.xy);
      vec2.floor(coord, coord);
      if (coord[0] < 0 || coord[0] >= layer.size[0] - 1) return false;
      if (coord[1] < 0 || coord[1] >= layer.size[1] - 1) return false;
      const idx = ((layer.size[1] - coord[1]) * layer.size[0] + coord[0]) * 4;
      const found = (layer.data as Uint8ClampedArray)[idx + 3] > 0;
      return found;
    });
    if (selected) {
      this.activeLayer = selected;
      this.selectedLayers.splice(0, Infinity, this.activeLayer);
    }
  }

  moveLayer(delta: vec2) {
    if (this.activeLayer.locked) return;
    vec2.add(this.activeLayer.xy, this.activeLayer.xy, delta);
    this.render();
  }

  stepBrush(point: ReadonlyVec2, color: vec3, size: number, hardness: number) {
    const { gl, drawing } = this;
    const [brushShader] = this.programs;
    const rect = Rect(point, [size * 2, size * 2]);
    vec2.sub(rect.xy, rect.xy, [size, size]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, drawing.framebuffer);
    gl.viewport(0, 0, ...drawing.size);
    gl.useProgram(brushShader.program);
    gl.uniform3fv(brushShader.uniformLocation.color, color);
    gl.uniform1f(brushShader.uniformLocation.hardness, hardness);
    drawImageMatrix(m3tmp, rect, drawing);
    gl.uniformMatrix3fv(brushShader.uniformLocation.transform, false, m3tmp);
    gl.drawArrays(brushShader.mode, 0, brushShader.arrayCount);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private brushXY = vec2.create();

  beginBrush(xy: ReadonlyVec2) {
    const color = hexColor(this.color);
    const hardness = Number(this.hardness) / 100;
    const size = Number(this.size);

    this.stepBrush(xy, color, size, hardness);
    this.render();
    vec2.copy(this.brushXY, xy);
  }

  strokeBrush(xy: ReadonlyVec2) {
    const color = hexColor(this.color);
    const hardness = Number(this.hardness) / 100;
    const size = Number(this.size);

    const spacing = size / 4;
    const dxy = vec2.sub(vec2.create(), xy, this.brushXY);
    const distance = vec2.len(dxy);
    const nDots = Math.floor(distance / spacing);
    if (!nDots) return;

    const dxydt = vec2.scale(dxy, dxy, spacing / distance);
    const step = this.brushXY;
    for (let i = 0; i < nDots; i++) {
      this.stepBrush(vec2.add(step, step, dxydt), color, size, hardness);
    }

    this.render();
  }

  endBrush() {
    const { gl, drawing } = this;
    const imageShader = this.programs[1];
    const uTransformLoc = imageShader.uniformLocation.transform;
    const [x, y] = this.activeLayer.xy;
    drawImageMatrix(m3tmp, Rect([-x, -y], drawing.size), this.activeLayer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.activeLayer.framebuffer);

    gl.viewport(0, 0, ...this.activeLayer.size);

    gl.useProgram(imageShader.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, drawing.texture);
    gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawing.framebuffer);
    gl.viewport(0, 0, ...this.drawing.size);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.render();
  }

  getImageData() {
    const { gl, content } = this;
    const { xy, size } = Rect([0, 0], content.size);

    gl.bindFramebuffer(gl.FRAMEBUFFER, content.framebuffer);
    gl.viewport(...xy, ...size);
    gl.readPixels(...xy, ...size, gl.RGBA, gl.UNSIGNED_BYTE, content.data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return getImageData(content);
  }

  async getBlob() {
    const opts = { imageOrientation: "flipY" } as const;
    const bitmap = await createImageBitmap(this.getImageData(), opts);
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
}
