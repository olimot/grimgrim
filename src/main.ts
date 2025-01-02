import { mat3, vec2 } from "gl-matrix";
import { createTexture } from "./gl/texture";
import GrimgrimContext from "./GrimgrimContext";
import { commandKey, manageKeyboard } from "./keyboard";
import { getPointerInfo, managePointer } from "./pointer";
import { dpr, getClipboardImageBitmap, Rect, scaleFromOrigin } from "./util";

const editArea = document.createElement("div");
editArea.style.position = "relative";
editArea.style.width = "100%";
editArea.style.height = "100%";
editArea.style.overflow = "hidden";

document.body.style.margin = "0";
document.body.style.height = "100%";
document.body.appendChild(editArea);

document.documentElement.style.height = "100%";

const context = new GrimgrimContext(editArea);
const viewControlOrigin = vec2.create();
let viewControl: "" | "pinch" | "grab" = "";

const div = document.createElement("div");
div.className = "layer-box";
div.append(
  ...["nw", "w", "sw", "s", "se", "e", "ne", "n"].map((position) => {
    const handle = document.createElement("div");
    handle.className = `layer-handle ${position}`;
    let activePointerId = -1;
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      activePointerId = e.pointerId;
    });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activePointerId) return;
      e.preventDefault();
      e.stopPropagation();
      const dp = getPointerInfo(e)[1];
      vec2.scale(dp, dp, 1 / context.view.scale);
      if (e.shiftKey) {
        console.log(context.activeLayer.size);
        const vector = vec2.normalize([0, 0], context.activeLayer.size);
        const sign = Math.sign(dp[0]) || Math.sign(dp[1]);
        vec2.copy(dp, vec2.scale(vector, vector, sign * vec2.len(dp)));
      }
      if (!context.activeLayer.viewSize) {
        context.activeLayer.viewSize = [0, 0];
        vec2.copy(context.activeLayer.viewSize, context.activeLayer.size);
      }
      if (position.startsWith("n")) {
        context.activeLayer.xy[1] += dp[1];
        context.activeLayer.viewSize[1] -= dp[1];
        updateActiveLayerRect();
      }
      if (position.endsWith("w")) {
        context.activeLayer.xy[0] += dp[0];
        context.activeLayer.viewSize[0] -= dp[0];
        updateActiveLayerRect();
      }
      if (position.startsWith("s")) {
        context.activeLayer.viewSize[1] += dp[1];
        updateActiveLayerRect();
      }
      if (position.endsWith("e")) {
        context.activeLayer.viewSize[0] += dp[0];
        updateActiveLayerRect();
      }
      context.render();
    });
    window.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      activePointerId = -1;
      if (context.activeLayer.viewSize) {
        context.resizeLayer(context.activeLayer, context.activeLayer.viewSize);
      }
      delete context.activeLayer.viewSize;
      context.render();
    });

    return handle;
  }),
);
document.body.appendChild(div);

const activeLayerRect = Rect();
function updateActiveLayerRect() {
  div.style.display = context.activeLayer.locked ? "none" : "block";
  context.toCSSRect(context.activeLayer, activeLayerRect);
  div.style.left = `${activeLayerRect.xy[0]}px`;
  div.style.top = `${activeLayerRect.xy[1]}px`;
  div.style.width = `${activeLayerRect.size[0]}px`;
  div.style.height = `${activeLayerRect.size[1]}px`;
}
updateActiveLayerRect();

window.addEventListener("paste", async (event) => {
  event.preventDefault();
  const opts = { imageOrientation: "flipY" } as const;
  const src = await getClipboardImageBitmap(event, opts);
  if (!src) return;
  const layer = context.addLayer(createTexture(context.gl, { src }));
  vec2.sub(layer.xy, context.content.size, layer.size);
  vec2.scale(layer.xy, layer.xy, 0.5);
  context.render();
});

manageKeyboard(async (e, pressed) => {
  if (!pressed.has("Space")) viewControl = "";
  else viewControl = e[commandKey] ? "pinch" : "grab";

  if (e.type === "keydown") {
    if (e[commandKey] && (pressed.has("Numpad0") || pressed.has("Digit0"))) {
      e.preventDefault();
      context.resetView();
    } else if (e[commandKey] && e.shiftKey && pressed.has("KeyS")) {
      e.preventDefault();
      const blob = await context.getBlob();
      window.open(URL.createObjectURL(blob), "_blank");
    } else if (e[commandKey] && pressed.has("KeyS")) {
      e.preventDefault();
      const blob = await context.getBlob();
      navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } else {
      console.log(e.code);
    }
  }
});

function processPointerEvent(e: PointerEvent) {
  const [p, dp] = getPointerInfo(e);
  if (e.type === "pointerdown") {
    (document.activeElement as HTMLElement).blur();
    vec2.copy(viewControlOrigin, p);
  }

  if (viewControl === "grab") {
    vec2.add(context.view.translation, context.view.translation, dp);
    context.updateView();
    updateActiveLayerRect();
  } else if (viewControl === "pinch") {
    const r = 1 + (2 * dp[0]) / (screen.width * dpr);
    const t = context.view.translation;
    scaleFromOrigin(t, t, r, viewControlOrigin);
    context.view.scale *= r;
    context.updateView();
    updateActiveLayerRect();
  }

  if (!viewControl) {
    // Handle tool action
    const contentCoord = vec2.sub(vec2.create(), p, context.view.translation);
    vec2.scale(contentCoord, contentCoord, 1 / context.view.scale);
    const contentDelta = vec2.scale(vec2.create(), dp, 1 / context.view.scale);

    if (e.type === "pointerdown") {
      if (e[commandKey]) context.selectLayer(contentCoord);
      else context.beginBrush(contentCoord);
    } else if (e.type === "pointermove") {
      if (e[commandKey]) context.moveLayer(contentDelta);
      else context.strokeBrush(contentCoord);
    } else {
      context.endBrush();
    }
    updateActiveLayerRect();
  }
}

managePointer(processPointerEvent);

Object.assign(window, { context, vec2, mat3 });

// fetch(new URL("./example.png", import.meta.url)).then(async (res) => {
//   const opts = { imageOrientation: "flipY" } as const;
//   const src = await createImageBitmap(await res.blob(), opts);
//   const layer = context.addLayer({ src });
//   context.resizeTexture(layer, vec2.scale([0, 0], layer.size, 0.125));
//   context.view.scale = 40;
//   context.updateView();
//   context.render();
// });

// UI는 최대한 추상화, 보편적으로 다른데서도 쓸 수 있게 미래를 생각하면서 구조 짜기
// 기능은 최대한 간단한 구조로, 미래를 생각하지 않고 현시점에서 제일 빠르게 작업할 수 있는 구조로
