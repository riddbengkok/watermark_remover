let selectedFiles = [];
let processingTasks = [];
let watermarkCounter = 2; // Start from 2 since we have 2 default watermarks

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
    setupFileInput();
});

// Drag and drop functionality
function setupDragAndDrop() {
    const uploadCard = document.querySelector('.upload-card');

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadCard.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadCard.addEventListener(eventName, () => {
            uploadCard.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadCard.addEventListener(eventName, () => {
            uploadCard.classList.remove('dragover');
        }, false);
    });

    uploadCard.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// File input handling
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => {
        return file.type.startsWith('video/');
    });

    if (selectedFiles.length > 0) {
        showSettingsSection();
        document.getElementById('fileCount').textContent = selectedFiles.length;

        // Load preview for first video
        loadPreview(selectedFiles[0]);
    } else {
        alert('Please select valid video files');
    }
}

// Live Preview Functions
let previewImage = null;
let previewCanvas = null;
let previewCtx = null;

function loadPreview(file) {
    const formData = new FormData();
    formData.append('video', file);

    const loading = document.getElementById('previewLoading');
    const section = document.getElementById('livePreviewSection');

    loading.style.display = 'flex';
    section.style.display = 'block';

    fetch('/preview-frame', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.frame_url) {
                const img = new Image();
                img.onload = function () {
                    previewImage = img;
                    initializeCanvas();
                    drawPreview();
                    loading.style.display = 'none';

                    // Update description with timestamp
                    const timestamp = data.timestamp || 0;
                    const minutes = Math.floor(timestamp / 60);
                    const seconds = Math.floor(timestamp % 60);
                    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                    const descElement = document.querySelector('.preview-description strong');
                    if (descElement) {
                        descElement.parentElement.innerHTML = `
                        Frame from <strong>${timeStr}</strong> (middle of video).
                        <strong>Drag the red box</strong> to position it over the watermark, or adjust the values below manually.
                    `;
                    }
                };
                img.src = data.frame_url;
            } else {
                throw new Error(data.error || 'Failed to extract frame');
            }
        })
        .catch(error => {
            console.error('Preview error:', error);
            loading.style.display = 'none';
            alert('Could not load preview: ' + error.message);
        });
}

function initializeCanvas() {
    previewCanvas = document.getElementById('previewCanvas');
    previewCtx = previewCanvas.getContext('2d');

    // Set canvas size to match image
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / previewImage.width);

    previewCanvas.width = previewImage.width * scale;
    previewCanvas.height = previewImage.height * scale;

    // Add event listener to redraw when inputs change
    const inputs = document.querySelectorAll('.wm-x, .wm-y, .wm-width, .wm-height');
    inputs.forEach(input => {
        input.addEventListener('input', drawPreview);
    });

    // Add checkbox listeners
    const checkboxes = document.querySelectorAll('.watermark-region input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', drawPreview);
    });

    // Add drag functionality
    setupCanvasDrag();
}

// Drag and Drop for Watermark Boxes
let draggedWatermark = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDragging = false;
let isResizing = false;
let resizeCorner = null; // 'tl', 'tr', 'bl', 'br'

function setupCanvasDrag() {
    previewCanvas.addEventListener('mousedown', handleMouseDown);
    previewCanvas.addEventListener('mousemove', handleMouseMove);
    previewCanvas.addEventListener('mouseup', handleMouseUp);
    previewCanvas.addEventListener('mouseleave', handleMouseUp);

    // Change cursor when hovering over watermark boxes or handles
    previewCanvas.addEventListener('mousemove', (e) => {
        if (isDragging || isResizing) return;

        const rect = previewCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const scale = previewCanvas.width / previewImage.width;

        const handle = getHandleAtPosition(x / scale, y / scale);
        if (handle) {
            // Set resize cursor based on corner
            const cursors = {
                'tl': 'nwse-resize',
                'tr': 'nesw-resize',
                'bl': 'nesw-resize',
                'br': 'nwse-resize'
            };
            previewCanvas.style.cursor = cursors[handle.corner];
        } else {
            const hoveredBox = getWatermarkAtPosition(x / scale, y / scale);
            previewCanvas.style.cursor = hoveredBox ? 'move' : 'default';
        }
    });
}

