export function createGaussianKernel(sigma: number) {
  if (!sigma) return new Float32Array([1]);

  sigma = Math.max(1, sigma);
  const radius = Math.ceil(3 * sigma);
  const diameter = 2 * radius + 1;
  const kernel = new Float32Array(diameter * diameter);

  // σ² (where, σ = radius / 2 and σ >= 1)
  const sigmaSquare = sigma * sigma;
  let sum = 0;
  for (let y = -radius; y <= radius; y++) {
    const yOffset = (y + radius) * diameter;
    for (let x = -radius; x <= radius; x++) {
      const numerator = Math.pow(Math.E, -(x * x + y * y) / (2 * sigmaSquare));
      const value = numerator / (2 * Math.PI * sigmaSquare);
      kernel[yOffset + x + radius] = value;
      sum += value;
    }
  }

  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  return kernel;
}

export function gaussianBlur(kernel: Float32Array, image: ImageData) {
  const gDia = Math.sqrt(kernel.length);
  const gRad = gDia / 2;
  const output = new ImageData(image.width, image.height);
  for (let x = gRad; x < image.width - gRad; x++) {
    for (let y = gRad; y < image.height - gRad; y++) {
      let redValue = 0;
      let greenValue = 0;
      let blueValue = 0;

      for (let kernelX = -gRad; kernelX <= gRad; kernelX++) {
        for (let kernelY = -gRad; kernelY <= gRad; kernelY++) {
          const kernelIdx = (kernelY + gRad) * gDia + kernelX + gRad;
          const kernelValue = kernel[kernelIdx];
          const pixelIdx = ((y - kernelY) * image.width + x - kernelX) * 4;
          redValue += image.data[pixelIdx + 0] * kernelValue;
          greenValue += image.data[pixelIdx + 1] * kernelValue;
          blueValue += image.data[pixelIdx + 2] * kernelValue;
        }
      }

      const pixelIdx = (y * image.width + x) * 4;
      output.data[pixelIdx + 0] = redValue;
      output.data[pixelIdx + 1] = greenValue;
      output.data[pixelIdx + 2] = blueValue;
    }
  }
}
