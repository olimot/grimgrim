import { mat3 } from "gl-matrix";
import fragmentShaderSource from "./shader/checkerboard.frag?raw";
import vertexShaderSource from "./shader/rectangle.vert?raw";
import { GLProgramBuilder } from "./gl/program";

const mat3id = mat3.identity(mat3.create());

const Checkerboard: GLProgramBuilder = {
  name: "Checkerboard Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      srcSize: gl.getUniformLocation(program, "srcSize")!,
      checkerSize: gl.getUniformLocation(program, "checkerSize")!,
      viewMatrix: gl.getUniformLocation(program, "viewMatrix")!,
    };
    gl.uniform1f(uniformLocation.checkerSize, 8);
    gl.uniformMatrix3fv(uniformLocation.viewMatrix, false, mat3id);
    return { program, uniformLocation, arrayCount: 6 };
  },
};

export default Checkerboard;
