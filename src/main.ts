import { mat4, vec3 } from "gl-matrix";
import createBrushCanvas from "./brush-texture";

function* bline(x0 = 0, y0 = 0, x1 = 0, y1 = 0) {
  const [sx, sy] = [x0 < x1 ? 1 : -1, y0 < y1 ? 1 : -1];
  const [dx, dy] = [Math.abs(x1 - x0), Math.abs(y1 - y0)];
  const p = [x0, y0];
  let err = (dx > dy ? dx : -dy) / 2;
  while (true) {
    yield p;
    if (p[0] === x1 && p[1] === y1) break;
    const e2 = err;
    if (e2 > -dx) [err, p[0]] = [err - dy, p[0] + sx];
    if (e2 < dy) [err, p[1]] = [err + dx, p[1] + sy];
  }
}

export function createImageShader(gl: WebGL2RenderingContext) {
  // # create program
  const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
  const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
  gl.shaderSource(
    vert,
    /* glsl */ `#version 300 es
  uniform mat4 model;
  uniform mat4 view;
  uniform mat4 projection;
  in vec4 POSITION;
  in vec2 TEXCOORD_0;
  out vec2 texCoord;
  void main() {
    texCoord = TEXCOORD_0;
    gl_Position = projection * view * model * POSITION;
  }
`,
  );
  gl.shaderSource(
    frag,
    /* glsl */ `#version 300 es
  precision highp float;
  uniform sampler2D baseColorTexture;
  in vec2 texCoord;
  out vec4 finalColor;
  void main() {
    finalColor = texture(baseColorTexture, texCoord);
  }
`,
  );
  gl.compileShader(vert);
  gl.compileShader(frag);
  const program = gl.createProgram() as WebGLProgram;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "POSITION");
  gl.bindAttribLocation(program, 1, "TEXCOORD_0");
  gl.linkProgram(program);

  let log: string | null;
  if ((log = gl.getShaderInfoLog(vert))) console.log(log);
  if ((log = gl.getShaderInfoLog(frag))) console.log(log);
  if ((log = gl.getProgramInfoLog(program))) console.log(log);

  const uniformLocation = {
    model: gl.getUniformLocation(program, "model"),
    view: gl.getUniformLocation(program, "view"),
    projection: gl.getUniformLocation(program, "projection"),
    baseColorTexture: gl.getUniformLocation(program, "baseColorTexture"),
  };

  return [program, uniformLocation] as const;
}

window.addEventListener("load", () => {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;

  const model = mat4.identity(mat4.create());
  const view = mat4.lookAt(mat4.create(), [0, 0, 1], [0, 0, 0], [0, 1, 0]);
  const projection = mat4.create();

  const gl = canvas.getContext("webgl2");
  if (!gl) return;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.depthFunc(gl.LEQUAL);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.blendEquation(gl.FUNC_ADD);
  gl.colorMask(true, true, true, true);
  gl.clearColor(1, 1, 1, 1);
  gl.clearDepth(1);

  const vertices = [0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0];
  const texCoords = [0, 1, 0, 0, 1, 0, 1, 1];
  const ids = [0, 1, 2, 2, 3, 0];
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(ids), gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  const brushSample = createBrushCanvas();
  const brushTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, brushTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const { UNSIGNED_BYTE, RGBA } = gl;
  gl.texImage2D(gl.TEXTURE_2D, 0, RGBA, RGBA, UNSIGNED_BYTE, brushSample);

  const [program, u] = createImageShader(gl);
  gl.useProgram(program);
  gl.frontFace(gl.CCW);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.uniformMatrix4fv(u.view, false, view);
  gl.uniform1i(u.baseColorTexture, 0);
  gl.bindVertexArray(vao);

  const layer0 = gl.createTexture();
  const [w, h] = [1280, 720];
  gl.bindTexture(gl.TEXTURE_2D, layer0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, RGBA, UNSIGNED_BYTE, null);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    layer0,
    0,
  );
  gl.viewport(0, 0, w, h);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, layer0);
  mat4.fromScaling(model, [w, h, 1]);
  mat4.ortho(projection, 0, canvas.width, canvas.height, 0, 0, 1);
  gl.uniformMatrix4fv(u.projection, false, projection);
  gl.uniformMatrix4fv(u.model, false, model);
  gl.drawElements(gl.TRIANGLES, ids.length, gl.UNSIGNED_BYTE, 0);

  let [x0, y0] = [NaN, NaN];
  let brushPointerId = -1;
  const brush = (event = new PointerEvent("")) => {
    if (event.type === "pointerdown") {
      brushPointerId = event.pointerId;
      [x0, y0] = [Math.floor(event.offsetX), Math.floor(event.offsetY)];
    }
    if (brushPointerId !== event.pointerId || event.target !== canvas) return;
    event.preventDefault();
    const [x1, y1] = [Math.floor(event.offsetX), Math.floor(event.offsetY)];

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, w, h);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, brushTex);
    mat4.ortho(projection, 0, w, h, 0, 0, 1);
    gl.uniformMatrix4fv(u.projection, false, projection);
    const scale = vec3.fromValues(brushSample.width, brushSample.height, 1);
    const cos = [-brushSample.width / 2, -brushSample.height / 2];

    for (const [x, y] of bline(x0, y0, x1, y1)) {
      mat4.identity(model);
      mat4.translate(model, model, [x + cos[0], y + cos[1], 0]);
      mat4.scale(model, model, scale);
      gl.uniformMatrix4fv(u.model, false, model);
      gl.drawElements(gl.TRIANGLES, ids.length, gl.UNSIGNED_BYTE, 0);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.ortho(projection, 0, canvas.width, canvas.height, 0, 0, 1);
    gl.uniformMatrix4fv(u.projection, false, projection);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, layer0);
    mat4.fromScaling(model, [w, h, 1]);
    gl.uniformMatrix4fv(u.model, false, model);
    gl.drawElements(gl.TRIANGLES, ids.length, gl.UNSIGNED_BYTE, 0);

    [x0, y0] = [x1, y1];
  };
  window.addEventListener("pointerdown", brush);
  window.addEventListener("pointermove", brush);
  window.addEventListener("pointerup", (event) => {
    if (brushPointerId === event.pointerId) brushPointerId = -1;
  });
  canvas.style.touchAction = "none";
});