function handleMouseDown(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scale = previewCanvas.width / previewImage.width;

    // Check if clicking on a resize handle first
    const handle = getHandleAtPosition(x / scale, y / scale);
    if (handle) {
        isResizing = true;
        draggedWatermark = handle.watermark;
        resizeCorner = handle.corner;
        return;
    }

    // Otherwise check for dragging
    const watermark = getWatermarkAtPosition(x / scale, y / scale);

    if (watermark) {
        isDragging = true;
        draggedWatermark = watermark;
        dragOffsetX = x / scale - watermark.x;
        dragOffsetY = y / scale - watermark.y;
        previewCanvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scale = previewCanvas.width / previewImage.width;

    if (isResizing && draggedWatermark) {
        const mouseX = x / scale;
        const mouseY = y / scale;

        const region = draggedWatermark.region;
        let newX = draggedWatermark.x;
        let newY = draggedWatermark.y;
        let newWidth = draggedWatermark.width;
        let newHeight = draggedWatermark.height;

        // Resize based on which corner is being dragged
        if (resizeCorner === 'tl') {
            // Top-left: move x,y and adjust width,height inversely
            newX = Math.min(mouseX, draggedWatermark.x + draggedWatermark.width - 20);
            newY = Math.min(mouseY, draggedWatermark.y + draggedWatermark.height - 20);
            newWidth = draggedWatermark.x + draggedWatermark.width - newX;
            newHeight = draggedWatermark.y + draggedWatermark.height - newY;
        } else if (resizeCorner === 'tr') {
            // Top-right: move y, adjust width and height
            newY = Math.min(mouseY, draggedWatermark.y + draggedWatermark.height - 20);
            newWidth = Math.max(20, mouseX - draggedWatermark.x);
            newHeight = draggedWatermark.y + draggedWatermark.height - newY;
        } else if (resizeCorner === 'bl') {
            // Bottom-left: move x, adjust width and height
            newX = Math.min(mouseX, draggedWatermark.x + draggedWatermark.width - 20);
            newWidth = draggedWatermark.x + draggedWatermark.width - newX;
            newHeight = Math.max(20, mouseY - draggedWatermark.y);
        } else if (resizeCorner === 'br') {
            // Bottom-right: just adjust width and height
            newWidth = Math.max(20, mouseX - draggedWatermark.x);
            newHeight = Math.max(20, mouseY - draggedWatermark.y);
        }

        // Constrain to canvas bounds
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        newWidth = Math.min(newWidth, previewImage.width - newX);
        newHeight = Math.min(newHeight, previewImage.height - newY);

        // Update input fields
        region.querySelector('.wm-x').value = Math.round(newX);
        region.querySelector('.wm-y').value = Math.round(newY);
        region.querySelector('.wm-width').value = Math.round(newWidth);
        region.querySelector('.wm-height').value = Math.round(newHeight);

        // Update draggedWatermark for continuous resizing
        draggedWatermark.x = newX;
        draggedWatermark.y = newY;
        draggedWatermark.width = newWidth;
        draggedWatermark.height = newHeight;

        drawPreview();
    } else if (isDragging && draggedWatermark) {
        // Calculate new position
        let newX = Math.round((x / scale) - dragOffsetX);
        let newY = Math.round((y / scale) - dragOffsetY);

        // Constrain to canvas bounds
        newX = Math.max(0, Math.min(newX, previewImage.width - draggedWatermark.width));
        newY = Math.max(0, Math.min(newY, previewImage.height - draggedWatermark.height));

        // Update input fields
        draggedWatermark.region.querySelector('.wm-x').value = newX;
        draggedWatermark.region.querySelector('.wm-y').value = newY;

        // Redraw
        drawPreview();
    }
}

function handleMouseUp() {
    if (isDragging || isResizing) {
        isDragging = false;
        isResizing = false;
        draggedWatermark = null;
        resizeCorner = null;
        previewCanvas.style.cursor = 'default';
    }
}

function getHandleAtPosition(x, y) {
    const regions = document.querySelectorAll('.watermark-region');
    const handleSize = 8;
    const hitArea = 12; // Slightly larger hit area for easier clicking

    for (let i = regions.length - 1; i >= 0; i--) {
        const region = regions[i];
        const checkbox = region.querySelector('input[type="checkbox"]');
        if (!checkbox || !checkbox.checked) continue;

        const wmX = parseInt(region.querySelector('.wm-x').value) || 0;
        const wmY = parseInt(region.querySelector('.wm-y').value) || 0;
        const wmWidth = parseInt(region.querySelector('.wm-width').value) || 0;
        const wmHeight = parseInt(region.querySelector('.wm-height').value) || 0;

        const watermarkObj = { region, x: wmX, y: wmY, width: wmWidth, height: wmHeight, index: i };

        // Check each corner handle
        const corners = {
            'tl': { x: wmX, y: wmY },
            'tr': { x: wmX + wmWidth, y: wmY },
            'bl': { x: wmX, y: wmY + wmHeight },
            'br': { x: wmX + wmWidth, y: wmY + wmHeight }
        };

        for (const [corner, pos] of Object.entries(corners)) {
            if (Math.abs(x - pos.x) <= hitArea && Math.abs(y - pos.y) <= hitArea) {
                return { watermark: watermarkObj, corner };
            }
        }
    }

    return null;
}

function getWatermarkAtPosition(x, y) {
    const regions = document.querySelectorAll('.watermark-region');

    // Check in reverse order (top watermarks first)
    for (let i = regions.length - 1; i >= 0; i--) {
        const region = regions[i];
        const checkbox = region.querySelector('input[type="checkbox"]');
        if (!checkbox || !checkbox.checked) continue;

        const wmX = parseInt(region.querySelector('.wm-x').value) || 0;
        const wmY = parseInt(region.querySelector('.wm-y').value) || 0;
        const wmWidth = parseInt(region.querySelector('.wm-width').value) || 0;
        const wmHeight = parseInt(region.querySelector('.wm-height').value) || 0;

        // Check if click is inside this watermark box
        if (x >= wmX && x <= wmX + wmWidth && y >= wmY && y <= wmY + wmHeight) {
            return {
                region: region,
                x: wmX,
                y: wmY,
                width: wmWidth,
                height: wmHeight,
                index: i
            };
        }
    }

    return null;
}

function drawPreview() {
    if (!previewImage || !previewCanvas || !previewCtx) return;

    const scale = previewCanvas.width / previewImage.width;

    // Clear and draw image
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.drawImage(previewImage, 0, 0, previewCanvas.width, previewCanvas.height);

    // Draw watermark boxes for enabled watermarks
    const regions = document.querySelectorAll('.watermark-region');

    regions.forEach((region, index) => {
        const checkbox = region.querySelector('input[type="checkbox"]');
        if (!checkbox || !checkbox.checked) return;

        const x = parseInt(region.querySelector('.wm-x').value) || 0;
        const y = parseInt(region.querySelector('.wm-y').value) || 0;
        const width = parseInt(region.querySelector('.wm-width').value) || 0;
        const height = parseInt(region.querySelector('.wm-height').value) || 0;

        // Draw semi-transparent red box
        previewCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        previewCtx.fillRect(x * scale, y * scale, width * scale, height * scale);

        // Draw red border
        previewCtx.strokeStyle = '#ff0000';
        previewCtx.lineWidth = 2;
        previewCtx.strokeRect(x * scale, y * scale, width * scale, height * scale);

        // Draw label with background
        const labelText = `Watermark ${index + 1}`;
        previewCtx.font = 'bold 14px Inter, sans-serif';
        const labelWidth = previewCtx.measureText(labelText).width;

        // Label background
        previewCtx.fillStyle = '#ff0000';
        previewCtx.fillRect(x * scale, (y * scale) - 22, labelWidth + 10, 20);

        // Label text
        previewCtx.fillStyle = '#ffffff';
        previewCtx.fillText(labelText, x * scale + 5, y * scale - 7);

        // Draw corner handles for visual feedback
        const handleSize = 8;
        previewCtx.fillStyle = '#ffffff';
        previewCtx.strokeStyle = '#ff0000';
        previewCtx.lineWidth = 2;

        // Top-left handle
        previewCtx.fillRect((x * scale) - handleSize / 2, (y * scale) - handleSize / 2, handleSize, handleSize);
        previewCtx.strokeRect((x * scale) - handleSize / 2, (y * scale) - handleSize / 2, handleSize, handleSize);

        // Top-right handle
        previewCtx.fillRect((x + width) * scale - handleSize / 2, (y * scale) - handleSize / 2, handleSize, handleSize);
        previewCtx.strokeRect((x + width) * scale - handleSize / 2, (y * scale) - handleSize / 2, handleSize, handleSize);

        // Bottom-left handle
        previewCtx.fillRect((x * scale) - handleSize / 2, (y + height) * scale - handleSize / 2, handleSize, handleSize);
        previewCtx.strokeRect((x * scale) - handleSize / 2, (y + height) * scale - handleSize / 2, handleSize, handleSize);

        // Bottom-right handle
        previewCtx.fillRect((x + width) * scale - handleSize / 2, (y + height) * scale - handleSize / 2, handleSize, handleSize);
        previewCtx.strokeRect((x + width) * scale - handleSize / 2, (y + height) * scale - handleSize / 2, handleSize, handleSize);
    });
}

function refreshPreview() {
    if (selectedFiles.length > 0) {
        loadPreview(selectedFiles[0]);
    }
}


function showSettingsSection() {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'block';
}

// Watermark management
function addWatermark() {
    const container = document.getElementById('watermarksContainer');
    const newId = watermarkCounter++;

    const watermarkDiv = document.createElement('div');
    watermarkDiv.className = 'watermark-region';
    watermarkDiv.setAttribute('data-wm-id', newId);
    watermarkDiv.innerHTML = `
        <div class="watermark-header">
            <div class="watermark-title">
                <input type="checkbox" id="wm${newId}_enabled" checked>
                <label for="wm${newId}_enabled">
                    <strong>Watermark ${newId + 1}: Custom Region</strong>
                </label>
            </div>
            <button class="btn-remove" onclick="removeWatermark(${newId})" title="Remove this watermark">×</button>
        </div>
        <div class="settings-grid">
            <div class="setting-group">
                <label>X Position</label>
                <input type="number" class="input wm-x" value="0" min="0">
            </div>
            <div class="setting-group">
                <label>Y Position</label>
                <input type="number" class="input wm-y" value="0" min="0">
            </div>
            <div class="setting-group">
                <label>Width</label>
                <input type="number" class="input wm-width" value="200" min="10">
            </div>
            <div class="setting-group">
                <label>Height</label>
                <input type="number" class="input wm-height" value="60" min="10">
            </div>
        </div>
    `;

    container.appendChild(watermarkDiv);

    // Attach event listeners for live preview
    const inputs = watermarkDiv.querySelectorAll('.wm-x, .wm-y, .wm-width, .wm-height');
    inputs.forEach(input => {
        input.addEventListener('input', drawPreview);
    });

    const checkbox = watermarkDiv.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.addEventListener('change', drawPreview);
    }
}

