import fragmentShaderSource from "./shader/simple.frag?raw";
import vertexShaderSource from "./shader/rectangle.vert?raw";
import { mat3 } from "gl-matrix";

const mat3id = mat3.identity(mat3.create());

const ImageShader = {
  name: "Image Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      srcTexture: gl.getUniformLocation(program, "srcTexture"),
      model: gl.getUniformLocation(program, "model"),
    };
    gl.uniformMatrix3fv(uniformLocation.model, false, mat3id);
    const draw = () => gl.drawArrays(gl.TRIANGLES, 0, 6);
    return { program, uniformLocation, draw };
  },
};

export default ImageShader;
