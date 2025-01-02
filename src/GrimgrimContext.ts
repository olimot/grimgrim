import { mat3, ReadonlyVec2, vec2, vec3 } from "gl-matrix";
import { createPrograms, GLProgramInfo } from "./gl/program";
import { createTexture, getImageData, GLTextureInfo } from "./gl/texture";
import BrushShader from "./shader/BrushShader";
import CheckerboardShader from "./shader/CheckerboardShader";
import ImageShader from "./shader/ImageShader";
import { dpr, drawImageMatrix, hexColor, Rect, Transform } from "./util";

export interface Layer extends GLTextureInfo {
  id: number;
  name: string;
  locked?: boolean;
  viewSize?: [number, number];
}

const m3tmp = mat3.create();
const vec2temp = vec2.create();

export default class GrimgrimContext {
  readonly canvas: HTMLCanvasElement;
  readonly viewBox: Rect;
  readonly contentBox: Rect;
  readonly gl: WebGL2RenderingContext;
  readonly view = Transform();
  private readonly programs: GLProgramInfo[];
  private readonly drawing: GLTextureInfo;
  readonly content: GLTextureInfo;
  readonly selection: GLTextureInfo;
  readonly layers: Layer[] = [];
  readonly selectedLayers: Layer[] = [];
  activeLayer: Layer;
  readonly brush = { color: "#000000", size: "8", hardness: "50" };
  private brushXY = vec2.create();

  constructor(public readonly element: HTMLElement) {
    const canvas = document.createElement("canvas");
    canvas.width = screen.width * dpr;
    canvas.height = screen.height * dpr;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    canvas.style.transformOrigin = "left top";
    canvas.style.pointerEvents = "none";
    canvas.style.touchAction = "none";
    
    element.style.touchAction = "none";
    element.appendChild(canvas);

    const viewW = element.clientWidth * dpr;
    const viewH = element.clientHeight * dpr;
    this.viewBox = Rect([0, canvas.height - viewH], [viewW, viewH]);

    const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;

    // prettier-ignore
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    const fill = [255, 255, 255, 0];
    const initialContent = { width: 512, height: 512, fill };

    this.canvas = canvas;
    this.gl = gl;
    this.content = createTexture(gl, { ...initialContent, fill: void 0 });
    this.drawing = createTexture(gl, { ...initialContent, fill: void 0 });
    this.selection = createTexture(gl, { ...initialContent, fill: void 0 });
    this.programs = createPrograms(gl, [
      CheckerboardShader,
      ImageShader,
      BrushShader,
    ]);

    this.activeLayer = this.addLayer(createTexture(gl, initialContent));
    this.activeLayer.locked = true;
    this.selectedLayers = [this.activeLayer];

    this.contentBox = Rect([0, 0], this.content.size);
    this.view = Transform();
    this.resetView();
    this.render();

    new ResizeObserver(() => {
      const viewW = element.clientWidth * dpr;
      const viewH = element.clientHeight * dpr;
      vec2.set(this.viewBox.xy, 0, canvas.height - viewH);
      vec2.set(this.viewBox.size, viewW, viewH);
    }).observe(element);
  }

  updateView() {
    vec2.copy(this.contentBox.xy, this.view.translation);
    vec2.scale(this.contentBox.size, this.content.size, this.view.scale);
    this.render();
  }

  resetView() {
    vec2.sub(this.view.translation, this.viewBox.size, this.content.size);
    vec2.scale(this.view.translation, this.view.translation, 0.5);
    this.view.scale = 1;
    this.updateView();
  }

  render() {
    const { gl, content, layers } = this;
    const [checkerboardShader, imageShader] = this.programs;

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

      if (layer === this.activeLayer) {
        drawImageMatrix(m3tmp, this.drawing, content);
        gl.bindTexture(gl.TEXTURE_2D, this.drawing.texture);
        gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
        gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
      }
    }

    drawImageMatrix(m3tmp, this.contentBox, Rect([0, 0], this.viewBox.size));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(...this.viewBox.xy, ...this.viewBox.size);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const uTransformLoc2 = checkerboardShader.uniformLocation.transform;
    const uSrcSize = checkerboardShader.uniformLocation.srcSize;
    gl.useProgram(checkerboardShader.program);
    gl.uniformMatrix3fv(uTransformLoc2, false, m3tmp);
    gl.uniform2fv(uSrcSize, this.contentBox.size);
    gl.drawArrays(checkerboardShader.mode, 0, checkerboardShader.arrayCount);

