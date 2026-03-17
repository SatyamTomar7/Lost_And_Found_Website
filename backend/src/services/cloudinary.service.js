import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { FILE_UPLOAD } from "../constants.js";
import { ApiError } from "../utils/ApiError.js";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "lost-found-amity",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      return `item_${timestamp}_${randomString}`;
    },
    transformation: [
      { width: 800, height: 600, crop: "limit", quality: "auto" },
      { format: "auto" },
    ],
  },
});

const uploadToCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type. Allowed types: ${FILE_UPLOAD.ALLOWED_TYPES.join(", ")}`
        ),
        false
      );
    }
  },
});

export const uploadSingle = uploadToCloudinary.single("image");
export const uploadMultiple = uploadToCloudinary.array("images", 5);

export const deleteImage = async (publicId) => {
  const result = await cloudinary.uploader.destroy(publicId);
  if (result.result !== "ok") {
    throw new ApiError(400, `Failed to delete image: ${result.result}`);
  }
  return result;
};

export const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    throw new ApiError(404, `Image not found: ${publicId}`);
  }
};

export const getOptimizedImagesUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 400,
    height: 300,
    crop: "fill",
    quality: "auto",
    format: "auto",
  };
  const finalOptions = { ...defaultOptions, ...options };
  return cloudinary.url(publicId, finalOptions);
};

export const getThumbnailUrl = (publicId) => {
  return getOptimizedImagesUrl(publicId, {
    width: 150,
    height: 150,
    crop: "thumb",
    gravity: "center",
  });
};
