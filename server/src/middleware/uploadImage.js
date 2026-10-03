import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(ApiError.badRequest('Only jpeg, png, and webp images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('image');

/** Accept one in-memory image on field `image`. */
export function uploadProductImage(req, res, next) {
  upload(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof ApiError) {
      next(err);
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5 MB or smaller'
          : 'Invalid image upload';
      next(ApiError.badRequest(message));
      return;
    }
    next(err);
  });
}
