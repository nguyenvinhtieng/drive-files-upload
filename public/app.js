const folderNameEl = document.getElementById('folder-name');
const statCountEl = document.getElementById('stat-count');
const statSizeEl = document.getElementById('stat-size');
const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadBtn = document.getElementById('upload-btn');
const uploadBtnSelected = document.getElementById('upload-btn-selected');
const uploadStatus = document.getElementById('upload-status');
const dropZone = document.getElementById('drop-zone');
const selectedFileEl = document.getElementById('selected-file');
const selectedIconEl = document.getElementById('selected-icon');
const selectedNameEl = document.getElementById('selected-name');
const selectedSizeEl = document.getElementById('selected-size');
const clearFileBtn = document.getElementById('clear-file');
const refreshBtn = document.getElementById('refresh-btn');
const listStatus = document.getElementById('list-status');
const filesList = document.getElementById('files-list');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

let allFiles = [];

function setStatus(element, message, type) {
  element.textContent = message;
  element.className = `toast ${type || ''}`;
  element.classList.remove('hidden');
}

function clearStatus(element) {
  element.textContent = '';
  element.className = 'toast hidden';
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
  return new Date(value).toLocaleString('vi-VN', {
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
  return { ext: ext || '?', className: 'file-icon--default' };
}

function downloadUrl(file) {
  return `/api/files/download?id=${encodeURIComponent(file.id)}`;
}

function updateStats(files) {
  statCountEl.textContent = files.length;
  const totalBytes = files.reduce((sum, f) => sum + (Number(f.size) || 0), 0);
  statSizeEl.textContent = formatSize(totalBytes);
}

function sortFiles(files, sortKey) {
  const sorted = [...files];
  switch (sortKey) {
    case 'date-asc':
      return sorted.sort((a, b) => new Date(a.modifiedTime || a.createdTime) - new Date(b.modifiedTime || b.createdTime));
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name, 'vi'));
    case 'size-asc':
      return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
    case 'size-desc':
      return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
  }
  return sorted.sort((a, b) => new Date(b.modifiedTime || b.createdTime) - new Date(a.modifiedTime || a.createdTime));
}

function filterFiles(files, query) {
  const q = query.trim().toLowerCase();
  if (!q) return files;
  return files.filter((f) => f.name.toLowerCase().includes(q));
}

function renderFilesList(files) {
  if (!files.length) {
    const isSearching = searchInput.value.trim().length > 0;
    filesList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>${isSearching ? 'Không tìm thấy file phù hợp' : 'Chưa có file nào'}</p>
        <p class="empty-hint">${isSearching ? 'Thử từ khóa khác' : 'Upload file ZIP để bắt đầu'}</p>
      </div>
    `;
    return;
  }

  filesList.innerHTML = files
    .map((file) => {
      const typeInfo = getFileTypeInfo(file.name);
      const url = downloadUrl(file);

      return `
        <article class="file-card">
          <span class="file-icon ${typeInfo.className}" aria-hidden="true">${escapeHtml(typeInfo.ext)}</span>
          <div class="file-info">
            <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            <div class="file-meta">
              <span>${formatSize(file.size)}</span>
              <span>${formatDate(file.modifiedTime || file.createdTime)}</span>
            </div>
          </div>
          <div class="file-actions">
            <button type="button" class="btn btn-copy" data-url="${escapeHtml(file.secureUrl)}" title="Sao chép link">Link</button>
            <a class="btn btn-download" href="${escapeHtml(url)}" download>Tải xuống</a>
          </div>
        </article>
      `;
    })
    .join('');

  filesList.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.url);
        const original = btn.textContent;
        btn.textContent = 'Đã copy!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      } catch {
        setStatus(listStatus, 'Không thể sao chép link', 'error');
      }
    });
  });
}

function applyFilters() {
  const filtered = filterFiles(allFiles, searchInput.value);
  const sorted = sortFiles(filtered, sortSelect.value);
  renderFilesList(sorted);
}

function setUploadButtonsDisabled(disabled) {
  uploadBtn.disabled = disabled;
  if (uploadBtnSelected) uploadBtnSelected.disabled = disabled;
}

function setSelectedFile(file) {
  if (!file) {
    dropZone.classList.remove('has-file');
    selectedFileEl.classList.add('hidden');
    fileInput.value = '';
    setUploadButtonsDisabled(true);
    return;
  }

  const typeInfo = getFileTypeInfo(file.name);
  selectedIconEl.className = `file-icon ${typeInfo.className}`;
  selectedIconEl.textContent = typeInfo.ext;
  selectedNameEl.textContent = file.name;
  selectedSizeEl.textContent = formatSize(file.size);
  dropZone.classList.add('has-file');
  selectedFileEl.classList.remove('hidden');
  setUploadButtonsDisabled(false);
}

async function loadFiles() {
  setStatus(listStatus, 'Đang tải danh sách...', 'loading');
  refreshBtn.disabled = true;

  try {
    const response = await fetch('/api/files');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Không thể tải danh sách file');
    }

    if (data.folder) {
      folderNameEl.textContent = data.folder;
    }

    allFiles = data.files || [];
    updateStats(allFiles);
    applyFilters();
    clearStatus(listStatus);
  } catch (error) {
    setStatus(listStatus, error.message, 'error');
    filesList.innerHTML = `
      <div class="empty-state">
        <p>Không thể tải danh sách file</p>
        <p class="empty-hint">${escapeHtml(error.message)}</p>
      </div>
    `;
  } finally {
    refreshBtn.disabled = false;
  }
}

function handleFileSelect(file) {
  if (!file) {
    setSelectedFile(null);
    return;
  }
  setSelectedFile(file);
  clearStatus(uploadStatus);
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
  handleFileSelect(fileInput.files[0] || null);
});

clearFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  handleFileSelect(null);
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
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    handleFileSelect(file);
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    setStatus(uploadStatus, 'Vui lòng chọn file', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  uploadBtn.disabled = true;
  if (uploadBtnSelected) uploadBtnSelected.disabled = true;
  setStatus(uploadStatus, 'Đang upload...', 'loading');

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Upload thất bại');
    }

    setStatus(uploadStatus, `Upload thành công: ${data.file.name}`, 'success');
    handleFileSelect(null);
    await loadFiles();
  } catch (error) {
    setStatus(uploadStatus, error.message, 'error');
    setUploadButtonsDisabled(false);
  }
});

refreshBtn.addEventListener('click', loadFiles);
searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);

loadFiles();
