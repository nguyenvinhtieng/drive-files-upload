const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const config = require('../config');

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

function normalizeRelativePath(relativePath = '') {
  if (!relativePath) return '';

  return String(relativePath)
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
}

function getFullPath(relativePath = '') {
  return normalizeRelativePath(relativePath);
}

function getFileName(resource) {
  const baseName = resource.public_id.split('/').pop();
  if (resource.format && !baseName.endsWith(`.${resource.format}`)) {
    return `${baseName}.${resource.format}`;
  }
  return baseName;
}

function mapResource(resource) {
  const publicId = resource.public_id;
  const folderPath = publicId.includes('/') ? publicId.split('/').slice(0, -1).join('/') : '';

  return {
    id: publicId,
    name: getFileName(resource),
    mimeType: resource.format ? `${resource.resource_type}/${resource.format}` : resource.resource_type,
    resourceType: resource.resource_type,
    size: resource.bytes,
    modifiedTime: resource.created_at,
    createdTime: resource.created_at,
    secureUrl: resource.secure_url,
    thumbnailUrl: resource.resource_type === 'image'
      ? cloudinary.url(publicId, {
          secure: true,
          width: 200,
          height: 200,
          crop: 'fill',
          quality: 'auto',
        })
      : null,
    isImage: resource.resource_type === 'image',
    folderPath,
  };
}

function mapFolder(folder) {
  const fullPath = folder.path || folder.name;

  return {
    id: fullPath,
    name: folder.name || fullPath.split('/').pop() || fullPath,
    path: fullPath,
    fullPath,
    isFolder: true,
  };
}

function isDirectChild(publicId, folderPath) {
  if (!folderPath) {
    return !publicId.includes('/');
  }

  const prefix = `${folderPath}/`;
  if (!publicId.startsWith(prefix)) return false;
  const remainder = publicId.slice(prefix.length);
  return remainder.length > 0 && !remainder.includes('/');
}

async function listRootFolders() {
  const result = await cloudinary.api.root_folders();
  return (result.folders || []).map(mapFolder);
}

async function listSubfolders(folderPath) {
  const result = await cloudinary.api
    .sub_folders(folderPath)
    .catch((error) => {
      if (error?.error?.http_code === 404) {
        return { folders: [] };
      }
      throw error;
    });

  return (result.folders || []).map(mapFolder);
}

async function listDirectFiles(folderPath) {
  const resourceTypes = ['image', 'raw', 'video'];
  const prefix = folderPath ? `${folderPath}/` : '';

  const results = await Promise.all(
    resourceTypes.map((resourceType) =>
      cloudinary.api
        .resources({
          type: 'upload',
          resource_type: resourceType,
          ...(prefix ? { prefix } : {}),
          max_results: 500,
        })
        .catch(() => ({ resources: [] }))
    )
  );

  return results
    .flatMap((result) => result.resources || [])
    .filter((resource) => isDirectChild(resource.public_id, folderPath))
    .map(mapResource);
}

async function listFolderContents(relativePath = '') {
  const folderPath = getFullPath(relativePath);

  const [folders, files] = await Promise.all([
    folderPath ? listSubfolders(folderPath) : listRootFolders(),
    listDirectFiles(folderPath),
  ]);

  files.sort((a, b) => new Date(b.modifiedTime || b.createdTime) - new Date(a.modifiedTime || a.createdTime));
  folders.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  return {
    cloudName: config.cloudinaryCloudName,
    currentPath: folderPath,
    folders,
    files,
  };
}

async function collectAllSubfolderPaths(folderPath) {
  const subfolders = await listSubfolders(folderPath);
  const paths = [];

  for (const subfolder of subfolders) {
    paths.push(subfolder.path);
    const nested = await collectAllSubfolderPaths(subfolder.path);
    paths.push(...nested);
  }

  return paths;
}

async function deleteResourcesByFolderPrefix(folderPath) {
  const prefix = `${folderPath}/`;
  const resourceTypes = ['image', 'raw', 'video'];

  await Promise.all(
    resourceTypes.map((resourceType) =>
      cloudinary.api
        .delete_resources_by_prefix(prefix, { resource_type: resourceType })
        .catch(() => ({}))
    )
  );
}

async function deleteFolder(relativePath) {
  const folderPath = getFullPath(relativePath);

  if (!folderPath) {
    const error = new Error('Cannot delete root folder');
    error.status = 400;
    throw error;
  }

  const descendantPaths = await collectAllSubfolderPaths(folderPath);
  await deleteResourcesByFolderPrefix(folderPath);

  const foldersToDelete = [...descendantPaths, folderPath].sort(
    (a, b) => b.split('/').length - a.split('/').length
  );

  for (const path of foldersToDelete) {
    await cloudinary.api.delete_folder(path).catch((error) => {
      if (error?.error?.http_code === 404) return;
      throw error;
    });
  }

  return { success: true, path: folderPath };
}

