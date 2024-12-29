import { vec2 } from "gl-matrix";
import GrimgrimContext from "./GrimgrimContext";
import { commandKey, manageKeyboard } from "./keyboard";
import { getPointerInfo, managePointer } from "./pointer";
import { dpr, getClipboardImageBitmap } from "./util";

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

window.addEventListener("paste", async (event) => {
  event.preventDefault();
  const opts = { imageOrientation: "flipY" } as const;
  const src = await getClipboardImageBitmap(event, opts);
  if (!src) return;
  const layer = context.addLayer({ src });
  vec2.sub(layer.xy, context.content.size, layer.size);
  vec2.scale(layer.xy, layer.xy, 0.5);
  context.render();
});

const pressed = manageKeyboard(async (e) => {
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

managePointer(editArea, (e) => {
  const [p, dp] = getPointerInfo(e);
  if (e.type === "pointerdown") {
    (document.activeElement as HTMLElement).blur();
    vec2.copy(viewControlOrigin, p);
  }

  if (viewControl === "grab") {
    context.translateView(dp);
  } else if (viewControl === "pinch") {
    const r = 1 + (2 * dp[0]) / (screen.width * dpr);
    context.scaleView(viewControlOrigin, r);
  }

  if (!viewControl) {
    // Handle tool action
    const contentCoord = vec2.clone(p);
    vec2.sub(contentCoord, contentCoord, context.view.translation);
    vec2.scale(contentCoord, contentCoord, 1 / context.view.scale);
    const contentDelta = vec2.clone(dp);
    vec2.scale(contentDelta, contentDelta, 1 / context.view.scale);

    if (e.type === "pointerdown") {
      if (e[commandKey]) context.selectLayer(contentCoord);
      else context.beginBrush(contentCoord);
    } else if (e.type === "pointermove") {
      if (e[commandKey]) context.moveLayer(contentDelta);
      else context.strokeBrush(contentCoord);
    } else {
      context.endBrush();
    }
  }
});

// UI는 최대한 추상화, 보편적으로 다른데서도 쓸 수 있게 미래를 생각하면서 구조 짜기
// 기능은 최대한 간단한 구조로, 미래를 생각하지 않고 현시점에서 제일 빠르게 작업할 수 있는 구조로
