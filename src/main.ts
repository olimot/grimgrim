function* bline(x0 = 0, y0 = 0, x1 = 0, y1 = 0) {
  const [sx, sy] = [x0 < x1 ? 1 : -1, y0 < y1 ? 1 : -1];
  const [dx, dy] = [Math.abs(x1 - x0), Math.abs(y1 - y0)];
  const p = [x0, y0];
  let err = (dx > dy ? dx : -dy) / 2;
  while (true) {
    yield p;
    if (p[0] === x1 && p[1] === y1) break;
    const e2 = err;
    if (e2 > -dx) [err, p[0]] = [err - dy, p[0] + sx];
    if (e2 < dy) [err, p[1]] = [err + dx, p[1] + sy];
  }
}

window.addEventListener("load", () => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  canvas.style.width = `${canvas.width / devicePixelRatio}px`;
  canvas.style.height = `${canvas.height / devicePixelRatio}px`;
  const size = [canvas.width, canvas.height];
  const scale = [size[0] / canvas.clientWidth, size[1] / canvas.clientHeight];

  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "black";
  context.fillRect(0, 0, size[0], size[1]);

  const brushSize = 256;
  const brushCenter = (brushSize - 1) / 2;
  const brushData = new Float64Array(brushSize * brushSize);
  for (let by = 0; by < brushSize; by++) {
    for (let bx = 0; bx < brushSize; bx++) {
      const dx = bx - brushCenter;
      const dy = by - brushCenter;
      const t = 1 - Math.sqrt(dx * dx + dy * dy) / brushCenter;
      const idx = by * brushSize + bx;
      brushData[idx] = Math.min(Math.max(0, t), 1) / brushCenter;
    }
  }
  const paintingData = new Float64Array(size[0] * size[1]);
  const imageData = new ImageData(size[0], size[1]);
  context.putImageData(imageData, 0, 0);
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

    for (const [x, y] of bline(x0, y0, x1, y1)) {
      const beginx = Math.floor(x - brushCenter);
      const beginy = Math.floor(y - brushCenter);
      for (let by = 0; by < brushSize; by++) {
        const refy = beginy + by;
        if (refy < 0 || refy >= size[1]) continue;
        for (let bx = 0; bx < brushSize; bx++) {
          const refx = beginx + bx;
          if (refx < 0 || refx >= size[0]) continue;
          const idx = refy * size[0] + refx;
          paintingData[idx] += brushData[by * brushSize + bx];
          imageData.data[idx * 4 + 3] = paintingData[idx] * 255;
        }
      }
    }
    context.putImageData(imageData, 0, 0);
    [x0, y0] = [x1, y1];
  };
  window.addEventListener("pointerdown", brush);
  window.addEventListener("pointermove", brush);
  window.addEventListener("pointerup", (event) => {
    if (brushPointerId === event.pointerId) brushPointerId = -1;
  });
  canvas.style.touchAction = "none";
});