async function createFolder(relativePath, folderName) {
  const parentPath = getFullPath(relativePath);
  const safeName = String(folderName || '')
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .pop();

  if (!safeName) {
    const error = new Error('Invalid folder name');
    error.status = 400;
    throw error;
  }

  const fullPath = parentPath ? `${parentPath}/${safeName}` : safeName;
  await cloudinary.api.create_folder(fullPath);
  return mapFolder({ path: fullPath, name: safeName });
}

function getPublicIdBaseName(originalName = '') {
  const baseName = String(originalName).replace(/\\/g, '/').split('/').pop() || 'file';
  const lastDot = baseName.lastIndexOf('.');
  if (lastDot <= 0) return baseName;
  return baseName.slice(0, lastDot);
}

function buildPublicId(folderPath, baseName) {
  return folderPath ? `${folderPath}/${baseName}` : baseName;
}

function createRandomSuffix(length = 6) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

async function publicIdExists(publicId) {
  const resourceTypes = ['image', 'raw', 'video'];

  for (const resourceType of resourceTypes) {
    try {
      await cloudinary.api.resource(publicId, { resource_type: resourceType });
      return true;
    } catch (error) {
      if (error?.error?.http_code === 404) continue;
      throw error;
    }
  }

  return false;
}

async function resolveUniquePublicIdBaseName(originalName, folderPath, usedPublicIds = new Set()) {
  const baseName = getPublicIdBaseName(originalName);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseName : `${baseName}_${createRandomSuffix()}`;
    const publicId = buildPublicId(folderPath, candidate);

    if (usedPublicIds.has(publicId)) continue;

    usedPublicIds.add(publicId);

    if (!(await publicIdExists(publicId))) {
      return candidate;
    }

    usedPublicIds.delete(publicId);
  }

  const error = new Error('Could not generate a unique file name');
  error.status = 500;
  throw error;
}

async function uploadFile(buffer, originalName, relativePath = '', usedPublicIds = new Set()) {
  const folderPath = getFullPath(relativePath);
  const publicIdBaseName = await resolveUniquePublicIdBaseName(originalName, folderPath, usedPublicIds);

  return new Promise((resolve, reject) => {
    const options = {
      resource_type: 'auto',
      use_filename: true,
      unique_filename: false,
      filename_override: publicIdBaseName,
    };

    if (folderPath) {
      options.folder = folderPath;
    }

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(mapResource(result));
    });

    stream.end(buffer);
  });
}

async function uploadFiles(fileList, relativePath = '') {
  const usedPublicIds = new Set();
  const results = await Promise.allSettled(
    fileList.map((file) => uploadFile(file.buffer, file.originalname, relativePath, usedPublicIds))
  );

  const files = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      files.push(result.value);
    } else {
      failed.push({
        name: fileList[index].originalname,
        error: result.reason?.message || 'Upload failed',
      });
    }
  });

  if (!files.length && failed.length) {
    const error = new Error(failed[0].error || 'Upload failed');
    error.status = 500;
    throw error;
  }

  return { files, failed };
}

async function getResourceByPublicId(publicId) {
  const resourceTypes = ['image', 'raw', 'video'];
  let lastError;

  for (const resourceType of resourceTypes) {
    try {
      const resource = await cloudinary.api.resource(publicId, { resource_type: resourceType });
      return mapResource(resource);
    } catch (error) {
      if (error?.error?.http_code === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  const error = new Error('File not found');
  error.status = 404;
  throw lastError || error;
}

async function getFile(publicId) {
  return getResourceByPublicId(publicId);
}

async function deleteFile(publicId) {
  const file = await getResourceByPublicId(publicId);
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: file.resourceType });

  if (result.result !== 'ok') {
    const error = new Error('Failed to delete file');
    error.status = 500;
    throw error;
  }

  return { success: true, id: publicId };
}

async function deleteFiles(publicIds) {
  const results = await Promise.allSettled(
    publicIds.map((publicId) => deleteFile(publicId))
  );

  const deleted = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      deleted.push(publicIds[index]);
    } else {
      failed.push({ id: publicIds[index], error: result.reason?.message || 'Failed to delete file' });
    }
  });

  if (!deleted.length && failed.length) {
    const error = new Error(failed[0].error || 'Failed to delete file');
    error.status = 404;
    throw error;
  }

  return { deleted, failed };
}

function getDownloadUrl(publicId, fileName) {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: 'auto',
    flags: fileName ? `attachment:${fileName}` : 'attachment',
  });
}

module.exports = {
  normalizeRelativePath,
  getFullPath,
  listFolderContents,
  createFolder,
  deleteFolder,
  uploadFile,
  uploadFiles,
  getFile,
  deleteFile,
  deleteFiles,
  getDownloadUrl,
};
