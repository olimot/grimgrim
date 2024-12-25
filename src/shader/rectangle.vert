#version 300 es
uniform vec2 viewport;
uniform vec2 srcSize;
uniform vec2 topLeft;

out vec2 texCoord;

void main() {
  vec2 pixelPosition;
  if(gl_VertexID == 0 || gl_VertexID == 5) {
    texCoord = vec2(0, 1);
    pixelPosition = topLeft;
  } else if(gl_VertexID == 1) {
    texCoord = vec2(0, 0);
    pixelPosition = topLeft + vec2(0, srcSize.y);
  } else if(gl_VertexID == 2 || gl_VertexID == 3) {
    texCoord = vec2(1, 0);
    pixelPosition = topLeft + srcSize;
  } else if(gl_VertexID == 4) {
    texCoord = vec2(1, 1);
    pixelPosition = topLeft + vec2(srcSize.x, 0);
  }

  vec2 position = (2.0f * (pixelPosition / viewport) - 1.0f) * vec2(1, -1);
  gl_Position = vec4(position, 0, 1);
}
