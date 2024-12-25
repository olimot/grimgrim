#version 300 es
precision highp float;

uniform vec2 srcSize;
uniform sampler2D srcTexture;
uniform float time;

in vec2 texCoord;
out vec4 finalColor;

float getValue(sampler2D tex, vec2 uv) {
  return texture(tex, uv).r - 0.5f;
}

float detectEdge(sampler2D tex, vec2 uv, vec2 texSize) {
  vec2 step = 1.0f / texSize;
  float value = getValue(tex, uv);

  for(float y = -1.0f; y <= 1.0f; y += 1.0f) {
    for(float x = -1.0f; x <= 1.0f; x += 1.0f) {
      vec2 offset = step * vec2(x, y);
      if(offset != vec2(0) && getValue(tex, uv + offset) * value < 0.0f) {
        return 1.0f;
      }
    }
  }

  return 0.0f;
}

void main() {
  int offset = int(time * 16.0f) % 16;
  ivec2 iPixelCoord = ivec2(vec2(texCoord.x, 1.0f - texCoord.y) * srcSize);
  int stripe = ((iPixelCoord.x + iPixelCoord.y - offset) / 8) % 2;
  float bw = clamp(float(stripe), 0.0f, 1.0f);
  float value = detectEdge(srcTexture, texCoord, srcSize);
  finalColor = vec4(bw, bw, bw, value);
}
