import { mat3, vec2 } from "gl-matrix";
import CheckerboardShader from "./CheckerboardShader";
import { createPrograms } from "./gl/program";
import ImageShader from "./ImageShader";
import {  capturePointer, getCanvasPointerInfo } from "./util";
import {
  ArrayBufferImage,
  createTexture,
  GLTextureInfo,
  TexImageSourceProp,
} from "./gl/texture";

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

const gl = canvas.getContext("webgl2") as WebGL2RenderingContext;
gl.clearColor(0.055, 0.055, 0.055, 1);
// 770 = gl.SRC_ALPHA, 771 = gl.ONE_MINUS_SRC_ALPHA, 1 = gl.ONE
gl.blendFuncSeparate(770, 771, 1, 771);
gl.enable(gl.BLEND);

const view = {
  xy: vec2.create(),
  scale: 1,
  matrix: mat3.identity(mat3.create()),
};

const image = createTexture(gl, { width: 512, height: 512 });

interface Layer extends GLTextureInfo {
  id: number;
  name: string;
}

const layers: Layer[] = [];

function addLayer(img: TexImageSourceProp | ArrayBufferImage) {
  const texture = createTexture(gl, img);
  const id = Math.max(0, ...layers.map((it) => it.id)) + 1;
  const name = `레이어 ${id}`;
  const layer: Layer = { ...texture, id, name };
  layers.push(layer);
  const layerItem = createLayerItem(layer);
  layerBox.querySelectorAll(".layer-item.selected").forEach((it) => {
    it.classList.remove("selected");
  });
  layerItem.classList.add("selected");
  layerBox.prepend(layerItem);
  return layer;
}

const getViewMatrix = (layer: { size: vec2 } = image) => {
  const imageSize = vec2.clone(layer.size);
  vec2.scale(imageSize, imageSize, view.scale);
  vec2.div(imageSize, imageSize, viewportSize);
  mat3.fromScaling(view.matrix, imageSize);

  const xy = vec2.clone(view.xy);
  vec2.div(xy, vec2.mul(xy, xy, [2, -2]), viewportSize);
  const translationMatrix = mat3.fromTranslation(mat3.create(), xy);
  mat3.mul(view.matrix, translationMatrix, view.matrix);
  return view.matrix;
};

const programs = createPrograms(gl, [CheckerboardShader, ImageShader]);
const checkerboard = programs[0];
const imageShader = programs[1];
const draw = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(checkerboard.program);
  gl.viewport(...viewport);
  const uViewMatrixLoc = checkerboard.uniformLocation.viewMatrix;
  gl.uniformMatrix3fv(uViewMatrixLoc, false, getViewMatrix());
  const size = [image.size[0] * view.scale, image.size[1] * view.scale];
  gl.uniform2fv(checkerboard.uniformLocation.srcSize, size);
  gl.drawArrays(checkerboard.mode, 0, checkerboard.arrayCount);

  const uSrcTextureLoc = imageShader.uniformLocation.srcTexture;
  const uViewMatrixLoc2 = imageShader.uniformLocation.viewMatrix;
  for (const layer of layers) {
    gl.useProgram(imageShader.program);
    gl.uniformMatrix3fv(uViewMatrixLoc2, false, getViewMatrix(layer));
    gl.uniform1i(uSrcTextureLoc, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layer.texture);
    gl.drawArrays(imageShader.mode, 0, imageShader.arrayCount);
  }
};

new ResizeObserver(() => {
  updateViewport();
  getViewMatrix();
  draw();
}).observe(document.body);

window.addEventListener("paste", async (e) => {
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
  addLayer({ src });
  vec2.zero(view.xy);
  view.scale = 1;
  getViewMatrix();
  draw();
});

function createHUDBox() {
  const box = document.createElement("div");
  box.className = "hud-box";
  box.tabIndex = 0;
  box.addEventListener("click", () => box.focus());
  return box;
}

const toolBox = createHUDBox();
toolBox.classList.add("tool-box");
document.body.append(toolBox);

function createMaterialIcon(icon: string) {
  const span = document.createElement("span");
  span.className = "material-symbols-outlined";
  span.textContent = icon;
  return span;
}

function createToolBoxItem(content: Node) {
  const item = document.createElement("label");
  item.className = "tool-item";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "tool-item";
  item.append(radio, content);
  return item;
}

