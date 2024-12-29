import { vec2 } from "gl-matrix";
import {
  addLayer,
  draw as drawMainCanvas,
  getImageBlob,
  init as initMainCanvas,
  Layer,
  stepBrush,
  toImageBoxCoord,
  toLayerCoord,
} from "./app";
import { draw as drawLayerImage, init as initLayerImage } from "./layer-image";
import {
  getCanvasPointerInfo,
  getClipboardImageBitmap,
  hexColor,
  resetTransform,
} from "./util";
import { commandKey, manageKeyboard } from "./keyboard";
import { managePointer } from "./pointer";

let activeHandler = "";

const context = initMainCanvas();

function createHUDBox() {
  const box = document.createElement("div");
  box.className = "hud-box";
  box.tabIndex = 0;
  box.addEventListener("click", () => box.focus());
  return box;
}

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
  if (content.textContent) radio.value = content.textContent;
  item.append(radio, content);
  return item;
}

function clearLayerSelection(layerBox: HTMLElement) {
  const selectedItems = layerBox.querySelectorAll(".layer-item.selected");
  selectedItems.forEach((it) => it.classList.remove("selected"));
}

function addLayerItem(layerBox: HTMLElement, layer: Layer) {
  const layerItem = document.createElement("div");
  layerItem.className = "layer-item selected";
  layerItem.dataset.id = `${layer.id}`;

  const layerImage = document.createElement("canvas");
  layerImage.className = "layer-image";
  const layerImageContext = initLayerImage(layerImage, context);
  drawLayerImage(layerImageContext, layer);

  layerItem.appendChild(layerImage);

  const layerName = document.createElement("div");
  layerName.className = "layer-name";
  layerName.textContent = layer.name;
  layerItem.appendChild(layerName);

  layerItem.addEventListener("click", (e) => {
    if (!e[commandKey]) clearLayerSelection(layerBox);
    layerItem.classList.add("selected");
    activeLayer = layer;
  });
  clearLayerSelection(layerBox);
  layerBox.prepend(layerItem);
  return layerItem;
}

function initUI() {
  const toolBox = createHUDBox();
  toolBox.classList.add("tool-box");
  document.body.append(toolBox);
  toolBox.appendChild(createToolBoxItem(createMaterialIcon("drag_pan")));
  toolBox.appendChild(createToolBoxItem(createMaterialIcon("select")));
  toolBox.appendChild(createToolBoxItem(createMaterialIcon("brush")));
  toolBox.appendChild(createToolBoxItem(createMaterialIcon("filter_b_and_w")));
  toolBox.querySelectorAll("input")[2].checked = true;

  const layerBox = createHUDBox();
  layerBox.classList.add("layer-box");
  document.body.append(layerBox);

  return { toolbar, layerBox };
}

const vec2temp = vec2.create();
const vec2temp2 = vec2.create();
function doMove(event: PointerEvent, p1: vec2, dp: vec2) {
  if (event.type === "pointerdown") {
    const xy = toImageBoxCoord(context, vec2temp, p1);
    vec2.floor(xy, xy);
    const selected = context.layers.toReversed().find((layer) => {
      const coord = toLayerCoord(vec2temp2, xy, layer);
      vec2.floor(coord, coord);
      if (coord[0] < 0 || coord[0] >= layer.size[0] - 1) return false;
      if (coord[1] < 0 || coord[1] >= layer.size[1] - 1) return false;
      const pixelOffset = (coord[0] * layer.size[0] + coord[1]) * 4;
      return (layer.data as Uint8ClampedArray)[pixelOffset + 3] > 0;
    });
    if (selected) {
      activeLayer = selected;
      clearLayerSelection(ui.layerBox);
      const query = `.layer-item[data-id="${selected.id}"]`;
      document.querySelector(query)?.classList.add("selected");
    }
  }

  if (activeLayer.locked) return;
  const movement = vec2.scale(vec2temp, dp, 1 / context.view.scale);
  vec2.add(activeLayer.xy, activeLayer.xy, movement);
  drawMainCanvas(context);
}

const colorText = "#000000";
const color = hexColor(colorText);
const sizeText = "4";

const hardnessText = "50";
const hardness = Number(hardnessText) / 100;

