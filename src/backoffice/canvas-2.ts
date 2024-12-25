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
import rectangleVert from "../shader/rectangle.vert?raw";
import { vec2 } from "gl-matrix";

export default function canvas2() {
  const canvas = document.getElementById("canvas-2");
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
  ]);

  const drawingCanvas = document.createElement("canvas");
  drawingCanvas.width = canvas.width;
  drawingCanvas.height = canvas.height;
  const context = drawingCanvas?.getContext("2d", { willReadFrequently: true });
  assert(context instanceof CanvasRenderingContext2D);
  const createCircleImage = (x: number, y: number, r: number) => {
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI);
    context.fill();
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };
  const createSquareImage = (x: number, y: number, r: number) => {
    context.fillRect(x, y, r, r);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  };

  const layer0tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer0tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  context.fillStyle = "#ffffff";
  const img0 = createSquareImage(0, 0, 512);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img0);

  const layer1tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer1tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  context.fillStyle = "#00a0e9";
  const img1 = createCircleImage(256, 170, 170);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img1);

  const layer2tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer2tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  context.fillStyle = "#fff100";
  const img2 = createCircleImage(170, 341, 170);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img2);

  const layer3tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, layer3tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  context.fillStyle = "#e4007f";
  const img3 = createCircleImage(341, 341, 170);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img3);

  const layers = [
    {
      id: 0,
      label: "배경",
      data: img0,
      texture: layer0tex,
      topLeft: vec2.create(),
      size: [canvas.width, canvas.height],
    },
    {
      id: 1,
      label: "레이어 1",
      data: img1,
      texture: layer1tex,
      topLeft: vec2.create(),
      size: [canvas.width, canvas.height],
    },
    {
      id: 2,
      label: "레이어 2",
      data: img2,
      texture: layer2tex,
      topLeft: vec2.create(),
      size: [canvas.width, canvas.height],
    },
    {
      id: 3,
      label: "레이어 3",
      data: img3,
      texture: layer3tex,
      topLeft: vec2.create(),
      size: [canvas.width, canvas.height],
    },
  ];

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

  const draw = () => {
    // Draw checkerboard
    gl.useProgram(checkerboard.program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Draw layers
    gl.useProgram(rectangle.program);
    for (const layer of layers) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, layer.texture);
      gl.uniform2fv(uTopLeftLoc, layer.topLeft);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };

  draw();

  const radioNamePrefix = "activeGrimgrimLayer";
  const query = `input[type="radio"][name^=${radioNamePrefix}]`;
  let radioNameCount = 0;
  document.querySelectorAll<HTMLInputElement>(query).forEach((it) => {
    const numText = (it as HTMLInputElement).name.match(/[0-9]+$/)?.[0];
    radioNameCount = Math.max(radioNameCount, Number(numText));
  });
  radioNameCount += 1;
  const radioName = `${radioNamePrefix}${radioNameCount}`;

  let activeLayer = layers[0];
  capturePointer(canvas, (event) => {
    const [, p1, dp] = getPointerInfo(event);
    if (event.type === "pointerdown") {
      const selected = layers.toReversed().find((layer) => {
        const x = Math.floor(p1[0]);
        const y = Math.floor(p1[1]);
        const dataX = Math.floor(x - layer.topLeft[0]);
        const dataY = Math.floor(y - layer.topLeft[1]);
        if (dataX < 0 || dataX >= layer.data.width - 1) return false;
        if (dataY < 0 || dataY >= layer.data.height - 1) return false;
        const pixelOffset = (dataY * layer.data.width + dataX) * 4;
        return layer.data.data[pixelOffset + 3] > 0;
      });
      if (selected) {
        activeLayer = selected;
        const query = `[name="${radioName}"][value="${selected.id}"]`;
        const radio = document.querySelector<HTMLInputElement>(query);
        if (radio) radio.checked = true;
      }
    }
    vec2.add(activeLayer.topLeft, activeLayer.topLeft, dp);
    draw();
  });
  canvas.style.cursor = "move";

  const ul = document.getElementById("canvas-2-layer-list")!;

  layers.toReversed().forEach((layer) => {
    const li = document.createElement("li");
    ul.appendChild(li);

    const label = document.createElement("label");
    li.appendChild(label);

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = radioName;
    radio.value = `${layer.id}`;
    radio.onchange = () => {
      activeLayer = layer;
    };
    if (activeLayer === layer) radio.checked = true;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(` ${layer.label}`));
  });
}
