/** Expose Mongo `_id` as `id` and never send `passwordHash`. */
export function applyJsonId(schema) {
  const transform = (_doc, ret) => {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.passwordHash;
    return ret;
  };

  schema.set('toJSON', { virtuals: true, versionKey: false, transform });
  schema.set('toObject', { virtuals: true, versionKey: false, transform });
}
