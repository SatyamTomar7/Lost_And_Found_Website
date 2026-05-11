import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary-v2";
import multer from "multer";
import { FILE_UPLOAD } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";

// ─── Validate required env vars at startup ───────────────────────────────────
const REQUIRED_ENV = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required Cloudinary environment variables: ${missingEnv.join(", ")}`
  );
}

// ─── Configure Cloudinary ─────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs in production
});

// ─── Storage ──────────────────────────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER || "lost-found-amity",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: (_req, _file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `item_${timestamp}_${randomString}`;
    },
    // Single transformation object with format inline (avoids chained pipeline issues)
    transformation: [
      {
        width: 800,
        height: 600,
        crop: "limit",
        quality: "auto:good", // more explicit quality tier for production
        fetch_format: "auto",  // replaces the separate { format: "auto" } step
      },
    ],
  },
});

// ─── Multer instance ──────────────────────────────────────────────────────────
const uploadToCloudinary = multer({
  storage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          400,
          `Invalid file type "${file.mimetype}". Allowed types: ${FILE_UPLOAD.ALLOWED_TYPES.join(", ")}`
        ),
        false
      );
    }
  },
});

// ─── Upload middleware exports ────────────────────────────────────────────────
export const uploadSingle = uploadToCloudinary.single("image");
export const uploadMultiple = uploadToCloudinary.array("images", 5);

/**
 * Express error-handling middleware to catch multer errors uniformly.
 * Mount AFTER uploadSingle / uploadMultiple in your route:
 *
 *   router.post("/upload", uploadSingle, handleUploadError, yourController);
 */
export const handleUploadError = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError) {
    // e.g. LIMIT_FILE_SIZE, LIMIT_FILE_COUNT
    return next(new ApiError(400, `Upload error: ${err.message}`));
  }
  if (err instanceof ApiError) {
    return next(err);
  }
  if (err) {
    return next(new ApiError(500, "Unexpected upload failure"));
  }
  next();
};

// ─── Cloudinary helpers ───────────────────────────────────────────────────────

/**
 * Delete an image from Cloudinary by its public ID.
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export const deleteImage = async (publicId) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required to delete an image");
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok" && result.result !== "not found") {
      throw new ApiError(500, `Cloudinary deletion failed for: ${publicId}`);
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Failed to delete image: ${error.message}`);
  }
};

/**
 * Fetch metadata for an image stored in Cloudinary.
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export const getImageDetails = async (publicId) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required");
  }

  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    // Cloudinary returns error.http_code for API errors
    if (error.http_code === 404) {
      throw new ApiError(404, `Image not found: ${publicId}`);
    }
    throw new ApiError(500, `Failed to fetch image details: ${error.message}`);
  }
};

/**
 * Build an optimized, CDN-served image URL.
 * @param {string} publicId
 * @param {object} options  - Cloudinary transformation options
 * @returns {string}
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required to build a URL");
  }

  const defaultOptions = {
    width: 400,
    height: 300,
    crop: "fill",
    quality: "auto:good",
    fetch_format: "auto",
    secure: true,
  };

  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

/**
 * Build a square thumbnail URL.
 * @param {string} publicId
 * @returns {string}
 */
export const getThumbnailUrl = (publicId) => {
  return getOptimizedImageUrl(publicId, {
    width: 150,
    height: 150,
    crop: "thumb",
    gravity: "center",
  });
};

/**
 * Generate a signed URL for private/secure asset delivery.
 * Useful when images should not be publicly accessible without auth.
 * @param {string} publicId
 * @param {number} expiresInSeconds  - default 1 hour
 * @returns {string}
 */
export const getSignedUrl = (publicId, expiresInSeconds = 3600) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required to sign a URL");
  }

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    fetch_format: "auto",
    quality: "auto:good",
  });
};