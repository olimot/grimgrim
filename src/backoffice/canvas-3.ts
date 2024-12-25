import { createPrograms } from "../gl/program";
import {
  assert,
  capturePointer,
  getPointerInfo,
  normalizeCanvasSize,
} from "../util";
import fullVert from "./shader/full.vert?raw";
import selectionFrag from "./shader/selection.frag?raw";
import checkerboardFrag from "./shader/checkerboard.frag?raw";
import simpleFrag from "./shader/simple.frag?raw";
import rectangleVert from "./shader/rectangle.vert?raw";
import { vec2 } from "gl-matrix";

export default function canvas3() {
  const canvas = document.getElementById("canvas-3");
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
      name: "Image Shader",
      vertexShaderSource: rectangleVert,
      fragmentShaderSource: simpleFrag,
    },
    {
      name: "Selection Shader",
      vertexShaderSource: fullVert,
      fragmentShaderSource: selectionFrag,
    },
  ]);

  const drawingCanvas = document.createElement("canvas");
  drawingCanvas.width = canvas.width;
  drawingCanvas.height = canvas.height;
  const context = drawingCanvas?.getContext("2d", { willReadFrequently: true });
  assert(context instanceof CanvasRenderingContext2D);
  const createRectMask = (x: number, y: number, w: number, h: number) => {
    context.fillStyle = "#000";
    context.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    context.fillStyle = "#f00";
    context.fillRect(x, y, w, h);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };
  const createCircleImage = (x: number, y: number, r: number) => {
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.fill();
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  const selectionTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, selectionTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const selImg = createRectMask(256, 170, 170, 170);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, selImg);

  const layer1tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer1tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  context.fillStyle = "#00a0e9";
  const img1 = createCircleImage(256, 256, 170);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img1);

  // Setup checkerboard program
  const checkerboard = programs[0];
  gl.useProgram(checkerboard.program);
  const uViewport = gl.getUniformLocation(checkerboard.program, "viewport");
  gl.uniform2fv(uViewport, viewport);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // Setup layer program
  const rectangle = programs[1];
  gl.useProgram(rectangle.program);
  gl.uniform2fv(gl.getUniformLocation(rectangle.program, "viewport"), viewport);
  gl.uniform2fv(gl.getUniformLocation(rectangle.program, "srcSize"), viewport);
  gl.uniform1i(gl.getUniformLocation(rectangle.program, "srcTexture"), 0);
  const uTopLeftLoc = gl.getUniformLocation(rectangle.program, "topLeft");

  // Setup selection program
  const selection = programs[2];
  gl.useProgram(selection.program);
  gl.uniform2fv(gl.getUniformLocation(selection.program, "viewport"), viewport);
  gl.uniform2fv(gl.getUniformLocation(selection.program, "srcSize"), viewport);
  gl.uniform1i(gl.getUniformLocation(selection.program, "srcTexture"), 0);
  const uTime = gl.getUniformLocation(selection.program, "time");

  const selectionPos: vec2 = [256, 170];
  const selectionSize: vec2 = [170, 170];
  capturePointer(canvas, (event) => {
    const p1 = getPointerInfo(event)[1];
    if (event.type === "pointerdown") {
      vec2.copy(selectionPos, p1);
      vec2.zero(selectionSize);
    } else {
      vec2.subtract(selectionSize, p1, selectionPos);
    }
    gl.bindTexture(gl.TEXTURE_2D, selectionTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const selImg = createRectMask(...selectionPos, ...selectionSize);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, selImg);
  });
  canvas.style.cursor = "crosshair";

  requestAnimationFrame(function callback(time) {
    requestAnimationFrame(callback);
    // Draw checkerboard
    gl.useProgram(checkerboard.program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Draw layers
    gl.useProgram(rectangle.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layer1tex);
    gl.uniform2fv(uTopLeftLoc, [0, 0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Draw a selection
    gl.useProgram(selection.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, selectionTex);
    gl.uniform1f(uTime, time / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
}
