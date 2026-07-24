require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  cloudinaryFolderName: process.env.CLOUDINARY_FOLDER_NAME || 'jimmy-jobs',
};