toolBox.appendChild(createToolBoxItem(createMaterialIcon("open_with")));
toolBox.appendChild(createToolBoxItem(createMaterialIcon("select")));
toolBox.appendChild(createToolBoxItem(createMaterialIcon("brush")));
toolBox.appendChild(createToolBoxItem(createMaterialIcon("colors")));
toolBox.appendChild(createToolBoxItem(createMaterialIcon("filter_b_and_w")));
toolBox.querySelectorAll("input")[0].checked = true;

const layerBox = createHUDBox();
layerBox.classList.add("layer-box");
document.body.append(layerBox);

function createLayerItem(layer: Layer) {
  const item = document.createElement("div");
  item.className = "layer-item";
  item.addEventListener("click", (e) => {
    const ctrlKey = navigator.userAgent.includes("Mac") ? e.metaKey : e.ctrlKey;
    if (!ctrlKey) {
      const selectedItems = layerBox.querySelectorAll(".layer-item.selected");
      selectedItems.forEach((it) => it.classList.remove("selected"));
    }
    item.classList.add("selected");
  });
  const layerImage = document.createElement("canvas");
  layerImage.className = "layer-image";

  if (layer.data instanceof Uint8ClampedArray) {
    const imageData = new ImageData(layer.data, layer.size[0], layer.size[1]);
    const opts = { imageOrientation: "flipY" } as const;
    createImageBitmap(imageData, opts).then((bitmap) => {
      layerImage.width = layerImage.clientWidth;
      layerImage.height = layerImage.clientHeight;
      const isLandscape = imageData.width > imageData.height;
      const scale = isLandscape
        ? layerImage.width / imageData.width
        : layerImage.height / imageData.height;
      const w = scale * imageData.width;
      const h = scale * imageData.height;
      const x = isLandscape ? 0 : (layerImage.width - w) / 2;
      const y = !isLandscape ? 0 : (layerImage.height - h) / 2;
      const ctx = layerImage.getContext("2d");
      ctx?.drawImage(bitmap, x, y, w, h);
    });
  }

  item.appendChild(layerImage);

  const layerName = document.createElement("div");
  layerName.className = "layer-name";
  layerName.textContent = layer.name;
  item.appendChild(layerName);
  return item;
}

addLayer({ width: 512, height: 512 });

let activeHandler = "";
window.addEventListener("keydown", (e) => {
  const ctrlKey = navigator.userAgent.includes("Mac") ? e.metaKey : e.ctrlKey;
  if (ctrlKey && activeHandler === "grab") {
    activeHandler = "pinch";
  } else if (e.code === "Space") {
    activeHandler = ctrlKey ? "pinch" : "grab";
  }
});

window.addEventListener("keyup", (e) => {
  const ctrlKey = navigator.userAgent.includes("Mac") ? e.metaKey : e.ctrlKey;
  if (ctrlKey && activeHandler === "pinch") {
    activeHandler = "grab";
  } else if (e.code === "Space") {
    activeHandler = "";
  }
});

const scaleOrigin = vec2.create();
capturePointer(canvas, (e) => {
  const [, p1, dp] = getCanvasPointerInfo(canvas, e);
  if (e.type === "pointerdown") {
    if (e.target === canvas && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    vec2.sub(scaleOrigin, vec2.scale(scaleOrigin, viewportSize, 0.5), p1);
  }

  if (activeHandler === "grab") {
    vec2.add(view.xy, view.xy, dp);
    getViewMatrix();
    draw();
  } else if (activeHandler === "pinch") {
    const delta = (Math.sign(dp[0]) * vec2.len(dp)) / devicePixelRatio;
    const r = 1 + delta * 0.005;
    vec2.add(view.xy, view.xy, scaleOrigin);
    vec2.scale(view.xy, view.xy, r);
    vec2.sub(view.xy, view.xy, scaleOrigin);
    view.scale *= r;
    getViewMatrix();
    draw();
  }
});

// gl 관련 인터페이스로 만들고
// layer 관련 인터페이스로 만들고 (gl을 사용하는 메서드는 미포함)
// framebuffer 관련 인터페이스로 만들고 (gl을 사용하는 메서드는 미포함)
// gl 관련 동작(레이어 생성 등등) 수행하는 함수들은 모듈로 만들고
// GUI 관련 동작(레이어 아이템 생성 등등) 수행하는 함수들도 모듈로 만들고