    gl.useProgram(imageShader.program);
    gl.bindTexture(gl.TEXTURE_2D, content.texture);
    gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
  }

  addLayer(texture: GLTextureInfo, name?: string) {
    const id = Math.max(-1, ...this.layers.map((it) => it.id)) + 1;
    const layer = Object.assign(texture, { id, name: name ?? `레이어 ${id}` });
    this.layers.push(layer);
    this.activeLayer = layer;
    return layer;
  }

  deleteLayer(layer: Layer) {
    const index = this.layers.indexOf(layer);
    if (index === -1) return null;
    this.layers.splice(index, 1);
    return layer;
  }

  selectLayer(xy: vec2) {
    vec2.floor(xy, xy);
    const selected = this.layers.toReversed().find((layer) => {
      const [w, h] = layer.size;
      const [x, y] = vec2.floor(vec2temp, vec2.sub(vec2temp, xy, layer.xy));
      if (x < 0 || x >= w || y < 0 || y >= h) return false;
      const data = layer.data as Uint8ClampedArray;
      return data[((h - y) * w + x) * 4 + 3] > 0;
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
    const brushShader = this.programs[2];
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

  beginBrush(xy: ReadonlyVec2) {
    const color = hexColor(this.brush.color);
    const hardness = Number(this.brush.hardness) / 100;
    const size = Number(this.brush.size);
    this.stepBrush(vec2.copy(this.brushXY, xy), color, size, hardness);
    this.render();
  }

  strokeBrush(xy: ReadonlyVec2) {
    const color = hexColor(this.brush.color);
    const hardness = Number(this.brush.hardness) / 100;
    const size = Number(this.brush.size);
    if (!size) return;

    const spacing = size / 4;
    const dxy = vec2.sub(vec2.create(), xy, this.brushXY);
    const distance = vec2.len(dxy);

    const nDots = Math.floor(distance / spacing);
    if (!nDots) return;

    const dxydt = vec2.scale(dxy, dxy, spacing / distance);
    const { brushXY } = this;

    for (let i = 0; i < nDots; i++) {
      this.stepBrush(vec2.add(brushXY, brushXY, dxydt), color, size, hardness);
    }

    this.render();
  }

  endBrush() {
    const { gl } = this;

    this.mergeTextures(this.drawing, this.activeLayer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.drawing.framebuffer);
    gl.viewport(0, 0, ...this.drawing.size);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.render();
  }

  mergeTextures(src: GLTextureInfo, dst: GLTextureInfo) {
    const { gl } = this;
    const imageShader = this.programs[1];
    const uTransformLoc = imageShader.uniformLocation.transform;

    const xy = vec2.min([0, 0], dst.xy, src.xy);
    const srcBottomRight = vec2.add([0, 0], src.xy, src.size);
    const dstBottomRight = vec2.add([0, 0], dst.xy, dst.size);
    const bottomRight = vec2.max([0, 0], srcBottomRight, dstBottomRight);
    const [width, height] = vec2.sub(bottomRight, bottomRight, xy);
    const newImage = createTexture(gl, { width, height, xy });

    gl.bindFramebuffer(gl.FRAMEBUFFER, newImage.framebuffer);
    gl.viewport(0, 0, ...newImage.size);

    gl.useProgram(imageShader.program);
    gl.activeTexture(gl.TEXTURE0);

    drawImageMatrix(m3tmp, dst, newImage);
    gl.bindTexture(gl.TEXTURE_2D, dst.texture);
    gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);

    drawImageMatrix(m3tmp, this.drawing, newImage);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniformMatrix3fv(uTransformLoc, false, m3tmp);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);

    Object.assign(dst, newImage);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.framebuffer);
    gl.viewport(0, 0, dst.size[0], dst.size[1]);
    gl.readPixels(0, 0, ...dst.size, gl.RGBA, gl.UNSIGNED_BYTE, dst.data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return dst;
  }

  resizeTexture(src: GLTextureInfo, size: ReadonlyVec2) {
    const { gl } = this;
    const imageShader = this.programs[1];
    const uTransformLoc = imageShader.uniformLocation.transform;

    const newImage = createTexture(gl, { width: size[0], height: size[1] });

    gl.bindFramebuffer(gl.FRAMEBUFFER, newImage.framebuffer);
    gl.viewport(0, 0, ...newImage.size);

    gl.useProgram(imageShader.program);
    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniformMatrix3fv(uTransformLoc, false, mat3.identity(m3tmp));
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    vec2.copy(newImage.xy, src.xy);
    Object.assign(src, newImage);

    gl.bindFramebuffer(gl.FRAMEBUFFER, src.framebuffer);
    gl.viewport(0, 0, src.size[0], src.size[1]);
    gl.readPixels(0, 0, ...src.size, gl.RGBA, gl.UNSIGNED_BYTE, src.data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return src;
  }

  resizeLayer(layer: Layer, size: ReadonlyVec2) {
    this.resizeTexture(layer, size);
    this.render();
  }

  resizeContent(size: ReadonlyVec2) {
    const scale = vec2.div([1, 1], size, this.content.size);
    console.log(scale);
    const sizeTemp = vec2.create();
    for (const layer of this.layers) {
      this.resizeTexture(layer, vec2.mul(sizeTemp, layer.size, scale));
    }
    this.expandContent(size);
    this.resetView();
    this.render();
  }

  expandContent(size: ReadonlyVec2) {
    const empty = { width: size[0], height: size[1] };
    Object.assign(this.content, createTexture(this.gl, empty));
    Object.assign(this.drawing, createTexture(this.gl, empty));
    Object.assign(this.selection, createTexture(this.gl, empty));
    this.resetView();
    this.render();
  }

  toViewBoxCoord(xy: ReadonlyVec2, out = vec2.create()) {
    vec2.scale(out, xy, this.view.scale);
    vec2.add(out, out, this.view.translation);
    return out;
  }

  toCSSRect(rect: Rect & { viewSize?: [number, number] }, out = Rect()) {
    vec2.scale(out.size, rect.viewSize ?? rect.size, this.view.scale);
    vec2.scale(out.xy, rect.xy, this.view.scale);
    vec2.add(out.xy, out.xy, this.view.translation);
    vec2.scale(out.xy, out.xy, 1 / dpr);
    vec2.scale(out.size, out.size, 1 / dpr);
    return out;
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
