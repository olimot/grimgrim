import { createR32FDataTexture } from "./image-shader";
import { mix } from "./math";

// TODO: Make it as a shader = createBrushShaderProgram()

export function createBrushTextureByCPU(
  gl: WebGL2RenderingContext,
  diameter: number,
  hardness = 1,
) {
  const sigma = mix(0.232 * diameter, 1, hardness);
  const hardRadius = 0.5 * diameter * hardness;

  const size = Math.max(Math.ceil(1.625 * diameter), 3);
  const kernel = new Float32Array(size * size);

  let max = 0;
  const sigmaSquare = sigma * sigma;
  const center = 0.5 * size;
  for (let y = 0; y < size; y++) {
    const yOffset = y * size;
    for (let x = 0; x < size; x++) {
      const dx = center - x - 0.5;
      const dy = center - y - 0.5;
      const d = Math.max(Math.hypot(dx, dy) - hardRadius, 0);
      const numerator = Math.pow(Math.E, (-d * d) / (2 * sigmaSquare));
      const value = numerator / (2 * Math.PI * sigmaSquare);
      kernel[yOffset + x] = value;
      max = Math.max(max, value);
    }
  }

  for (let i = 0; i < kernel.length; i++) kernel[i] /= max;

  return createR32FDataTexture(gl, size, size, kernel);
}

export const createBrushTexture = createBrushTextureByCPU;
