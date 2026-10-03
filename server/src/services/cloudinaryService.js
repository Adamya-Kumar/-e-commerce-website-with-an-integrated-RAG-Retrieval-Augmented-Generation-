import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const PRODUCT_IMAGE_FOLDER = 'spark-commerce/products';

let configured = false;

function ensureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      'Cloudinary is not configured',
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    configured = true;
  }
}

/**
 * Upload an image buffer into `spark-commerce/products`.
 * @param {Buffer} buffer
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export function uploadProductImage(buffer) {
  ensureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: PRODUCT_IMAGE_FOLDER, resource_type: 'image' },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          reject(error || new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Remove a stored product image. Missing assets are ignored.
 * @param {string} publicId
 */
export async function deleteProductImage(publicId) {
  if (!publicId) {
    return;
  }
  ensureCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
  });
  if (result?.result !== 'ok' && result?.result !== 'not found') {
    logger.error({ publicId, result }, 'Cloudinary delete failed');
    throw new Error('Cloudinary delete failed');
  }
}
