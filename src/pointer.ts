import { dpr } from "./util";

export function getPointerInfo(event: PointerEvent) {
  const { clientX: x, clientY: y, movementX: dx, movementY: dy } = event;
  const offset: [number, number] = [x * dpr, y * dpr];
  const delta: [number, number] = [dx * dpr, dy * dpr];
  return [offset, delta] as const;
}

export function managePointer(callback: (e: PointerEvent) => unknown) {
  let activePointerId = -1;

  const capture = (event: PointerEvent) => {
    if (event.type === "pointerdown") {
      activePointerId = event.pointerId;
    }

    if (activePointerId === event.pointerId) {
      event.preventDefault();
      const coalescedEvents = event.getCoalescedEvents();
      if (coalescedEvents.length) {
        for (const event of coalescedEvents) callback(event);
      } else {
        callback(event);
      }
    }
  };

  const release = (event: PointerEvent) => {
    if (activePointerId === event.pointerId) {
      activePointerId = -1;
      callback(event);
    }
  };

  const preventDefault = (e: MouseEvent) => !e.ctrlKey && e.preventDefault();

  window.addEventListener("pointerdown", capture);
  window.addEventListener("pointermove", capture);
  window.addEventListener("pointerup", release);
  window.addEventListener("contextmenu", preventDefault);

  return () => {
    window.removeEventListener("pointerdown", capture);
    window.removeEventListener("pointermove", capture);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("contextmenu", preventDefault);
  };
}
