import { ReadonlyVec2 } from "gl-matrix";
import { Rect } from "../util";

export interface GLTextureInfo<
  T extends ArrayBufferView<ArrayBufferLike> = ArrayBufferView<ArrayBufferLike>,
> extends Rect {
  gl: WebGL2RenderingContext;
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  data: T;
  format: GLenum;
  internalFormat: GLenum;
  type: GLenum;
}

export interface TexImageSourceProp {
  xy?: ReadonlyVec2;
  src: TexImageSource;
}

export interface BufferImage<
  T extends ArrayBufferView<ArrayBufferLike> = ArrayBufferView<ArrayBufferLike>,
> {
  fill?: number[] | Uint8Array | Uint8ClampedArray;
  data?: T | null;
  xy?: ReadonlyVec2;
  width: number;
  height: number;
  format?: GLenum;
  internalFormat?: GLenum;
  type?: GLenum;
}

export interface ConcreteBufferImage<
  T extends ArrayBufferView<ArrayBufferLike> = ArrayBufferView<ArrayBufferLike>,
> {
  fill?: number[] | Uint8Array | Uint8ClampedArray;
  data: T;
  width: number;
  height: number;
  format?: GLenum;
  internalFormat?: GLenum;
  type?: GLenum;
}

export function texImage(
  info: GLTextureInfo,
  image: TexImageSourceProp | BufferImage,
) {
  const { gl } = info;

  gl.bindTexture(gl.TEXTURE_2D, info.texture);

  if ("width" in image) {
    info.size[0] = image.width;
    info.size[1] = image.height;
    if (image.data) {
      info.data = image.data;
    } else {
      const newData = new Uint8ClampedArray(info.size[0] * info.size[1] * 4);
      const isRGB = image.fill?.length === 3;
      for (let i = 0; image.fill && i < newData.length; i += 4) {
        newData.set(image.fill, i);
        if (isRGB) newData[i + 3] = 255;
      }
      info.data = newData;
    }
    if (image.internalFormat) info.internalFormat = image.internalFormat;
    if (image.format) info.format = image.format;
    if (image.type) info.type = image.type;

    const { internalFormat: ifmt, size, format, type, data } = info;
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, ...size, 0, format, type, data);
  } else {
    const { src } = image;
    if ("width" in src) {
      info.size[0] = src.width;
      info.size[1] = src.height;
    } else {
      info.size[0] = src.codedWidth;
      info.size[1] = src.codedHeight;
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    if ("data" in src) {
      info.data = src.data;
    } else {
      info.data = new Uint8ClampedArray(info.size[0] * info.size[1] * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, info.framebuffer);
      gl.viewport(0, 0, info.size[0], info.size[1]);
      gl.readPixels(0, 0, ...info.size, gl.RGBA, gl.UNSIGNED_BYTE, info.data);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }
}

export function createTexture(
  gl: WebGL2RenderingContext,
  image: TexImageSourceProp | BufferImage,
): GLTextureInfo {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const fbTarget = gl.FRAMEBUFFER;
  const attachment = gl.COLOR_ATTACHMENT0;
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(fbTarget, framebuffer);
  gl.framebufferTexture2D(fbTarget, attachment, gl.TEXTURE_2D, texture, 0);
  gl.bindFramebuffer(fbTarget, null);

  const info: GLTextureInfo = {
    gl,
    texture,
    framebuffer,
    data: null!,
    xy: [image.xy?.[0] ?? 0, image.xy?.[1] ?? 0],
    size: [0, 0],
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
  };

  texImage(info, image);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return info;
}

export function getImageData(layer: GLTextureInfo) {
  const data = layer.data as unknown as Uint8ClampedArray;
  return new ImageData(data, layer.size[0], layer.size[1]);
}
