import type { HydratedDocument } from "mongoose";

export function toJsonTransform(_doc: HydratedDocument<unknown>, ret: Record<string, unknown>) {
  if (ret._id) {
    ret.id = String(ret._id);
    delete ret._id;
  }
  delete ret.__v;
  return ret;
}
