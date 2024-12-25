import { createPrograms } from "../gl/program";
import {
  assert,
  capturePointer,
  getPointerInfo,
  normalizeCanvasSize,
} from "../util";
import fullVert from "../shader/full.vert?raw";
import simpleFrag from "../shader/simple.frag?raw";
import checkerboardFrag from "../shader/checkerboard.frag?raw";
import brushFrag from "../shader/brush.frag?raw";
import { vec3 } from "gl-matrix";

export default function canvas6() {
  const canvas = document.getElementById("canvas-6");
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
    {
      name: "Brush Shader",
      vertexShaderSource: fullVert,
      fragmentShaderSource: brushFrag,
    },
  ]);

  const drawingCanvas = document.createElement("canvas");
  drawingCanvas.width = canvas.width;
  drawingCanvas.height = canvas.height;
  const context = drawingCanvas?.getContext("2d", { willReadFrequently: true });
  assert(context instanceof CanvasRenderingContext2D);
  const createBlankImage = (backgroundColor: string) => {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  const layer1tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer1tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const img1 = createBlankImage("#ffffff");
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img1);

  const framebuffer = gl.createFramebuffer();
  const target = gl.FRAMEBUFFER;
  const attachment = gl.COLOR_ATTACHMENT0;
  const textarget = gl.TEXTURE_2D;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(target, attachment, textarget, layer1tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Setup checkerboard program
  const checkerboard = programs[0];
  gl.useProgram(checkerboard.program);
  const uViewport = gl.getUniformLocation(checkerboard.program, "viewport");
  gl.uniform2fv(uViewport, viewport);

  // Setup painting layer program
  const simple = programs[1];
  gl.useProgram(simple.program);
  gl.uniform1i(gl.getUniformLocation(simple.program, "srcTexture"), 0);

  // Setup brush program
  const brush = programs[2];
  gl.useProgram(brush.program);
  gl.uniform1i(gl.getUniformLocation(brush.program, "srcTexture"), 0);

  // Draw checkerboard
  gl.useProgram(checkerboard.program);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // Draw painting layer
  gl.useProgram(simple.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, layer1tex);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  // Draw brush
  const drawBrush = (x: number, y: number) => {
    const brushColorText = (
      document.getElementById("brush-color-6") as HTMLInputElement
    ).value;
    const color: vec3 = [
      parseInt(brushColorText.slice(1, 3), 16) / 255,
      parseInt(brushColorText.slice(3, 5), 16) / 255,
      parseInt(brushColorText.slice(5, 7), 16) / 255,
    ];
    const brushSizeText = (
      document.getElementById("brush-size-6") as HTMLInputElement
    ).value;
    const s = Number(brushSizeText);
    const brushHardnessText = (
      document.getElementById("brush-hardness-6") as HTMLInputElement
    ).value;
    const h = Number(brushHardnessText) / 100;
    gl.useProgram(brush.program);
    gl.uniform3fv(gl.getUniformLocation(brush.program, "color"), color);
    gl.uniform1f(gl.getUniformLocation(brush.program, "hardness"), h);
    gl.viewport(x - s, gl.drawingBufferHeight - y - s, s * 2, s * 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let [x0, y0] = [NaN, NaN];
  capturePointer(canvas, (event) => {
    const point = getPointerInfo(event)[1];
    if (event.type === "pointerdown") {
      if (event.ctrlKey) return;
      [x0, y0] = point;
    }

    const brushSizeText = (
      document.getElementById("brush-size-6") as HTMLInputElement
    ).value;
    const brushSize = Number(brushSizeText);
    const brushSpacing = brushSize / 4;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    let x: number;
    let y: number;
    if (event.type === "pointerdown") {
      [x, y] = point;
      // imageShader.bindFramebuffer(paintingTex);
      drawBrush(x, y);
    } else {
      const [dx, dy] = [point[0] - x0, point[1] - y0];
      const distance = Math.hypot(dx, dy);
      const nDots = Math.floor(distance / brushSpacing);
      if (!nDots) return;
      const dt = brushSpacing / distance;
      [x, y] = [x0, y0];
      // imageShader.bindFramebuffer(paintingTex);
      for (let i = 0; i < nDots; i++) {
        x += dx * dt;
        y += dy * dt;
        drawBrush(x, y);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(simple.program);
    gl.bindTexture(gl.TEXTURE_2D, layer1tex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    [x0, y0] = [x, y];
  });
}
