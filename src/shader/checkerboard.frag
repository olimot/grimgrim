#version 300 es
precision highp float;
uniform vec2 srcSize;
uniform float checkerSize;

in vec2 texCoord;
out vec4 finalColor;
void main() {
  vec2 pixelCoord = vec2(texCoord.x, 1.0f - texCoord.y) * srcSize;
  int colorFlag = int(pixelCoord.x / checkerSize) % 2;
  colorFlag += int(pixelCoord.y / checkerSize) % 2;
  finalColor = colorFlag % 2 == 0 ? vec4(0.79608f, 0.79608f, 0.79608f, 1) : vec4(1);
}