function removeWatermark(id) {
    const watermarkDiv = document.querySelector(`[data-wm-id="${id}"]`);
    if (watermarkDiv) {
        watermarkDiv.remove();
    }
}

function getWatermarkSettings() {
    const watermarks = [];
    const regions = document.querySelectorAll('.watermark-region');

    regions.forEach(region => {
        const checkbox = region.querySelector('input[type="checkbox"]');
        const enabled = checkbox ? checkbox.checked : true;

        if (enabled) {
            const x = parseInt(region.querySelector('.wm-x').value);
            const y = parseInt(region.querySelector('.wm-y').value);
            const width = parseInt(region.querySelector('.wm-width').value);
            const height = parseInt(region.querySelector('.wm-height').value);

            watermarks.push({ x, y, width, height, enabled: true });
        }
    });

    return watermarks;
}

// Position presets
function setPresetPosition(preset) {
    // Get the first enabled watermark region to apply preset
    const firstRegion = document.querySelector('.watermark-region');
    if (!firstRegion) return;

    const xInput = firstRegion.querySelector('.wm-x');
    const yInput = firstRegion.querySelector('.wm-y');
    const widthInput = firstRegion.querySelector('.wm-width');
    const heightInput = firstRegion.querySelector('.wm-height');

    // Video dimensions for 1080x1920 (vertical video)
    const videoWidth = 1080;
    const videoHeight = 1920;

    switch (preset) {
        case 'top-left': // OpusClip logo
            xInput.value = 119;
            yInput.value = 253;
            widthInput.value = 362;
            heightInput.value = 92;
            break;
        case 'bottom-right':
            xInput.value = 860;
            yInput.value = 1840;
            widthInput.value = 200;
            heightInput.value = 60;
            break;
        case 'bottom-center':
            xInput.value = 440;
            yInput.value = 1840;
            widthInput.value = 200;
            heightInput.value = 60;
            break;
        case 'bottom-caption':
            xInput.value = 100;
            yInput.value = 1700;
            widthInput.value = 900;
            heightInput.value = 200;
            break;
    }

    // Visual feedback
    const buttons = document.querySelectorAll('.btn-preset');
    buttons.forEach(btn => btn.style.background = '');
    event.target.style.background = '#667eea';

    setTimeout(() => {
        event.target.style.background = '';
    }, 1000);
}

