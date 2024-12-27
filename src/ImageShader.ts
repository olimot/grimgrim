import fragmentShaderSource from "./shader/simple.frag?raw";
import vertexShaderSource from "./shader/rectangle.vert?raw";
import { mat3 } from "gl-matrix";
import { GLProgramBuilder } from "./gl/program";

const mat3id = mat3.identity(mat3.create());

const ImageShader: GLProgramBuilder = {
  name: "Image Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      srcTexture: gl.getUniformLocation(program, "srcTexture")!,
      viewMatrix: gl.getUniformLocation(program, "viewMatrix")!,
    };
    gl.uniformMatrix3fv(uniformLocation.viewMatrix, false, mat3id);
    return { program, uniformLocation, arrayCount: 6 };
  },
};

export default ImageShader;
