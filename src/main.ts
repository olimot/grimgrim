window.addEventListener("load", () => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  canvas.style.width = `${canvas.width / devicePixelRatio}px`;
  canvas.style.height = `${canvas.height / devicePixelRatio}px`;
  const size = [canvas.width, canvas.height];
  const scale = [size[0] / canvas.clientWidth, size[1] / canvas.clientHeight];

  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "white";
  context.fillRect(0, 0, size[0], size[1]);

  let [x0, y0] = [NaN, NaN];
  let brushPointerId = -1;
  const brush = (event = new PointerEvent("")) => {
    const offset = [event.offsetX, event.offsetY];
    const point = offset.map((it, i) => Math.floor(scale[i] * it));
    if (event.type === "pointerdown") {
      brushPointerId = event.pointerId;
      [x0, y0] = point;
    }
    if (brushPointerId !== event.pointerId || event.target !== canvas) return;
    event.preventDefault();
    const [x1, y1] = point;

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();

    [x0, y0] = [x1, y1];
  };
  window.addEventListener("pointerdown", brush);
  window.addEventListener("pointermove", brush);
  window.addEventListener("pointerup", (event) => {
    if (brushPointerId === event.pointerId) brushPointerId = -1;
  });
  canvas.style.touchAction = "none";
});
