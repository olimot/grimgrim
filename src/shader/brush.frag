#version 300 es
precision highp float;

uniform vec3 color;
uniform float hardness;

in vec2 texCoord;
out vec4 finalColor;

void main() {
  float sigma = 0.1165f * pow(1.0f - hardness, 1.25f) + 0.001f;
  float fillRadius = pow(hardness, 0.63) / 4.0f;
  float distance = length(texCoord - 0.5f);
  float x = clamp(distance - fillRadius, 0.0f, 1.0f);
  float v = clamp(exp((-x * x) / (2.0f * sigma * sigma)), 0.0f, 1.0f);
  finalColor = vec4(color, v);
}