// Process videos
async function processVideos() {
    const method = document.getElementById('method').value;
    const watermarks = getWatermarkSettings();

    if (watermarks.length === 0) {
        alert('Please enable at least one watermark region to remove!');
        return;
    }

    document.getElementById('settingsSection').style.display = 'none';
    document.getElementById('queueSection').style.display = 'block';

    // Process all videos with the same watermark settings
    await uploadAndProcessBulk(selectedFiles, method, watermarks);
}

async function uploadAndProcessBulk(files, method, watermarks) {
    const formData = new FormData();

    // Add all video files
    files.forEach(file => {
        formData.append('videos', file);
    });

    // Add settings
    formData.append('method', method);
    formData.append('watermarks', JSON.stringify(watermarks));

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Add all tasks to queue
            data.tasks.forEach(task => {
                addToQueue(task.task_id, task.filename);
                monitorTask(task.task_id);
            });
        } else {
            console.error('Upload failed:', data.error);
            alert('Upload failed: ' + data.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload error: ' + error.message);
    }
}

function addToQueue(taskId, filename) {
    const queueList = document.getElementById('queueList');

    const queueItem = document.createElement('div');
    queueItem.className = 'queue-item';
    queueItem.id = `task-${taskId}`;
    queueItem.innerHTML = `
        <div class="queue-header">
            <span class="queue-filename">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: inline; vertical-align: middle; margin-right: 8px;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-width="2"/>
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke-width="2" stroke-linecap="round"/>
                </svg>
                ${filename}
            </span>
            <span class="queue-status status-queued">Queued</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: 0%"></div>
        </div>
        <div class="queue-actions"></div>
    `;

    queueList.appendChild(queueItem);
}

