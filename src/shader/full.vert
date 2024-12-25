#version 300 es

out vec2 texCoord;

void main() {
  if(gl_VertexID == 0) {
    texCoord = vec2(0, 2);
    gl_Position = vec4(-1, 3, 0, 1);
  } else if(gl_VertexID == 1) {
    texCoord = vec2(0, 0);
    gl_Position = vec4(-1, -1, 0, 1);
  } else if(gl_VertexID == 2) {
    texCoord = vec2(2, 0);
    gl_Position = vec4(3, -1, 0, 1);
  }
}