const xy0: [number, number] = [0, 0];
function doBrush(event: PointerEvent, p1: vec2) {
  let size = Number(sizeText);
  size = event.pressure * size;
  const spacing = size / 4;
  const xy = toImageBoxCoord(context, vec2temp, p1);
  if (event.type === "pointerdown") {
    if (event.ctrlKey) return;
    stepBrush(context, xy, color, size, hardness);
  } else {
    if (!size) return;
    const dxy: vec2 = [xy[0] - xy0[0], xy[1] - xy0[1]];
    const distance = vec2.len(dxy);
    const nDots = Math.floor(distance / spacing);
    if (!nDots) return;
    const dxydt = vec2.scale(dxy, dxy, spacing / distance);
    vec2.copy(xy, xy0);
    for (let i = 0; i < nDots; i++) {
      stepBrush(context, vec2.add(xy, xy, dxydt), color, size, hardness);
    }
  }
  drawMainCanvas(context);
  vec2.copy(xy0, xy);
}

const ui = initUI();

const emptyImg = { fill: [255, 255, 255], width: 512, height: 512 };
const backgroundLayer = addLayer(context, emptyImg);
backgroundLayer.name = "배경";
backgroundLayer.locked = true;
addLayerItem(ui.layerBox, backgroundLayer);
let activeLayer = context.layers[0];

resetTransform(context.view);
drawMainCanvas(context);

window.addEventListener("paste", async (event) => {
  event.preventDefault();
  event.stopPropagation();
  const src = await getClipboardImageBitmap(event);
  if (!src) return;
  addLayerItem(ui.layerBox, addLayer(context, { src }));
  resetTransform(context.view);
  drawMainCanvas(context);
});

const pressed = manageKeyboard((e) => {
  const ctrl = e[commandKey];
  if (pressed.has("Space")) activeHandler = ctrl ? "pinch" : "grab";
  else activeHandler = "";

  if (e.type === "keydown") {
    if (ctrl && (pressed.has("Numpad0") || pressed.has("Digit0"))) {
      e.preventDefault();
      resetTransform(context.view);
      drawMainCanvas(context);
    } else if (ctrl && e.shiftKey && pressed.has("KeyS")) {
      e.preventDefault();
      getImageBlob(context).then((blob) => {
        pressed.clear();
        window.open(URL.createObjectURL(blob), "_blank");
      });
    } else if (ctrl && pressed.has("KeyS")) {
      e.preventDefault();
      getImageBlob(context).then((blob) => {
        navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      });
    } else {
      console.log(e.code);
    }
  }
});

const pointerStart = vec2.create();
managePointer(context.canvas, (e) => {
  const pointerInfo = getCanvasPointerInfo(context.canvas, e);
  const [, p1, dp] = pointerInfo;
  if (e.type === "pointerdown") {
    if (e.target === context.canvas) {
      (document.activeElement as HTMLElement).blur();
    }
    vec2.scale(pointerStart, context.viewport.size, 0.5);
    vec2.sub(pointerStart, pointerStart, p1);
  }

  const { view } = context;
  if (activeHandler === "grab") {
    vec2.add(view.translation, view.translation, dp);
    drawMainCanvas(context);
  } else if (activeHandler === "pinch") {
    const r = 1 + (dp[0] / devicePixelRatio) * 0.005;
    vec2.add(view.translation, view.translation, pointerStart);
    vec2.scale(view.translation, view.translation, r);
    vec2.sub(view.translation, view.translation, pointerStart);
    view.scale *= r;
    drawMainCanvas(context);
  } else {
    const query = 'input[name="tool-item"]:checked';
    const tool = document.querySelector<HTMLInputElement>(query)?.value ?? "";
    switch (tool) {
      case "drag_pan":
        doMove(e, p1, dp);
        break;
      case "brush":
        doBrush(e, p1);
        break;
    }
  }
});

// **설정 창 만들기:**
//
// - 크기, 위치 관련 설정 창
//   - 캔버스 크기, 이미지 크기 변경0
//   - 드래그로 레이어 이미지 크기 변경
// - 레이어 아이템 드래그로 순서 변경
// - 브러시 설정 창

// MainGLSystem하고 DOMSystem하고 LayerImageGLSysetm 같이 만들어서, app 의
// 경우는 지금 AppContext에 있는 값들을 component로 가질 거고 layer 의 경우는
// 레이어 텍스쳐와 썸네일(레이어 이미지) 텍스쳐를 가질 거고 그러지 않을까?

// 근데, 같은 시스템이더라도 하는 일이 다 같지는 않은데 예를 들어 레이어
// 엔티티하고 앱 엔티티가 MainGLSystem 내에서 서로 다른 동작을 수행 할텐데...

// 일단, Main Canvas WebGL 내 Texture 객체 WeakMap에 저장, DOM 관련 WeakMap에
// 저장은 맞아 보이는데? Layer 객체의 Texture를 찾고 싶으면 MainCanvasTextures
// 맵을 찾아야 하고 Layer 객체의 DOM 객체를 찾고 싶으면 DOM 맵에서 찾아야 하게
