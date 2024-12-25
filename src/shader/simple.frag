#version 300 es
precision highp float;
uniform sampler2D srcTexture;
in vec2 texCoord;
out vec4 finalColor;
void main() {
  finalColor = texture(srcTexture, texCoord);
}
