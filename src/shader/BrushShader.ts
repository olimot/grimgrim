import fragmentShaderSource from "./brush.frag?raw";
import vertexShaderSource from "./rectangle.vert?raw";
import { mat3 } from "gl-matrix";
import { GLProgramBuilder } from "../gl/program";

const BrushShader: GLProgramBuilder = {
  name: "Brush Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      color: gl.getUniformLocation(program, "color")!,
      hardness: gl.getUniformLocation(program, "hardness")!,
      transform: gl.getUniformLocation(program, "transform")!,
    };
    const transform = mat3.identity(mat3.create());
    gl.uniformMatrix3fv(uniformLocation.transform, false, transform);
    return { program, uniformLocation, arrayCount: 6 };
  },
};

export default BrushShader;
