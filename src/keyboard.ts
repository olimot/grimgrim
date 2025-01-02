export function manageKeyboard(
  callback: (event: KeyboardEvent, pressed: Set<string>) => void,
) {
  const pressed = new Set<string>();

  const onKeyDown = (event: KeyboardEvent) => {
    if (pressed.has(event.code)) return;
    pressed.add(event.code);
    callback(event, pressed);
  };

  const onBlur = () => {
    if (!pressed.size) return;
    pressed.clear();
    callback(new KeyboardEvent("blur"), pressed);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (!pressed.has(event.code)) return;
    pressed.delete(event.code);
    callback(event, pressed);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur, false);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("blur", onBlur, false);
    window.removeEventListener("keyup", onKeyUp);
  };
}

export const isMac = navigator.userAgent.includes("Mac");

export const commandKey: "metaKey" | "ctrlKey" = isMac ? "metaKey" : "ctrlKey";
