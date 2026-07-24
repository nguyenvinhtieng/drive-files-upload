const cloudNameEl = document.getElementById('cloud-name');
const statFoldersEl = document.getElementById('stat-folders');
const statCountEl = document.getElementById('stat-count');
const statSizeEl = document.getElementById('stat-size');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const openUploadBtn = document.getElementById('open-upload-btn');
const browseBtn = document.getElementById('browse-btn');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const uploadDialog = document.getElementById('upload-dialog');
const cancelUploadBtn = document.getElementById('cancel-upload-btn');
const dropZone = document.getElementById('drop-zone');
const selectedFilesEl = document.getElementById('selected-files');
const selectedFilesListEl = document.getElementById('selected-files-list');
const selectedFilesSummaryEl = document.getElementById('selected-files-summary');
const clearFileBtn = document.getElementById('clear-file');
const refreshBtn = document.getElementById('refresh-btn');
const newFolderBtn = document.getElementById('new-folder-btn');
const listStatus = document.getElementById('list-status');
const filesList = document.getElementById('files-list');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const browseBreadcrumb = document.getElementById('browse-breadcrumb');
const uploadBreadcrumb = document.getElementById('upload-breadcrumb');
const newFolderDialog = document.getElementById('new-folder-dialog');
const newFolderForm = document.getElementById('new-folder-form');
const newFolderInput = document.getElementById('new-folder-input');
const cancelFolderBtn = document.getElementById('cancel-folder-btn');
const previewDialog = document.getElementById('preview-dialog');
const previewImage = document.getElementById('preview-image');
const previewTitle = document.getElementById('preview-title');
const previewDownload = document.getElementById('preview-download');
const previewCopyLink = document.getElementById('preview-copy-link');
const closePreviewBtn = document.getElementById('close-preview-btn');
const selectionBar = document.getElementById('selection-bar');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const selectAllLabel = document.getElementById('select-all-label');
const selectionCountEl = document.getElementById('selection-count');
const selectionActions = document.getElementById('selection-actions');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');

let cloudName = 'Cloudinary';
let currentPath = '';
let allFolders = [];
let allFiles = [];
let previewFile = null;
let selectedFileIds = new Set();
let selectedFolderPaths = new Set();

async function apiFetch(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Authentication required');
  }
  return response;
}

function setStatus(element, message, type) {
  element.textContent = message;
  element.className = `toast ${type || ''}`;
  element.classList.remove('hidden');
}

function clearStatus(element) {
  element.textContent = '';
  element.className = 'toast hidden';
}

function showFilesSkeleton(count = 8) {
  const cards = Array.from({ length: count }, () => '<div class="skeleton-card"></div>').join('');
  filesList.innerHTML = `<div class="skeleton-grid">${cards}</div>`;
}

