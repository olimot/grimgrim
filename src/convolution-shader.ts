import { TextureInfo } from "./image-shader";

export function processConvolutionKernel(
  gl: WebGL2RenderingContext,
  srcTexture: TextureInfo,
  kernelTexture: TextureInfo,
) {
  // # create program
  const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
  const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
  gl.shaderSource(
    vert,
    /* glsl */ `#version 300 es
      out vec2 texCoord;
      void main() {
        if (gl_VertexID == 0) {
          texCoord = vec2(0, 2.0);
          gl_Position = vec4(-1.0, 3.0, 0, 1);
        } else if (gl_VertexID == 1) {
          texCoord = vec2(0, 0);
          gl_Position = vec4(-1.0, -1.0, 0, 1);
        } else if (gl_VertexID == 2) {
          texCoord = vec2(2.0, 0);
          gl_Position = vec4(3.0, -1.0, 0, 1);
        }
      }`,
  );

  gl.shaderSource(
    frag,
    /* glsl */ `#version 300 es
      precision highp float;
      
      uniform vec2 size;
      uniform vec2 kernelSize;
      uniform sampler2D srcTexture;
      uniform sampler2D kernelTexture;
  
      in vec2 texCoord;
      out vec4 finalColor;
  
      void main() {     
        vec2 kernelPixelSize = 1.0 / kernelSize;
        vec2 kernelPixelRatio = kernelSize / size;
        for (float kernelY = 0.0; kernelY < 1.0; kernelY += kernelPixelSize.y) {
          for (float kernelX = 0.0; kernelX < 1.0; kernelX += kernelPixelSize.x) {
            float kernel = texture(kernelTexture, vec2(kernelY, kernelX)).r;
            vec2 offset = vec2(kernelX - 0.5, kernelY - 0.5) * kernelPixelRatio;
            finalColor += kernel * texture(srcTexture, texCoord + offset);
          }
        }
      }`,
  );
  gl.compileShader(vert);
  gl.compileShader(frag);
  const program = gl.createProgram() as WebGLProgram;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  let log: string | null;
  if ((log = gl.getShaderInfoLog(vert))) console.log(log);
  if ((log = gl.getShaderInfoLog(frag))) console.log(log);
  if ((log = gl.getProgramInfoLog(program))) console.log(log);

  gl.useProgram(program);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, srcTexture.texture);
  gl.uniform1i(gl.getUniformLocation(program, "srcTexture"), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, kernelTexture.texture);
  gl.uniform1i(gl.getUniformLocation(program, "kernelTexture"), 1);

  const size = [srcTexture.width, srcTexture.height];
  gl.uniform2fv(gl.getUniformLocation(program, "size"), size);

  const kSize = [kernelTexture.width, kernelTexture.height];
  gl.uniform2fv(gl.getUniformLocation(program, "kernelSize"), kSize);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
