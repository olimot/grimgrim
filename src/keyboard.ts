export function manageKeyboard(callback: (event: KeyboardEvent) => void) {
  const pressed = new Set<string>();
  const onBlur = () => {
    if (!pressed.size) return;
    pressed.clear();
    callback(new KeyboardEvent("blur"));
  };
  window.addEventListener("keydown", (event) => {
    if (pressed.has(event.code)) return;
    pressed.add(event.code);
    callback(event);
  });
  window.addEventListener("blur", onBlur, false);
  window.addEventListener("keyup", (event) => {
    if (!pressed.has(event.code)) return;
    pressed.delete(event.code);
    callback(event);
  });
  return pressed;
}

export const isMac = navigator.userAgent.includes("Mac");

export const commandKey: "metaKey" | "ctrlKey" = isMac ? "metaKey" : "ctrlKey";
