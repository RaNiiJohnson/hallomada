import { makeCloudinaryAPI } from "@imaxis/cloudinary-convex";
import { components } from "../_generated/api";

// Export all API functions - uses environment variables automatically
export const {
  upload,
  transform,
  deleteAsset,
  listAssets,
  getAsset,
  updateAsset,
  generateUploadCredentials,
  finalizeUpload,
} = makeCloudinaryAPI(components.cloudinary);
