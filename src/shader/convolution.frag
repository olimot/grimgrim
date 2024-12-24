#version 300 es
precision highp float;
uniform vec2 viewport;
uniform vec2 kernelSize;
uniform sampler2D srcTexture;
uniform sampler2D kernelTexture;

in vec2 texCoord;
out vec4 finalColor;

void main() {
  vec2 kernelPixelSize = 1.0f / kernelSize;
  vec2 kernelPixelRatio = kernelSize / viewport;
  for(float kernelY = 0.0f; kernelY < 1.0f; kernelY += kernelPixelSize.y) {
    for(float kernelX = 0.0f; kernelX < 1.0f; kernelX += kernelPixelSize.x) {
      float kernel = texture(kernelTexture, vec2(kernelY, kernelX)).r;
      vec2 offset = vec2(kernelX - 0.5f, kernelY - 0.5f) * kernelPixelRatio;
      finalColor += kernel * texture(srcTexture, texCoord + offset);
    }
  }
}
