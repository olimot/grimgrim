import { vec2 } from "gl-matrix";

export interface GLTextureInfo {
  gl: WebGL2RenderingContext;
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  data: ArrayBufferView<ArrayBufferLike>;
  position: vec2;
  size: vec2;
  format: GLenum;
  internalFormat: GLenum;
  type: GLenum;
}

export interface TexImageSourceProp {
  src: TexImageSource;
}

export interface ArrayBufferImage {
  data?: ArrayBufferView<ArrayBufferLike> | null;
  width: number;
  height: number;
  format?: GLenum;
  internalFormat?: GLenum;
  type?: GLenum;
}

export function createTexture(
  gl: WebGL2RenderingContext,
  image: TexImageSourceProp | ArrayBufferImage,
): GLTextureInfo {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const fbTarget = gl.FRAMEBUFFER;
  const attachment = gl.COLOR_ATTACHMENT0;
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(fbTarget, framebuffer);
  gl.framebufferTexture2D(fbTarget, attachment, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(fbTarget, null);

  let width = 0;
  let height = 0;
  let int: GLenum = gl.RGBA;
  let format: GLenum = gl.RGBA;
  let type: GLenum = gl.UNSIGNED_BYTE;
  let data: ArrayBufferView<ArrayBufferLike>;
  if ("width" in image) {
    ({ width, height } = image);
    data = image.data ?? new Uint8ClampedArray(width * height * 4);
    if (image.internalFormat) int = image.internalFormat;
    if (image.format) format = image.format;
    if (image.type) type = image.type;
    gl.texImage2D(gl.TEXTURE_2D, 0, int, width, height, 0, format, type, data);
  } else {
    const { src } = image;
    if ("width" in src) ({ width, height } = src);
    else ({ codedWidth: width, codedHeight: height } = src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    if ("data" in src) {
      ({ data } = src);
    } else {
      data = new Uint8ClampedArray(width * height * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {
    gl,
    texture,
    framebuffer,
    data,
    position: vec2.create(),
    size: vec2.fromValues(width, height),
    internalFormat: int,
    format,
    type,
  };
}
