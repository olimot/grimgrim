import { mat3 } from "gl-matrix";
import { GLProgramBuilder } from "../gl/program";
import fragmentShaderSource from "./checkerboard.frag?raw";
import vertexShaderSource from "./rectangle.vert?raw";

const CheckerboardShader: GLProgramBuilder = {
  name: "Checkerboard Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      srcSize: gl.getUniformLocation(program, "srcSize")!,
      checkerSize: gl.getUniformLocation(program, "checkerSize")!,
      transform: gl.getUniformLocation(program, "transform")!,
    };
    gl.uniform1f(uniformLocation.checkerSize, 8);
    const transform = mat3.identity(mat3.create());
    gl.uniformMatrix3fv(uniformLocation.transform, false, transform);
    return { program, uniformLocation, arrayCount: 6 };
  },
};

export default CheckerboardShader;
