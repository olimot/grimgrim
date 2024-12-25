import { createPrograms } from "../gl/program";
import { assert, normalizeCanvasSize } from "../util";
import fullVert from "../shader/full.vert?raw";
import simpleFrag from "../shader/simple.frag?raw";
import checkerboardFrag from "../shader/checkerboard.frag?raw";

export default function canvas1() {
  const canvas = document.getElementById("canvas-1");
  assert(canvas instanceof HTMLCanvasElement);
  normalizeCanvasSize(canvas);
  const gl = canvas.getContext("webgl2");
  assert(gl instanceof WebGL2RenderingContext);
  const viewport = [gl.drawingBufferWidth, gl.drawingBufferHeight];
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.enable(gl.BLEND);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, viewport[0], viewport[1]);

  const programs = createPrograms(gl, [
    {
      name: "Checkerboard Shader",
      vertexShaderSource: fullVert,
      fragmentShaderSource: checkerboardFrag,
    },
    {
      name: "Full-screen Image Shader",
      vertexShaderSource: fullVert,
      fragmentShaderSource: simpleFrag,
    },
  ]);

  // Draw checkerboard
  const checkerboard = programs[0];
  gl.useProgram(checkerboard.program);
  gl.uniform2fv(
    gl.getUniformLocation(checkerboard.program, "viewport"),
    viewport,
  );
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  const drawingCanvas = document.createElement("canvas");
  drawingCanvas.width = canvas.width;
  drawingCanvas.height = canvas.height;
  const context = drawingCanvas?.getContext("2d", { willReadFrequently: true });
  assert(context instanceof CanvasRenderingContext2D);
  const createTestImage = (x: number, y: number, r: number, style: string) => {
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.fillStyle = style;
    context.fill();
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  const layer1tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer1tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const img1 = createTestImage(256, 170, 170, "#ff000099");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img1);

  const layer2tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer2tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const img2 = createTestImage(170, 341, 170, "#00ff0099");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img2);

  const layer3tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer3tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const img3 = createTestImage(341, 341, 170, "#0000ff99");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img3);

  // Draw layers
  const simple = programs[1];
  gl.useProgram(simple.program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, layer1tex);
  gl.uniform1i(gl.getUniformLocation(simple.program, "srcTexture"), 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindTexture(gl.TEXTURE_2D, layer2tex);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindTexture(gl.TEXTURE_2D, layer3tex);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
