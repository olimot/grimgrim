import fragmentShaderSource from "./shader/checkerboard.frag?raw";
import vertexShaderSource from "./shader/full.vert?raw";

const Checkerboard = {
  name: "Checkerboard Shader",
  vertexShaderSource,
  fragmentShaderSource,
  setup: (gl: WebGL2RenderingContext, program: WebGLProgram) => {
    gl.useProgram(program);
    const uniformLocation = {
      viewportSize: gl.getUniformLocation(program, "viewportSize"),
      checkerSize: gl.getUniformLocation(program, "checkerSize"),
    };
    gl.uniform1f(uniformLocation.checkerSize, 8);
    const draw = () => gl.drawArrays(gl.TRIANGLES, 0, 3);
    return { program, uniformLocation, draw };
  },
};

export default Checkerboard;