async function monitorTask(taskId) {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${taskId}`);
            const data = await response.json();

            updateTaskUI(taskId, data);

            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(checkInterval);
            }
        } catch (error) {
            console.error('Status check error:', error);
            clearInterval(checkInterval);
        }
    }, 1000);
}

function updateTaskUI(taskId, data) {
    const taskElement = document.getElementById(`task-${taskId}`);
    if (!taskElement) return;

    const statusElement = taskElement.querySelector('.queue-status');
    const progressBar = taskElement.querySelector('.progress-bar');
    const actionsElement = taskElement.querySelector('.queue-actions');

    // Update status
    statusElement.className = `queue-status status-${data.status}`;
    statusElement.textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);

    // Update progress
    if (data.progress !== undefined) {
        progressBar.style.width = `${data.progress}%`;
    }

    // Add video preview and download button if completed
    if (data.status === 'completed') {
        // Check if preview already exists
        if (!taskElement.querySelector('.video-preview')) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'video-preview';
            previewDiv.innerHTML = `
                <video controls width="100%" style="max-height: 400px; border-radius: 8px; margin-bottom: 1rem;">
                    <source src="/download/${taskId}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;

            // Insert preview before actions
            taskElement.insertBefore(previewDiv, actionsElement);
        }

        actionsElement.innerHTML = `
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn-download" onclick="downloadFile('${taskId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: inline; vertical-align: middle; margin-right: 4px;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Download Video
                </button>
                <button class="btn-secondary-small" onclick="togglePreview('${taskId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="display: inline; vertical-align: middle; margin-right: 4px;">
                        <polygon points="5 3 19 12 5 21 5 3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor"/>
                    </svg>
                    Toggle Preview
                </button>
            </div>
        `;
    }

    // Show error if failed
    if (data.status === 'failed') {
        actionsElement.innerHTML = `<span style="color: var(--error-color); font-size: 0.875rem;">❌ Error: ${data.error || 'Processing failed'}</span>`;
    }
}

function togglePreview(taskId) {
    const taskElement = document.getElementById(`task-${taskId}`);
    const preview = taskElement.querySelector('.video-preview');

    if (preview) {
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }
}

function downloadFile(taskId) {
    // Use fetch to download with proper filename
    fetch(`/download/${taskId}?download=true`)
        .then(response => {
            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'video_watermark_removed.mp4';

            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            return response.blob().then(blob => ({ blob, filename }));
        })
        .then(({ blob, filename }) => {
            // Create a download link and trigger it
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            console.error('Download error:', error);
            alert('Download failed: ' + error.message);
        });
}

function resetApp() {
    selectedFiles = [];
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('settingsSection').style.display = 'none';
    document.getElementById('queueSection').style.display = 'none';
    document.getElementById('queueList').innerHTML = '';
    document.getElementById('fileInput').value = '';
}
