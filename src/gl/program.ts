export interface GLProgramBuilder {
  name: string;
  vertexShaderSource: string;
  fragmentShaderSource: string;
  attribLocation?: Record<number, string>;
}

export function createPrograms(
  gl: WebGL2RenderingContext,
  builders: GLProgramBuilder[],
) {
  const processings: {
    builder: GLProgramBuilder;
    vertexShader: WebGLShader | null;
    fragmentShader: WebGLShader | null;
    program: WebGLProgram | null;
    error?: Error | undefined;
  }[] = [];

  for (const builder of builders) {
    const vertexShader = null;
    const fragmentShader = null;
    const program = null;
    processings.push({ builder, vertexShader, fragmentShader, program });
  }

  for (const processing of processings) {
    if (processing.error) continue;
    processing.vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!processing.vertexShader) {
      processing.error = new Error(`Couldn't create vertex shader`);
      continue;
    }
    processing.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!processing.fragmentShader) {
      processing.error = new Error(`Couldn't create fragment shader`);
    }
  }

  for (const processing of processings) {
    if (processing.error) continue;
    const { vertexShaderSource, fragmentShaderSource } = processing.builder;
    gl.shaderSource(processing.vertexShader!, vertexShaderSource);
    gl.shaderSource(processing.fragmentShader!, fragmentShaderSource);
  }

  for (const processing of processings) {
    if (processing.error) continue;
    gl.compileShader(processing.vertexShader!);
    gl.compileShader(processing.fragmentShader!);
  }

  for (const processing of processings) {
    if (processing.error) continue;
    processing.program = gl.createProgram();
    if (!processing.program) {
      processing.error = new Error(`Couldn't create program`);
      continue;
    }
    const { program, vertexShader, fragmentShader } = processing;
    gl.attachShader(program, vertexShader!);
    gl.attachShader(program, fragmentShader!);

    const { attribLocation, name } = processing.builder;
    if (attribLocation) {
      for (const [location, attribName] of Object.entries(attribLocation)) {
        gl.bindAttribLocation(processing.program, Number(location), attribName);
      }
    }

    gl.linkProgram(processing.program);

    if (!gl.getProgramParameter(processing.program, gl.LINK_STATUS)) {
      console.error(`Link failed: ${gl.getProgramInfoLog(program)}`);
      console.log(`Vertex Shader: ${gl.getShaderInfoLog(vertexShader!)}`);
      console.log(`Fragment Shader: ${gl.getShaderInfoLog(fragmentShader!)}`);
      console.error(`an error occured during building ${name}`);
      processing.error = new Error("Couldn't link program.");
    }
  }

  return processings;
}

// export function createImageShaderProgram(gl: WebGL2RenderingContext) {
//   // # create program
//   const vert = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
//   const frag = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
//   gl.shaderSource(
//     vert,
//     /* glsl */ `#version 300 es
//     uniform mat4 model;
//     uniform mat4 view;
//     uniform mat4 projection;
//     in vec4 POSITION;
//     in vec2 TEXCOORD_0;
//     out vec2 texCoord;
//     void main() {
//       texCoord = TEXCOORD_0;
//       gl_Position = projection * view * model * POSITION;
//     }`,
//   );
//   gl.shaderSource(
//     frag,
//     /* glsl */ `#version 300 es
//     precision highp float;
//     uniform sampler2D baseColorTexture;
//     uniform sampler2D maskTexture;

//     in vec2 texCoord;
//     out vec4 finalColor;
//     void main() {
//       finalColor = texture(baseColorTexture, texCoord);
//       finalColor.a *= texture(maskTexture, texCoord).r;
//     }`,
//   );
//   gl.compileShader(vert);
//   gl.compileShader(frag);
//   const program = gl.createProgram() as WebGLProgram;
//   gl.attachShader(program, vert);
//   gl.attachShader(program, frag);
//   gl.bindAttribLocation(program, 0, "POSITION");
//   gl.bindAttribLocation(program, 1, "TEXCOORD_0");
//   gl.linkProgram(program);

