#version 300 es
precision highp float;
uniform vec2 viewport;

in vec2 texCoord;
out vec4 finalColor;
void main() {
  vec2 pixelCoord = texCoord * viewport;
  int colorFlag = int(pixelCoord.x / 8.0) % 2;
  colorFlag += int(pixelCoord.y / 8.0) % 2;
  finalColor = colorFlag % 2 == 0 ? vec4(0.79608f, 0.79608f, 0.79608f, 1) : vec4(1);
}
