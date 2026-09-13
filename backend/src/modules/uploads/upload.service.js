import { fileTypeFromBuffer } from "file-type";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { FILE_UPLOAD } from "../../config/constants.js";
import { ApiError } from "../../shared/utils/ApiError.js";

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

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: FILE_UPLOAD.CLOUDINARY_TIMEOUT_MS,
});

const storage = multer.memoryStorage();

const uploadToMemory = multer({
  storage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (!FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, "Unsupported image type"), false);
    }
    cb(null, true);
  },
});

export const uploadSingle = uploadToMemory.single("image");
export const uploadMultiple = uploadToMemory.array("images", 5);

const getUploadOptions = () => ({
  folder: process.env.CLOUDINARY_FOLDER || "lost-found-amity",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  public_id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  transformation: [
    {
      width: 800,
      height: 600,
      crop: "limit",
      quality: "auto:good",
      fetch_format: "auto",
    },
  ],
});

export const isSupportedImage = (detectedType) =>
  detectedType &&
  FILE_UPLOAD.ALLOWED_TYPES.includes(detectedType.mime) &&
  ["jpg", "jpeg", "png", "webp"].includes(detectedType.ext);

export const storeUploadedFile = async (file) => {
  const detectedType = await fileTypeFromBuffer(file.buffer);
  if (!isSupportedImage(detectedType)) {
    throw new ApiError(400, "Uploaded file content is not a supported image");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let uploadStream;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      uploadStream.destroy(new Error("Cloudinary upload timed out"));
      reject(new ApiError(502, "Image upload provider unavailable"));
    }, FILE_UPLOAD.CLOUDINARY_TIMEOUT_MS);

    uploadStream = cloudinary.uploader.upload_stream(
      getUploadOptions(),
      (error, result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error || !result) {
          return reject(new ApiError(502, "Image upload provider unavailable"));
        }
        resolve({
          ...file,
          filename: result.public_id,
          path: result.secure_url,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

export const handleUploadError = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "Image exceeds the maximum allowed size"));
    }
    return next(new ApiError(400, "Upload request is invalid"));
  }
  if (err instanceof ApiError) return next(err);
  if (err) return next(new ApiError(502, "Image upload provider unavailable"));
  next();
};

export const deleteImage = async (publicId) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required to delete an image");
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok" && result.result !== "not found") {
      throw new ApiError(502, "Image cleanup provider unavailable");
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "Image cleanup provider unavailable");
  }
};

export const getImageDetails = async (publicId) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required");
  }

  try {
    return await cloudinary.api.resource(publicId);
  } catch (error) {
    if (error.http_code === 404) {
      throw new ApiError(404, "Image not found");
    }
    throw new ApiError(502, "Image provider unavailable");
  }
};

export const getOptimizedImageUrl = (publicId, options = {}) => {
  if (!publicId || typeof publicId !== "string") {
    throw new ApiError(400, "A valid publicId is required to build a URL");
  }

  return cloudinary.url(publicId, {
    width: 400,
    height: 300,
    crop: "fill",
    quality: "auto:good",
    fetch_format: "auto",
    secure: true,
    ...options,
  });
};

export const getThumbnailUrl = (publicId) =>
  getOptimizedImageUrl(publicId, {
    width: 150,
    height: 150,
    crop: "thumb",
    gravity: "center",
  });

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
