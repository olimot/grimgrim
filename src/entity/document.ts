import { GrimLayer } from "./layer";

export interface GrimDocument {
  width: number;
  height: number;
  layers: GrimLayer[];
}

export function createDocument(width: number, height: number): GrimDocument {
  return { width, height, layers: [] };
}
