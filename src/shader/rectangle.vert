#version 300 es
uniform mat3 transform;

out vec2 texCoord;
void main() {
  vec3 position;
  if(gl_VertexID == 0 || gl_VertexID == 5) {
    texCoord = vec2(0, 1);
    position = transform * vec3(-1, 1, 1);
  } else if(gl_VertexID == 1) {
    texCoord = vec2(0, 0);
    position = transform * vec3(-1, -1, 1);
  } else if(gl_VertexID == 2 || gl_VertexID == 3) {
    texCoord = vec2(1, 0);
    position = transform * vec3(1, -1, 1);
  } else if(gl_VertexID == 4) {
    texCoord = vec2(1, 1);
    position = transform * vec3(1, 1, 1);
  }

  gl_Position = vec4(position.xy, 0, 1);
}
