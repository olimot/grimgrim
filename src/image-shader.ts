import { mat4, ReadonlyMat4 } from "gl-matrix";

export interface TextureInfo {
  texture: WebGLTexture;
  data: TexImageSource | ArrayBufferView<ArrayBufferLike> | null;
  width: number;
  height: number;
}

export function createImageTexture(gl: WebGL2RenderingContext): TextureInfo {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, data: null, width: 1, height: 1 };
}

export interface F32TextureInfo extends TextureInfo {
  texture: WebGLTexture;
  data: Float32Array;
  width: number;
  height: number;
  upload: () => void;
}

export function createF32Texture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data = new Float32Array(width * height * 4),
): F32TextureInfo {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const [w, h] = [width, height];
  const upload = () => {
    const target = gl.TEXTURE_2D;
    gl.bindTexture(target, texture);
    gl.texImage2D(target, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
  };
  upload();

  return { texture, data, width, height, upload };
}

export function createImageShaderProgram(gl: WebGL2RenderingContext) {
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
    }`,
  );
  gl.shaderSource(
    frag,
    /* glsl */ `#version 300 es
    precision highp float;
    uniform sampler2D baseColorTexture;
    uniform float opacity;
    in vec2 texCoord;
    out vec4 finalColor;
    void main() {
      finalColor = texture(baseColorTexture, texCoord);
      finalColor.a *= opacity;
    }`,
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

  const u = {
    model: gl.getUniformLocation(program, "model"),
    view: gl.getUniformLocation(program, "view"),
    projection: gl.getUniformLocation(program, "projection"),
    baseColorTexture: gl.getUniformLocation(program, "baseColorTexture"),
    opacity: gl.getUniformLocation(program, "opacity"),
  };

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

  const view = mat4.lookAt(mat4.create(), [0, 0, 1], [0, 0, 0], [0, 1, 0]);
  const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
  const projection = mat4.ortho(mat4.create(), 0, w, h, 0, 0, 1);
  const innerModel = mat4.create();

  const framebuffer = gl.createFramebuffer();

  const use = () => {
    gl.useProgram(program);
    gl.frontFace(gl.CCW);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.uniformMatrix4fv(u.view, false, view);
    gl.uniform1i(u.baseColorTexture, 0);
    gl.bindVertexArray(vao);
  };

  const bindFramebuffer = (dst: TextureInfo | null = null) => {
    let w: number;
    let h: number;
    if (dst === null) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      ({ drawingBufferWidth: w, drawingBufferHeight: h } = gl);
    } else {
      const target = gl.FRAMEBUFFER;
      const attachment = gl.COLOR_ATTACHMENT0;
      const textarget = gl.TEXTURE_2D;
      gl.bindFramebuffer(target, framebuffer);
      gl.framebufferTexture2D(target, attachment, textarget, dst.texture, 0);
      ({ width: w, height: h } = dst);
    }
    gl.viewport(0, 0, w, h);
    mat4.ortho(projection, 0, w, h, 0, 0, 1);
    gl.uniformMatrix4fv(u.projection, false, projection);
  };

  const draw = (
    src: TextureInfo,
    model: ReadonlyMat4 | null | undefined = null,
    opacity = 1,
  ) => {
    gl.uniform1i(u.baseColorTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    if (!model) mat4.fromScaling(innerModel, [src.width, src.height, 1]);
    gl.uniformMatrix4fv(u.model, false, model ?? innerModel);
    gl.uniform1f(u.opacity, opacity);
    gl.drawElements(gl.TRIANGLES, ids.length, gl.UNSIGNED_BYTE, 0);
  };

  return { use, bindFramebuffer, draw };
}
