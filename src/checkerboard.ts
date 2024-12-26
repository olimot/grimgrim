import { mat3 } from "gl-matrix";
import fragmentShaderSource from "./shader/checkerboard.frag?raw";
import vertexShaderSource from "./shader/rectangle.vert?raw";

const mat3id = mat3.identity(mat3.create());

const Checkerboard = {
  name: "Checkerboard Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      srcSize: gl.getUniformLocation(program, "srcSize"),
      checkerSize: gl.getUniformLocation(program, "checkerSize"),
      model: gl.getUniformLocation(program, "model"),
    };
    gl.uniform1f(uniformLocation.checkerSize, 8);
    gl.uniformMatrix3fv(uniformLocation.model, false, mat3id);
    const draw = () => gl.drawArrays(gl.TRIANGLES, 0, 6);
    return { program, uniformLocation, draw };
  },
};

export default Checkerboard;
