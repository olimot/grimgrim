import { createR32FDataTexture, createR8DataTexture } from "./image-shader";

export function computeBrushProps(diameter: number, hardness: number) {
  const shrink = Math.sqrt(Math.PI) - 1;
  const hardDiameter = diameter * (hardness + shrink * (1 - hardness));
  let sigma = 0.175 * hardDiameter;
  if (hardness < 1 && sigma < 1) sigma = 1;
  const size = Math.ceil(hardDiameter * 2);
  return { hardDiameter, size, sigma };
}

export function createBrushTextureByCPU(
  gl: WebGL2RenderingContext,
  diameter: number,
  hardness = 1,
) {
  const shrink = Math.sqrt(Math.PI) - 1;
  const sigma = (1 - hardness) * 0.232 * diameter + hardness;
  const size = Math.ceil(diameter * (hardness + shrink * (1 - hardness)) * 2);
  const kernel = new Float32Array(size * size);
  const hardRadius = 0.5 * hardness * diameter;

  const sigmaSquare = sigma * sigma;
  const center = 0.5 * size;
  let max = 0;
  for (let y = 0; y < size; y++) {
    const yOffset = y * size;
    for (let x = 0; x < size; x++) {
      const dx = center - x - 0.5;
      const dy = center - y - 0.5;
      let dSquare = dx * dx + dy * dy;
      dSquare = Math.pow(Math.max(Math.sqrt(dSquare) - hardRadius, 0), 2);
      const numerator = Math.pow(Math.E, -dSquare / (2 * sigmaSquare));
      const value = numerator / (2 * Math.PI * sigmaSquare);
      kernel[yOffset + x] = value;
      max = Math.max(max, value);
    }
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= max;
  return createR32FDataTexture(gl, size, size, kernel);
}

export function createBrushTextureByCanvas(
  gl: WebGL2RenderingContext,
  diameter: number,
  hardness = 1,
) {
  const { hardDiameter, sigma, size } = computeBrushProps(diameter, hardness);

  const canvas = document.createElement("canvas");
  Object.assign(canvas, { width: size, height: size });
  const context = canvas.getContext("2d")!;
  context.filter = `blur(${sigma}px)`;
  const center = size / 2;
  context.arc(center, center, 0.5 * hardDiameter, 0, 2 * Math.PI);
  context.fill();

  const imageData = context.getImageData(0, 0, size, size);
  const dst = new Uint8ClampedArray(size * size);
  for (let i = 0; i < dst.length; i++) {
    dst[i] = imageData.data[i * 4 + 3];
  }

  return createR8DataTexture(gl, size, size, dst);
}

export const createBrushTexture = createBrushTextureByCPU;