function formatSize(bytes) {
  if (bytes == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(bytes);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function getFileTypeInfo(name) {
  const ext = getExtension(name);
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  if (archiveExts.includes(ext)) {
    return { ext: ext === 'gz' || ext === 'bz2' ? ext : ext, className: `file-icon--${ext === '7z' ? '7z' : ext === 'rar' ? 'rar' : 'zip'}` };
  }
  if (ext === 'pdf') return { ext: 'pdf', className: 'file-icon--pdf' };
  if (['doc', 'docx'].includes(ext)) return { ext: 'doc', className: 'file-icon--doc' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return { ext, className: 'file-icon--image' };
  }
  return { ext: ext || '?', className: 'file-icon--default' };
}

function getPathSegments(relativePath) {
  if (!relativePath) return [];
  return relativePath.split('/').filter(Boolean);
}

const FOLDER_PATH_PARAM = 'path';

function getPathFromUrl() {
  return new URLSearchParams(window.location.search).get(FOLDER_PATH_PARAM) || '';
}

function buildUrlForPath(path) {
  const url = new URL(window.location.href);
  if (path) {
    url.searchParams.set(FOLDER_PATH_PARAM, path);
  } else {
    url.searchParams.delete(FOLDER_PATH_PARAM);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function updateBrowserPath(path, { replace = false } = {}) {
  const newUrl = buildUrlForPath(path);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (newUrl === currentUrl) return;

  const state = { path: path || '' };
  if (replace) {
    history.replaceState(state, '', newUrl);
  } else {
    history.pushState(state, '', newUrl);
  }
}

function renderBreadcrumb(container, relativePath, onNavigate) {
  const segments = getPathSegments(relativePath);
  const parts = [
    `<button type="button" class="breadcrumb-item breadcrumb-item--root" data-path="">Root</button>`,
  ];

  let builtPath = '';
  segments.forEach((segment) => {
    builtPath = builtPath ? `${builtPath}/${segment}` : segment;
    parts.push('<span class="breadcrumb-sep" aria-hidden="true">/</span>');
    parts.push(
      `<button type="button" class="breadcrumb-item" data-path="${escapeHtml(builtPath)}">${escapeHtml(segment)}</button>`
    );
  });

  container.innerHTML = parts.join('');

  container.querySelectorAll('.breadcrumb-item').forEach((btn) => {
    btn.addEventListener('click', () => onNavigate(btn.dataset.path || ''));
  });
}

function updateBreadcrumbs() {
  renderBreadcrumb(browseBreadcrumb, currentPath, navigateTo);
  renderBreadcrumb(uploadBreadcrumb, currentPath, navigateTo);
}

function navigateTo(path) {
  currentPath = path || '';
  updateBrowserPath(currentPath);
  clearSelection();
  updateBreadcrumbs();
  loadFolder();
}

function getVisibleItems() {
  return filterItems(allFolders, allFiles, searchInput.value);
}

function getVisibleFiles() {
  return getVisibleItems().files;
}

function clearSelection() {
  selectedFileIds.clear();
  selectedFolderPaths.clear();
  updateSelectionUI();
}

function toggleFileSelection(fileId, selected) {
  if (selected) {
    selectedFileIds.add(fileId);
  } else {
    selectedFileIds.delete(fileId);
  }
  updateSelectionUI();
}

function toggleFolderSelection(folderPath, selected) {
  if (selected) {
    selectedFolderPaths.add(folderPath);
  } else {
    selectedFolderPaths.delete(folderPath);
  }
  updateSelectionUI();
}

function formatSelectionCount(fileCount, folderCount) {
  const parts = [];
  if (folderCount) parts.push(`${folderCount} folder${folderCount === 1 ? '' : 's'}`);
  if (fileCount) parts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
  return parts.length ? `${parts.join(', ')} selected` : '0 items selected';
}

function updateSelectionUI() {
  const fileCount = selectedFileIds.size;
  const folderCount = selectedFolderPaths.size;
  const totalCount = fileCount + folderCount;
  const { folders, files } = getVisibleItems();
  const visibleFileIds = files.map((file) => file.id);
  const visibleFolderPaths = folders.map((folder) => folder.path);
  const visibleTotal = visibleFileIds.length + visibleFolderPaths.length;

  if (visibleTotal > 0) {
    selectionBar.classList.remove('hidden');
    selectAllLabel.textContent = 'Select all';
  } else {
    selectionBar.classList.add('hidden');
  }

  if (totalCount > 0) {
    selectionCountEl.textContent = formatSelectionCount(fileCount, folderCount);
    selectionCountEl.classList.remove('hidden');
    selectionActions.classList.remove('hidden');
    selectionBar.classList.add('selection-bar--active');
  } else {
    selectionCountEl.textContent = '';
    selectionCountEl.classList.add('hidden');
    selectionActions.classList.add('hidden');
    selectionBar.classList.remove('selection-bar--active');
  }

  if (visibleTotal > 0) {
    const allFilesSelected = visibleFileIds.every((id) => selectedFileIds.has(id));
    const allFoldersSelected = visibleFolderPaths.every((path) => selectedFolderPaths.has(path));
    const someSelected =
      visibleFileIds.some((id) => selectedFileIds.has(id))
      || visibleFolderPaths.some((path) => selectedFolderPaths.has(path));

    selectAllCheckbox.checked = allFilesSelected && allFoldersSelected;
    selectAllCheckbox.indeterminate = someSelected && !(allFilesSelected && allFoldersSelected);
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  }

  filesList.querySelectorAll('.grid-item[data-file-id]').forEach((card) => {
    const isSelected = selectedFileIds.has(card.dataset.fileId);
    card.classList.toggle('grid-item--selected', isSelected);
    const checkbox = card.querySelector('.file-select-checkbox');
    if (checkbox) checkbox.checked = isSelected;
  });

  filesList.querySelectorAll('.grid-item[data-folder-path]').forEach((card) => {
    const isSelected = selectedFolderPaths.has(card.dataset.folderPath);
    card.classList.toggle('grid-item--selected', isSelected);
    const checkbox = card.querySelector('.folder-select-checkbox');
    if (checkbox) checkbox.checked = isSelected;
  });
}

async function deleteFilesByIds(fileIds) {
  const response = await apiFetch('/api/files/delete-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: fileIds }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete file');
  return data;
}

async function deleteFolderByPath(folderPath) {
  const response = await apiFetch(`/api/folders?path=${encodeURIComponent(folderPath)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete folder');
  return data;
}

function downloadUrl(file) {
  return `/api/files/download?id=${encodeURIComponent(file.id)}`;
}

function updateStats(folders, files) {
  statFoldersEl.textContent = folders.length;
  statCountEl.textContent = files.length;
  const totalBytes = files.reduce((sum, f) => sum + (Number(f.size) || 0), 0);
  statSizeEl.textContent = formatSize(totalBytes);
}

function sortItems(folders, files, sortKey) {
  const sortedFolders = [...folders];
  const sortedFiles = [...files];

  const sortByName = (items, direction) =>
    items.sort((a, b) => (direction === 'asc' ? a.name.localeCompare(b.name, 'en') : b.name.localeCompare(a.name, 'en')));

  const sortByDate = (items, direction) =>
    items.sort((a, b) => {
      const dateA = new Date(a.modifiedTime || a.createdTime || 0);
      const dateB = new Date(b.modifiedTime || b.createdTime || 0);
      return direction === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const sortBySize = (items, direction) =>
    items.sort((a, b) => (direction === 'asc' ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0)));

  switch (sortKey) {
    case 'name-asc':
      sortByName(sortedFolders, 'asc');
      sortByName(sortedFiles, 'asc');
      break;
    case 'name-desc':
      sortByName(sortedFolders, 'desc');
      sortByName(sortedFiles, 'desc');
      break;
    case 'date-asc':
      sortByName(sortedFolders, 'asc');
      sortByDate(sortedFiles, 'asc');
      break;
    case 'size-asc':
      sortByName(sortedFolders, 'asc');
      sortBySize(sortedFiles, 'asc');
      break;
    case 'size-desc':
      sortByName(sortedFolders, 'asc');
      sortBySize(sortedFiles, 'desc');
      break;
    case 'date-desc':
      sortByName(sortedFolders, 'asc');
      sortByDate(sortedFiles, 'desc');
      break;
    default:
      sortByName(sortedFolders, 'asc');
      sortByDate(sortedFiles, 'desc');
  }

  return { folders: sortedFolders, files: sortedFiles };
}

function filterItems(folders, files, query) {
  const q = query.trim().toLowerCase();
  if (!q) return { folders, files };
  return {
    folders: folders.filter((f) => f.name.toLowerCase().includes(q)),
    files: files.filter((f) => f.name.toLowerCase().includes(q)),
  };
}

const MENU_MORE_ICON = `
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.75"/>
    <circle cx="12" cy="12" r="1.75"/>
    <circle cx="12" cy="19" r="1.75"/>
  </svg>
`;

let openItemMenu = null;

function closeItemMenu() {
  if (!openItemMenu) return;
  openItemMenu.dropdown.classList.add('hidden');
  openItemMenu.button.setAttribute('aria-expanded', 'false');
  openItemMenu = null;
}

function renderItemMenu(menuItemsHtml) {
  return `
    <div class="grid-item__menu">
      <button
        type="button"
        class="grid-item__menu-btn"
        aria-label="Actions"
        aria-haspopup="true"
        aria-expanded="false"
        title="Actions"
      >
        ${MENU_MORE_ICON}
      </button>
      <div class="grid-item__dropdown hidden" role="menu">
        ${menuItemsHtml}
      </div>
    </div>
  `;
}

function renderMenuItem(label, options = {}) {
  const {
    className = '',
    danger = false,
    attrs = '',
  } = options;
  const classes = [
    'grid-item__menu-item',
    danger ? 'grid-item__menu-item--danger' : '',
    className,
  ].filter(Boolean).join(' ');

  return `<button type="button" class="${classes}" role="menuitem"${attrs ? ` ${attrs}` : ''}>${escapeHtml(label)}</button>`;
}

function openPreview(file) {
  previewFile = file;
  previewTitle.textContent = file.name;
  previewImage.src = file.secureUrl;
  previewImage.alt = file.name;
  previewDownload.href = downloadUrl(file);
  previewDialog.showModal();
}

function closePreview() {
  previewDialog.close();
  previewImage.src = '';
  previewFile = null;
}

function renderFolderCard(folder) {
  const isSelected = selectedFolderPaths.has(folder.path);
  const menu = renderItemMenu([
    renderMenuItem('Open folder', {
      className: 'menu-open-folder',
      attrs: `data-folder-path="${escapeHtml(folder.path)}"`,
    }),
    renderMenuItem('Delete folder', {
      className: 'btn-delete-folder',
      danger: true,
      attrs: `data-folder-path="${escapeHtml(folder.path)}" data-folder-name="${escapeHtml(folder.name)}"`,
    }),
  ].join(''));

  return `
    <article class="grid-item grid-item--folder${isSelected ? ' grid-item--selected' : ''}" data-folder-path="${escapeHtml(folder.path)}">
      <label class="grid-item__select" title="Select folder">
        <input type="checkbox" class="folder-select-checkbox" data-folder-path="${escapeHtml(folder.path)}" aria-label="Select ${escapeHtml(folder.name)}"${isSelected ? ' checked' : ''}>
      </label>
      ${menu}
      <button type="button" class="folder-open-btn" data-folder-path="${escapeHtml(folder.path)}" title="Open ${escapeHtml(folder.name)}">
        <div class="grid-item__preview">
          <span class="grid-item__folder-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </span>
        </div>
        <div class="grid-item__body">
          <span class="grid-item__name" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</span>
          <span class="grid-item__meta">Folder</span>
        </div>
      </button>
    </article>
  `;
}

function renderFileCard(file) {
  const typeInfo = getFileTypeInfo(file.name);
  const url = downloadUrl(file);
  const isSelected = selectedFileIds.has(file.id);

  const previewContent = file.isImage && file.thumbnailUrl
    ? `<img class="grid-item__thumb" src="${escapeHtml(file.thumbnailUrl)}" alt="${escapeHtml(file.name)}" loading="lazy">`
    : `<span class="file-type-icon ${typeInfo.className}" aria-hidden="true">${escapeHtml(typeInfo.ext)}</span>`;

  const previewEl = file.isImage
    ? `<button type="button" class="grid-item__preview grid-item__preview--clickable btn-preview" data-file-id="${escapeHtml(file.id)}" title="Preview">${previewContent}</button>`
    : `<div class="grid-item__preview">${previewContent}</div>`;

  const menuItems = [];
  if (file.isImage) {
    menuItems.push(renderMenuItem('Preview', {
      className: 'btn-preview',
      attrs: `data-file-id="${escapeHtml(file.id)}"`,
    }));
  }
  menuItems.push(
    renderMenuItem('Copy link', {
      className: 'btn-copy',
      attrs: `data-url="${escapeHtml(file.secureUrl)}"`,
    }),
    `<a class="grid-item__menu-item grid-item__menu-item--link" href="${escapeHtml(url)}" download role="menuitem">Download</a>`,
    renderMenuItem('Delete file', {
      className: 'btn-delete',
      danger: true,
      attrs: `data-file-id="${escapeHtml(file.id)}" data-file-name="${escapeHtml(file.name)}"`,
    }),
  );

  return `
    <article class="grid-item${isSelected ? ' grid-item--selected' : ''}" data-file-id="${escapeHtml(file.id)}">
      <label class="grid-item__select" title="Select file">
        <input type="checkbox" class="file-select-checkbox" data-file-id="${escapeHtml(file.id)}" aria-label="Select ${escapeHtml(file.name)}"${isSelected ? ' checked' : ''}>
      </label>
      ${renderItemMenu(menuItems.join(''))}
      ${previewEl}
      <div class="grid-item__body">
        <span class="grid-item__name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="grid-item__meta">${formatSize(file.size)} · ${formatDate(file.modifiedTime || file.createdTime)}</span>
      </div>
    </article>
  `;
}

function renderFilesList(folders, files) {
  if (!folders.length && !files.length) {
    const isSearching = searchInput.value.trim().length > 0;
    filesList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <p>${isSearching ? 'No results found' : 'Folder is empty'}</p>
        <p class="empty-hint">${isSearching ? 'Try a different keyword' : 'Create a new folder or upload files to get started'}</p>
      </div>
    `;
    return;
  }

  const sortKey = sortSelect.value;
  const showFoldersFirst = sortKey === 'folders-first' || !sortKey.startsWith('date') && !sortKey.startsWith('size') && !sortKey.startsWith('name');
  const sorted = sortItems(folders, files, sortKey === 'folders-first' ? 'date-desc' : sortKey);

  const html = showFoldersFirst
    ? [...sorted.folders.map(renderFolderCard), ...sorted.files.map(renderFileCard)]
    : [...sorted.folders.map(renderFolderCard), ...sorted.files.map(renderFileCard)];

  filesList.innerHTML = html.join('');
  bindListEvents();
}

function bindListEvents() {
  filesList.querySelectorAll('.grid-item__menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = btn.nextElementSibling;
      if (openItemMenu?.dropdown === dropdown) {
        closeItemMenu();
        return;
      }

      closeItemMenu();
      dropdown.classList.remove('hidden');
      btn.setAttribute('aria-expanded', 'true');
      openItemMenu = { button: btn, dropdown };
    });
  });

  filesList.querySelectorAll('.grid-item__menu').forEach((menu) => {
    menu.addEventListener('click', (e) => e.stopPropagation());
  });

  filesList.querySelectorAll('.folder-open-btn').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.folderPath || ''));
  });

  filesList.querySelectorAll('.menu-open-folder').forEach((btn) => {
    btn.addEventListener('click', () => {
      closeItemMenu();
      navigateTo(btn.dataset.folderPath || '');
    });
  });

  filesList.querySelectorAll('.btn-delete-folder').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeItemMenu();
      const folderPath = btn.dataset.folderPath;
      const folderName = btn.dataset.folderName;
      if (!confirm(`Delete folder "${folderName}" and all contents inside? This action cannot be undone.`)) {
        return;
      }

      btn.disabled = true;
      showFilesSkeleton();
      try {
        await deleteFolderByPath(folderPath);
        setStatus(listStatus, `Deleted folder: ${folderName}`, 'success');
        await loadFolder();
      } catch (error) {
        setStatus(listStatus, error.message, 'error');
        btn.disabled = false;
      }
    });
  });

  filesList.querySelectorAll('.folder-select-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      toggleFolderSelection(checkbox.dataset.folderPath, checkbox.checked);
    });
    checkbox.addEventListener('click', (e) => e.stopPropagation());
  });

  filesList.querySelectorAll('.file-select-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      toggleFileSelection(checkbox.dataset.fileId, checkbox.checked);
    });
    checkbox.addEventListener('click', (e) => e.stopPropagation());
  });

  filesList.querySelectorAll('.grid-item__select').forEach((label) => {
    label.addEventListener('click', (e) => e.stopPropagation());
  });

  filesList.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      closeItemMenu();
      try {
        await navigator.clipboard.writeText(btn.dataset.url);
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch {
        setStatus(listStatus, 'Could not copy link', 'error');
      }
    });
  });

  filesList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      closeItemMenu();
      const fileId = btn.dataset.fileId;
      const fileName = btn.dataset.fileName;
      if (!confirm(`Delete file "${fileName}"? This action cannot be undone.`)) return;

      btn.disabled = true;
      showFilesSkeleton();
      try {
        await deleteFilesByIds([fileId]);
        selectedFileIds.delete(fileId);
        setStatus(listStatus, `Deleted: ${fileName}`, 'success');
        await loadFolder();
      } catch (error) {
        setStatus(listStatus, error.message, 'error');
        btn.disabled = false;
      }
    });
  });

  const openPreviewForId = (fileId) => {
    const file = allFiles.find((item) => item.id === fileId);
    if (file?.isImage) openPreview(file);
  };

  filesList.querySelectorAll('.btn-preview, .grid-item__preview--clickable').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeItemMenu();
      openPreviewForId(btn.dataset.fileId);
    });
  });
}

