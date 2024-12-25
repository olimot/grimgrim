import { setupCheckerboard } from "./checkerboard";

const activeImage = { width: 512, height: 512 };

const origin = document.createElement("div");
origin.className = "origin";
document.body.appendChild(origin);

const artboard = document.createElement("div");
artboard.className = "artboard";
Object.assign(artboard.style, {
  top: 0,
  left: 0,
  width: `${activeImage.width / devicePixelRatio}px`,
  height: `${activeImage.height / devicePixelRatio}px`,
});
origin.appendChild(artboard);

setupCheckerboard(artboard);

const canvas = document.createElement("canvas");
canvas.className = "actual-canvas";
Object.assign(canvas, { width: activeImage.width, height: activeImage.height });
artboard.appendChild(canvas);
