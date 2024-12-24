#version 300 es
uniform vec2 viewport;
uniform vec2 topLeft;
uniform vec2 bottomLeft;
uniform vec2 bottomRight;
uniform vec2 topRight;

out vec2 texCoord;
void main() {
  vec2 position;
  if(gl_VertexID == 0 || gl_VertexID == 5) {
    texCoord = vec2(0, 1);
    position = topLeft;
  } else if(gl_VertexID == 1) {
    texCoord = vec2(0, 0);
    position = bottomLeft;
  } else if(gl_VertexID == 2 || gl_VertexID == 3) {
    texCoord = vec2(1, 0);
    position = bottomRight;
  } else if(gl_VertexID == 4) {
    texCoord = vec2(1, 1);
    position = topRight;
  }

  position = (2.0f * position - 1.0f) * vec2(1, -1) / viewport;
  gl_Position = vec4(position.x, -position.y, 0, 1);
}