function applyFilters() {
  closeItemMenu();
  const filtered = filterItems(allFolders, allFiles, searchInput.value);
  renderFilesList(filtered.folders, filtered.files);
  updateSelectionUI();
}

function setUploadButtonsDisabled(disabled) {
  uploadBtn.disabled = disabled;
}

function renderSelectedFileItem(file) {
  const typeInfo = getFileTypeInfo(file.name);
  return `
    <li class="selected-file-item">
      <div class="selected-file-info">
        <span class="file-type-icon ${typeInfo.className}" aria-hidden="true">${escapeHtml(typeInfo.ext)}</span>
        <div>
          <span class="selected-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <span class="selected-size">${formatSize(file.size)}</span>
        </div>
      </div>
    </li>
  `;
}

function setSelectedFiles(files) {
  if (!files.length) {
    dropZone.classList.remove('has-file');
    selectedFilesEl.classList.add('hidden');
    selectedFilesListEl.innerHTML = '';
    selectedFilesSummaryEl.textContent = '';
    fileInput.value = '';
    setUploadButtonsDisabled(true);
    return;
  }

  selectedFilesListEl.innerHTML = files.map(renderSelectedFileItem).join('');
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  selectedFilesSummaryEl.textContent = `${files.length} file · ${formatSize(totalSize)}`;
  dropZone.classList.add('has-file');
  selectedFilesEl.classList.remove('hidden');
  setUploadButtonsDisabled(false);
}