//   let log: string | null;
//   if ((log = gl.getShaderInfoLog(vert))) console.log(log);
//   if ((log = gl.getShaderInfoLog(frag))) console.log(log);
//   if ((log = gl.getProgramInfoLog(program))) console.log(log);

//   const u = {
//     model: gl.getUniformLocation(program, "model"),
//     view: gl.getUniformLocation(program, "view"),
//     projection: gl.getUniformLocation(program, "projection"),
//     baseColorTexture: gl.getUniformLocation(program, "baseColorTexture"),
//     maskTexture: gl.getUniformLocation(program, "maskTexture"),
//   };

//   const vertices = [0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0];
//   const texCoords = [0, 1, 0, 0, 1, 0, 1, 1];
//   const ids = [0, 1, 2, 2, 3, 0];
//   const vao = gl.createVertexArray();
//   gl.bindVertexArray(vao);
//   gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
//   gl.enableVertexAttribArray(0);
//   gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
//   gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
//   gl.enableVertexAttribArray(1);
//   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
//   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
//   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(ids), gl.STATIC_DRAW);
//   gl.bindVertexArray(null);

//   const view = mat4.lookAt(mat4.create(), [0, 0, 1], [0, 0, 0], [0, 1, 0]);
//   const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
//   const projection = mat4.ortho(mat4.create(), 0, w, h, 0, 0, 1);
//   const innerModel = mat4.create();

//   const framebuffer = gl.createFramebuffer();

//   const use = () => {
//     gl.useProgram(program);
//     gl.frontFace(gl.CCW);
//     gl.disable(gl.CULL_FACE);
//     gl.disable(gl.DEPTH_TEST);
//     gl.enable(gl.BLEND);
//     gl.uniformMatrix4fv(u.view, false, view);
//     gl.uniform1i(u.baseColorTexture, 0);
//     gl.uniform1i(u.maskTexture, 1);
//     gl.bindVertexArray(vao);
//   };

//   const bindFramebuffer = (dst: TextureInfo | null = null) => {
//     let w: number;
//     let h: number;
//     if (dst === null) {
//       gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//       ({ drawingBufferWidth: w, drawingBufferHeight: h } = gl);
//     } else {
//       const target = gl.FRAMEBUFFER;
//       const attachment = gl.COLOR_ATTACHMENT0;
//       const textarget = gl.TEXTURE_2D;
//       gl.bindFramebuffer(target, framebuffer);
//       gl.framebufferTexture2D(target, attachment, textarget, dst.texture, 0);
//       ({ width: w, height: h } = dst);
//     }
//     gl.viewport(0, 0, w, h);
//     mat4.ortho(projection, 0, w, h, 0, 0, 1);
//     gl.uniformMatrix4fv(u.projection, false, projection);
//   };

//   const initialMask = createR32FDataTexture(gl, 1, 1, new Float32Array([1]));

//   const draw = (
//     src: TextureInfo,
//     mask = initialMask,
//     model: ReadonlyMat4 = mat4.fromScaling(innerModel, [
//       src.width,
//       src.height,
//       1,
//     ]),
//   ) => {
//     gl.activeTexture(gl.TEXTURE0);
//     if (src === mask) gl.bindTexture(gl.TEXTURE_2D, initialMask.texture);
//     else gl.bindTexture(gl.TEXTURE_2D, src.texture);
//     gl.activeTexture(gl.TEXTURE1);
//     gl.bindTexture(gl.TEXTURE_2D, mask.texture);

//     gl.uniformMatrix4fv(u.model, false, model);

//     gl.drawElements(gl.TRIANGLES, ids.length, gl.UNSIGNED_BYTE, 0);
//   };

//   return { use, bindFramebuffer, draw };
// }
