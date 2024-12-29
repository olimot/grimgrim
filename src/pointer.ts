import { dpr } from "./util";

export function getPointerInfo(event: PointerEvent) {
  const { offsetX: x, offsetY: y, movementX: dx, movementY: dy } = event;
  const offset: [number, number] = [x * dpr, y * dpr];
  const delta: [number, number] = [dx * dpr, dy * dpr];
  return [offset, delta] as const;
}

export function managePointer(
  target: HTMLElement,
  callback: (e: PointerEvent) => unknown,
) {
  let activePointerId = -1;

  const capture = (event: PointerEvent) => {
    if (event.type === "pointerdown") {
      if (event.target !== target) return;
      activePointerId = event.pointerId;
    }

    if (activePointerId === event.pointerId) {
      event.preventDefault();
      callback(event);
    }
  };

  const release = (event: PointerEvent) => {
    if (activePointerId === event.pointerId) {
      activePointerId = -1;
      callback(event);
    }
  };

  const prevTouchAction = target.style.touchAction;
  target.style.touchAction = "none";
  window.addEventListener("pointerdown", capture);
  window.addEventListener("pointermove", capture);
  window.addEventListener("pointerup", release);
  window.addEventListener(
    "contextmenu",
    (e) => !e.ctrlKey && e.preventDefault(),
  );

  return () => {
    window.removeEventListener("pointerdown", capture);
    window.removeEventListener("pointermove", capture);
    window.removeEventListener("pointerup", release);
    target.style.touchAction = prevTouchAction;
  };
}