async function loadFolder() {
  clearStatus(listStatus);
  showFilesSkeleton();
  refreshBtn.disabled = true;
  newFolderBtn.disabled = true;

  try {
    const query = currentPath ? `?path=${encodeURIComponent(currentPath)}` : '';
    const response = await apiFetch(`/api/files${query}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load file list');
    }

    cloudName = data.cloudName || cloudName;
    currentPath = data.currentPath ?? '';
    allFolders = data.folders || [];
    allFiles = data.files || [];

    if (cloudNameEl) cloudNameEl.textContent = cloudName;
    updateBrowserPath(currentPath, { replace: true });
    updateBreadcrumbs();
    updateStats(allFolders, allFiles);
    applyFilters();
    const validFileIds = new Set(allFiles.map((file) => file.id));
    const validFolderPaths = new Set(allFolders.map((folder) => folder.path));
    selectedFileIds = new Set([...selectedFileIds].filter((id) => validFileIds.has(id)));
    selectedFolderPaths = new Set([...selectedFolderPaths].filter((path) => validFolderPaths.has(path)));
    updateSelectionUI();
    clearStatus(listStatus);
  } catch (error) {
    setStatus(listStatus, error.message, 'error');
    filesList.innerHTML = `
      <div class="empty-state">
        <p>Failed to load file list</p>
        <p class="empty-hint">${escapeHtml(error.message)}</p>
      </div>
    `;
  } finally {
    refreshBtn.disabled = false;
    newFolderBtn.disabled = false;
  }
}

function handleFileSelect(files) {
  const selectedFiles = files ? [...files] : [];
  setSelectedFiles(selectedFiles);
  clearStatus(uploadStatus);
}

function openUploadDialog() {
  handleFileSelect([]);
  clearStatus(uploadStatus);
  updateBreadcrumbs();
  uploadDialog.showModal();
}

function openNewFolderDialog() {
  newFolderInput.value = '';
  newFolderDialog.showModal();
  newFolderInput.focus();
}

async function createFolder(name) {
  const response = await apiFetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentPath, name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create folder');
  return data.folder;
}

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener('click', (e) => {
  if (dropZone.classList.contains('has-file')) return;
  if (e.target.closest('button')) return;
  fileInput.click();
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!dropZone.classList.contains('has-file')) fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  handleFileSelect(fileInput.files);
});

clearFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  handleFileSelect([]);
});

['dragenter', 'dragover'].forEach((event) => {
  dropZone.addEventListener(event, (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((event) => {
  dropZone.addEventListener(event, (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = [...e.dataTransfer.files];
  if (!files.length) return;

  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  fileInput.files = dt.files;
  handleFileSelect(files);
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const files = [...fileInput.files];
  if (!files.length) {
    setStatus(uploadStatus, 'Please select at least one file', 'error');
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('file', file));
  formData.append('path', currentPath);

  uploadBtn.disabled = true;
  setStatus(uploadStatus, `Uploading ${files.length} file${files.length === 1 ? '' : 's'}...`, 'loading');

  try {
    const response = await apiFetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    uploadDialog.close();

    const uploadedCount = data.files?.length || 0;
    const failedCount = data.failed?.length || 0;
    let message = `Successfully uploaded ${uploadedCount} file${uploadedCount === 1 ? '' : 's'}`;
    if (failedCount) {
      message = `Uploaded ${uploadedCount}/${uploadedCount + failedCount} files, ${failedCount} failed`;
    }

    setStatus(listStatus, message, failedCount ? 'error' : 'success');
    handleFileSelect([]);
    await loadFolder();
  } catch (error) {
    setStatus(uploadStatus, error.message, 'error');
    setUploadButtonsDisabled(false);
  }
});

refreshBtn.addEventListener('click', loadFolder);
openUploadBtn.addEventListener('click', openUploadDialog);
cancelUploadBtn.addEventListener('click', () => uploadDialog.close());
newFolderBtn.addEventListener('click', openNewFolderDialog);
cancelFolderBtn.addEventListener('click', () => newFolderDialog.close());

newFolderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = newFolderInput.value.trim();
  if (!name) return;

  try {
    await createFolder(name);
    newFolderDialog.close();
    setStatus(listStatus, `Created folder: ${name}`, 'success');
    await loadFolder();
  } catch (error) {
    setStatus(listStatus, error.message, 'error');
  }
});

searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);

selectAllCheckbox.addEventListener('change', () => {
  const { folders, files } = getVisibleItems();
  if (selectAllCheckbox.checked) {
    files.forEach((file) => selectedFileIds.add(file.id));
    folders.forEach((folder) => selectedFolderPaths.add(folder.path));
  } else {
    files.forEach((file) => selectedFileIds.delete(file.id));
    folders.forEach((folder) => selectedFolderPaths.delete(folder.path));
  }
  updateSelectionUI();
});

clearSelectionBtn.addEventListener('click', clearSelection);

deleteSelectedBtn.addEventListener('click', async () => {
  const fileIds = [...selectedFileIds];
  const folderPaths = [...selectedFolderPaths];
  const totalCount = fileIds.length + folderPaths.length;
  if (!totalCount) return;

  const selectedFiles = allFiles.filter((file) => selectedFileIds.has(file.id));
  const selectedFolders = allFolders.filter((folder) => selectedFolderPaths.has(folder.path));
  const previewNames = [
    ...selectedFolders.slice(0, 2).map((folder) => folder.name),
    ...selectedFiles.slice(0, 2).map((file) => file.name),
  ].join(', ');
  const suffix = totalCount > 4 ? ` and ${totalCount - 4} more` : '';

  let confirmLabel = `${totalCount} item${totalCount === 1 ? '' : 's'}`;
  if (folderPaths.length && fileIds.length) {
    confirmLabel = `${folderPaths.length} folder${folderPaths.length === 1 ? '' : 's'} and ${fileIds.length} file${fileIds.length === 1 ? '' : 's'}`;
  } else if (folderPaths.length) {
    confirmLabel = `${folderPaths.length} folder${folderPaths.length === 1 ? '' : 's'}`;
  } else {
    confirmLabel = `${fileIds.length} file${fileIds.length === 1 ? '' : 's'}`;
  }

  if (!confirm(`Delete ${confirmLabel} (${previewNames}${suffix})? This action cannot be undone.`)) {
    return;
  }

  deleteSelectedBtn.disabled = true;
  clearSelectionBtn.disabled = true;
  showFilesSkeleton();

  try {
    const [folderResults, fileResult] = await Promise.all([
      Promise.allSettled(folderPaths.map((path) => deleteFolderByPath(path))),
      fileIds.length ? deleteFilesByIds(fileIds) : Promise.resolve({ deleted: [], failed: [] }),
    ]);

    const deletedFolders = folderResults.filter((result) => result.status === 'fulfilled').length;
    const failedFolders = folderResults.length - deletedFolders;
    const deletedFiles = fileResult.deleted?.length ?? 0;
    const failedFiles = fileResult.failed?.length ?? 0;

    folderPaths.forEach((path) => selectedFolderPaths.delete(path));
    fileResult.deleted?.forEach((id) => selectedFileIds.delete(id));
    fileResult.failed?.forEach(({ id }) => selectedFileIds.delete(id));

    const deletedTotal = deletedFolders + deletedFiles;
    const failedTotal = failedFolders + failedFiles;

    if (failedTotal > 0) {
      setStatus(listStatus, `Deleted ${deletedTotal} item${deletedTotal === 1 ? '' : 's'}, ${failedTotal} failed`, 'error');
    } else {
      setStatus(listStatus, `Deleted ${deletedTotal} item${deletedTotal === 1 ? '' : 's'}`, 'success');
    }

    await loadFolder();
  } catch (error) {
    setStatus(listStatus, error.message, 'error');
  } finally {
    deleteSelectedBtn.disabled = false;
    clearSelectionBtn.disabled = false;
    updateSelectionUI();
  }
});

closePreviewBtn.addEventListener('click', closePreview);
previewDialog.addEventListener('click', (e) => {
  if (e.target === previewDialog) closePreview();
});

previewCopyLink.addEventListener('click', async () => {
  if (!previewFile) return;
  try {
    await navigator.clipboard.writeText(previewFile.secureUrl);
    const original = previewCopyLink.textContent;
    previewCopyLink.textContent = 'Copied!';
    setTimeout(() => { previewCopyLink.textContent = original; }, 1500);
  } catch {
    setStatus(listStatus, 'Could not copy link', 'error');
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.grid-item__menu')) {
    closeItemMenu();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeItemMenu();
});

window.addEventListener('popstate', () => {
  const path = getPathFromUrl();
  if (path === currentPath) return;
  currentPath = path;
  clearSelection();
  updateBreadcrumbs();
  loadFolder();
});

currentPath = getPathFromUrl();
updateBreadcrumbs();
loadFolder();
