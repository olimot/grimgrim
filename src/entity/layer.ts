import { GrimDocument } from "./document";

export interface GrimLayer {
  ownerDocument?: GrimDocument;
}

export function createLayer(ownerDocument?: GrimDocument): GrimLayer {
  return { ownerDocument };
}
