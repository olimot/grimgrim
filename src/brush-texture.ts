import { vec3, vec4 } from "gl-matrix";
import { createGaussianKernel } from "./gaussian-blur";
import {
  createR32FDataTexture,
  createRGBA32FDataTexture,
  createTexture,
} from "./image-shader";

export async function createBrushTexture(
  gl: WebGL2RenderingContext,
  diameter: number,
  hardness = 1,
) {
  const radius = 0.5 * diameter;
  let sigma = 0.5 * radius * (1 - hardness);
  if (hardness < 1 && sigma < 1) sigma = 1;

  const size = Math.ceil(2 * diameter);
  const center = 0.5 * size;
  const src = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const yOffset = y * size;
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.hypot(dx, dy);
      const value = Math.min(Math.max(0, Math.max(1, radius) - distance), 1);
      src[yOffset + x] = value;
    }
  }

  if (hardness === 1) return createRGBA32FDataTexture(gl, size, size, src);

  const gaussianKernel = createGaussianKernel(sigma);
  const kernelSize = Math.sqrt(gaussianKernel.length);
  const kernelCenter = kernelSize / 2;
  const dst = new Float32Array(src);
  for (let y = 0; y < size; y++) {
    const yOffset = y * size;
    for (let x = 0; x < size; x++) {
      let value = 0;
      for (let i = 0; i < gaussianKernel.length; i++) {
        const kernelY = Math.floor(i / kernelSize);
        const kernelX = i % kernelSize;
        const kernelValue = gaussianKernel[i];
        const srcY = Math.floor(y + kernelY - kernelCenter);
        const srcX = Math.floor(x + kernelX - kernelCenter);
        if (srcX < 0 || srcX >= size - 1 || srcY < 0 || srcY >= size - 1) {
          continue;
        }
        value += src[srcY * size + srcX] * kernelValue;
      }
      dst[yOffset + x] = value;
    }
    await new Promise((r) => setTimeout(r));
    if ((((y - 1) / 10) | 0) !== ((y / 10) | 0)) {
      console.log(`${Math.round((y / size) * 10000) / 100}% done.`);
    }
  }

  return createR32FDataTexture(gl, size, size, dst);
}

const u8 = (float: number) => (float * 256) | 0;

export function createBrushTextureByCanvas(
  gl: WebGL2RenderingContext,
  diameter: number,
  hardness = 1,
  color: vec3 | vec4 = [0, 0, 0],
) {
  const radius = 0.5 * diameter;
  const softnessScale = 1 - hardness;
  const sigma = Math.max(1, radius * softnessScale);
  let size;
  if (hardness < 1) size = Math.ceil(2 * diameter);
  else size = Math.ceil(diameter);
  const center = size / 2;

  const canvas = document.createElement("canvas");
  Object.assign(canvas, { width: size, height: size });
  const context = canvas.getContext("2d")!;
  context.filter = `blur(${sigma}px)`;
  context.beginPath();
  context.arc(center, center, radius, 0, 2 * Math.PI);
  context.fillStyle = `rgb(${u8(color[0])},${u8(color[1])},${u8(color[2])})`;
  context.fill();

  const textureInfo = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  Object.assign(textureInfo, { width: size, height: size, data: canvas });

  return textureInfo;
}
