#version 300 es
precision highp float;
uniform sampler2D srcTexture;
uniform sampler2D maskTexture;

in vec2 texCoord;
out vec4 finalColor;
void main() {
  finalColor = texture(srcTexture, texCoord);
  finalColor.a *= texture(maskTexture, texCoord).r;
}
