const cloudinary = require('cloudinary').v2;
const config = require('../config');

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

function getFileName(resource) {
  const baseName = resource.public_id.split('/').pop();
  if (resource.format && !baseName.endsWith(`.${resource.format}`)) {
    return `${baseName}.${resource.format}`;
  }
  return baseName;
}

function mapResource(resource) {
  return {
    id: resource.public_id,
    name: getFileName(resource),
    mimeType: resource.format ? `${resource.resource_type}/${resource.format}` : resource.resource_type,
    size: resource.bytes,
    modifiedTime: resource.created_at,
    createdTime: resource.created_at,
    secureUrl: resource.secure_url,
    isImage: resource.resource_type === 'image',
  };
}

function assertInFolder(publicId) {
  const folderPrefix = `${config.cloudinaryFolderName}/`;
  if (!publicId.startsWith(folderPrefix)) {
    const error = new Error('File not found in configured folder');
    error.status = 404;
    throw error;
  }
}

async function uploadFile(buffer, originalName) {
  const folder = config.cloudinaryFolderName;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: originalName,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(mapResource(result));
      }
    );

    stream.end(buffer);
  });
}

async function listFiles() {
  const folder = config.cloudinaryFolderName;
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: `${folder}/`,
    max_results: 500,
  });

  return (result.resources || []).map(mapResource);
}

async function getFile(publicId) {
  assertInFolder(publicId);

  const resource = await cloudinary.api.resource(publicId, { resource_type: 'auto' });
  return mapResource(resource);
}

function getDownloadUrl(publicId, fileName) {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'auto',
    flags: fileName ? `attachment:${fileName}` : 'attachment',
  });
}

module.exports = {
  uploadFile,
  listFiles,
  getFile,
  getDownloadUrl,
};
