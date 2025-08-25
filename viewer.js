// Niivue-based Medical Image Viewer for Cervical Cytology AI Demo
// This implementation uses Niivue's actual medical imaging capabilities

let nv = null;
let currentVolume = null;
let currentImage = null;
let usingFallback = false;

// Image manipulation variables
let imageScale = 1;
let imageX = 0;
let imageY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let brightness = 1;
let contrast = 1;

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Niivue with medical imaging capabilities
    await initializeNiivue();
    
    // Setup drag and drop for medical images
    setupDragAndDrop();
    
    // Setup file input
    setupFileInput();
    
    // Setup window resize handler
    window.addEventListener('resize', handleResize);
    
    // Load the default test image
    loadDefaultTestImage();
});

function handleResize() {
    // Redraw image if we're using fallback mode
    if (currentImage && usingFallback) {
        setTimeout(() => {
            displayImageWithNiivue(currentImage);
        }, 100);
    }
}

function setupImageControls(canvas) {
    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = imageScale * zoomFactor;
        
        // Limit zoom range
        if (newScale >= 0.1 && newScale <= 10) {
            imageScale = newScale;
            if (currentImage) {
                displayImageWithNiivue(currentImage);
                updateStatus(`Zoom: ${Math.round(imageScale * 100)}%`);
            }
        }
    });
    
    // Mouse drag for pan
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        // Update coordinates display
        updateCoordinates(e.clientX, e.clientY);
        
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;
            
            imageX += deltaX;
            imageY += deltaY;
            
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            
            if (currentImage) {
                displayImageWithNiivue(currentImage);
            }
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    });
    
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
        document.getElementById('coordinates').textContent = '';
    });
    
    // Right-click for contrast adjustment
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContrastDialog(e.clientX, e.clientY);
    });
}

function updateCoordinates(mouseX, mouseY) {
    if (!currentImage || !window.imagePosition) return;
    
    const pos = window.imagePosition;
    
    // Check if mouse is over image
    if (mouseX >= pos.x && mouseX <= pos.x + pos.width &&
        mouseY >= pos.y && mouseY <= pos.y + pos.height) {
        
        // Convert to image coordinates
        const imgX = Math.round((mouseX - pos.x) / pos.scale * pos.baseScale);
        const imgY = Math.round((mouseY - pos.y) / pos.scale * pos.baseScale);
        
        document.getElementById('coordinates').textContent = `${imgX}, ${imgY} | Zoom: ${Math.round(imageScale * 100)}%`;
    } else {
        document.getElementById('coordinates').textContent = `Zoom: ${Math.round(imageScale * 100)}%`;
    }
}

function showContrastDialog(x, y) {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('contrast-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Create contrast adjustment dialog
    const dialog = document.createElement('div');
    dialog.id = 'contrast-dialog';
    dialog.style.position = 'fixed';
    dialog.style.left = x + 'px';
    dialog.style.top = y + 'px';
    dialog.style.background = 'rgba(0, 0, 0, 0.9)';
    dialog.style.border = '1px solid #555';
    dialog.style.borderRadius = '4px';
    dialog.style.padding = '10px';
    dialog.style.color = '#fff';
    dialog.style.fontSize = '12px';
    dialog.style.zIndex = '1000';
    dialog.style.minWidth = '150px';
    
    dialog.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">Image Adjustments</div>
        <div style="margin-bottom: 8px;">
            <label>Brightness: ${Math.round(brightness * 100)}%</label>
            <input type="range" id="brightness-slider" min="0.5" max="2" step="0.1" value="${brightness}" 
                   style="width: 100%; margin-top: 2px;">
        </div>
        <div style="margin-bottom: 8px;">
            <label>Contrast: ${Math.round(contrast * 100)}%</label>
            <input type="range" id="contrast-slider" min="0.5" max="3" step="0.1" value="${contrast}"
                   style="width: 100%; margin-top: 2px;">
        </div>
        <div style="text-align: center; margin-top: 10px;">
            <button id="reset-contrast" style="background: #333; color: #fff; border: 1px solid #555; padding: 4px 8px; border-radius: 2px; cursor: pointer;">Reset</button>
            <button id="close-contrast" style="background: #007bff; color: #fff; border: none; padding: 4px 8px; border-radius: 2px; cursor: pointer; margin-left: 5px;">Close</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    const brightnessSlider = document.getElementById('brightness-slider');
    const contrastSlider = document.getElementById('contrast-slider');
    const resetBtn = document.getElementById('reset-contrast');
    const closeBtn = document.getElementById('close-contrast');
    
    brightnessSlider.addEventListener('input', (e) => {
        brightness = parseFloat(e.target.value);
        e.target.previousElementSibling.textContent = `Brightness: ${Math.round(brightness * 100)}%`;
        if (currentImage) {
            displayImageWithNiivue(currentImage);
        }
    });
    
    contrastSlider.addEventListener('input', (e) => {
        contrast = parseFloat(e.target.value);
        e.target.previousElementSibling.textContent = `Contrast: ${Math.round(contrast * 100)}%`;
        if (currentImage) {
            displayImageWithNiivue(currentImage);
        }
    });
    
    resetBtn.addEventListener('click', () => {
        brightness = 1;
        contrast = 1;
        brightnessSlider.value = 1;
        contrastSlider.value = 1;
        brightnessSlider.previousElementSibling.textContent = 'Brightness: 100%';
        contrastSlider.previousElementSibling.textContent = 'Contrast: 100%';
        if (currentImage) {
            displayImageWithNiivue(currentImage);
        }
        updateStatus('Image adjustments reset');
    });
    
    closeBtn.addEventListener('click', () => {
        dialog.remove();
    });
    
    // Close dialog when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDialog(e) {
            if (!dialog.contains(e.target)) {
                dialog.remove();
                document.removeEventListener('click', closeDialog);
            }
        });
    }, 100);
}

async function initializeNiivue() {
    try {
        // Create Niivue instance with medical imaging optimizations
        nv = new niivue.Niivue({
            isResizeCanvas: true,
            dragAndDropEnabled: true,
            backColor: [0, 0, 0, 1], // Black background
            crosshairColor: [0, 1, 0, 1], // Green crosshair
            textHeight: 0.03,
            isOrientCube: false, // Hide for 2D cytology slides
            isColorbar: false,
            show3Dcrosshair: false,
            multiplanarForceRender: false, // Don't force render to allow fallback
            isHighResolutionCapable: true
        });
        
        // Attach to canvas
        await nv.attachTo('gl1');
        
        // Set up event listeners
        setupNiivueEventListeners();
        
        updateStatus("Niivue medical viewer ready");
        console.log("Niivue initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize Niivue:", error);
        showError("Failed to initialize medical viewer");
    }
}

function setupNiivueEventListeners() {
    // Listen for volume loading
    nv.onImageLoaded = function() {
        updateStatus("Medical image loaded successfully");
        updateImageInfo();
    };
    
    // Mouse position tracking
    const canvas = document.getElementById('gl1');
    canvas.addEventListener('mousemove', (e) => {
        if (nv && nv.volumes && nv.volumes.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Get voxel coordinates
            const coords = nv.canvas2frac([x, y]);
            if (coords) {
                const vol = nv.volumes[0];
                const i = Math.round(coords[0] * vol.dims[1]);
                const j = Math.round(coords[1] * vol.dims[2]);
                document.getElementById('coordinates').textContent = `${i}, ${j}`;
            }
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        document.getElementById('coordinates').textContent = '';
    });
}

async function loadDefaultTestImage() {
    try {
        // Load the default JPEG test image
        // Since Niivue doesn't directly support JPEG, we'll display it on a 2D canvas overlay
        const img = new Image();
        img.onload = function() {
            currentImage = img;
            displayImageWithNiivue(img);
            updateStatus("Test image loaded - Cervical cytology sample");
            updateImageInfo();
        };
        
        img.onerror = function() {
            showWelcomeMessage();
            updateStatus("Ready - Load medical images or drag & drop");
        };
        
        // Load the test image
        img.src = "assets/test-image.jpg";
        
    } catch (error) {
        console.log("No default image available");
        showWelcomeMessage();
    }
}

function displayImageWithNiivue(img) {
    // Create a separate overlay canvas for regular images
    // since Niivue controls the main WebGL canvas
    let overlayCanvas = document.getElementById('image-overlay');
    
    if (!overlayCanvas) {
        // Create overlay canvas
        overlayCanvas = document.createElement('canvas');
        overlayCanvas.id = 'image-overlay';
        overlayCanvas.style.position = 'absolute';
        overlayCanvas.style.top = '0';
        overlayCanvas.style.left = '0';
        overlayCanvas.style.width = '100%';
        overlayCanvas.style.height = 'calc(100% - 30px)';
        overlayCanvas.style.pointerEvents = 'auto'; // Enable mouse interactions
        overlayCanvas.style.zIndex = '10';
        overlayCanvas.style.cursor = 'crosshair';
        
        // Insert after the main canvas
        const mainCanvas = document.getElementById('gl1');
        mainCanvas.parentNode.insertBefore(overlayCanvas, mainCanvas.nextSibling);
        
        // Setup mouse controls for the overlay canvas
        setupImageControls(overlayCanvas);
    }
    
    // Set canvas size
    const container = overlayCanvas.parentElement;
    overlayCanvas.width = container.clientWidth;
    overlayCanvas.height = container.clientHeight - 30; // Account for status bar
    
    const ctx = overlayCanvas.getContext('2d');
    usingFallback = true;
    
    // Clear canvas
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Apply contrast and brightness filters
    ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
    
    // Calculate image dimensions with current scale and position
    const baseScale = Math.min(
        (overlayCanvas.width * 0.8) / img.width,
        (overlayCanvas.height * 0.8) / img.height
    );
    
    const finalScale = baseScale * imageScale;
    const width = img.width * finalScale;
    const height = img.height * finalScale;
    const x = imageX + (overlayCanvas.width - width) / 2;
    const y = imageY + (overlayCanvas.height - height) / 2;
    
    // Draw the image
    ctx.drawImage(img, x, y, width, height);
    
    // Reset filter for border
    ctx.filter = 'none';
    
    // Add a subtle border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // Store image position for AI annotations
    window.imagePosition = { x, y, width, height, scale: finalScale, baseScale };
}

async function loadVolume(url, name = 'Medical Image') {
    try {
        updateStatus(`Loading ${name}...`);
        
        // Load the volume with Niivue
        await nv.loadVolumes([{
            url: url,
            name: name,
            colormap: "gray",
            opacity: 1.0,
            visible: true
        }]);
        
        // For 2D cytology slides, set to axial view
        nv.setSliceType(nv.sliceTypeAxial);
        
        currentVolume = nv.volumes[0];
        updateStatus(`${name} loaded successfully`);
        updateImageInfo();
        
    } catch (error) {
        console.error("Error loading volume:", error);
        showError(`Failed to load ${name}`);
    }
}

async function loadOverlay(url, colormap = 'red-yellow') {
    if (!currentVolume) {
        showError("Load a base image first");
        return;
    }
    
    try {
        updateStatus("Loading AI overlay...");
        
        // Add overlay volume
        await nv.addVolume({
            url: url,
            name: "AI Detection Overlay",
            colormap: colormap,
            opacity: 0.5,
            visible: true
        });
        
        updateStatus("AI overlay loaded");
        
    } catch (error) {
        console.error("Error loading overlay:", error);
        showError("Failed to load overlay");
    }
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const container = document.querySelector('.viewer-container');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        container.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
            updateStatus("Drop medical image (NIfTI/DICOM)");
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        container.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });
    
    container.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    }
}

function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
}

async function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    
    // Check if it's a medical format Niivue can handle
    const medicalFormats = /\.(nii|nii\.gz|dcm|nrrd|mgh|mgz|v|v16)$/i;
    const isOverlay = file.name.includes('mask') || file.name.includes('overlay');
    
    if (!medicalFormats.test(file.name)) {
        // Handle regular images (JPEG/PNG)
        handleRegularImage(file);
        return;
    }
    
    // Create blob URL for the file
    const url = URL.createObjectURL(file);
    
    if (isOverlay && currentVolume) {
        // Load as overlay if it looks like a mask
        await loadOverlay(url);
    } else {
        // Load as primary volume
        await loadVolume(url, file.name);
        usingFallback = false;
    }
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function handleRegularImage(file) {
    // For regular images like JPEG/PNG, display them directly
    if (file.type.startsWith('image/')) {
        updateStatus(`Loading ${file.name}...`);
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                currentImage = img;
                displayImageWithNiivue(img);
                updateStatus(`${file.name} loaded successfully`);
                updateImageInfo(file.name);
            };
            
            img.onerror = function() {
                showError(`Failed to load ${file.name}`);
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            showError(`Failed to read ${file.name}`);
        };
        
        reader.readAsDataURL(file);
    } else {
        showError(`Unsupported file format: ${file.name}`);
    }
}

function showWelcomeMessage() {
    updateStatus("Ready - Load medical images (NIfTI/DICOM)");
    
    // Display welcome message on canvas using Niivue's text rendering
    if (nv) {
        // Niivue will show empty canvas with instructions
        const infoEl = document.getElementById('image-info');
        infoEl.textContent = "Cervical Cytology AI Viewer - Drop NIfTI/DICOM files or click Load Image";
    }
}

function showError(message) {
    updateStatus(`Error: ${message}`);
    console.error(message);
}

function updateStatus(message) {
    document.getElementById('status-text').textContent = message;
}

function updateImageInfo(filename = null) {
    let info = '';
    
    if (currentImage && usingFallback) {
        // Display info for regular images
        const name = filename || "Cervical Cytology Sample";
        info = `${name} | ${currentImage.width}×${currentImage.height}px`;
    } else if (nv && nv.volumes && nv.volumes.length > 0) {
        // Display info for medical format images
        const vol = nv.volumes[0];
        const dims = vol.dims;
        const overlayCount = nv.volumes.length - 1;
        
        info = `${vol.name || 'Medical Image'} | ${dims[1]}×${dims[2]}`;
        if (dims[3] > 1) {
            info += `×${dims[3]}`;
        }
        if (overlayCount > 0) {
            info += ` | ${overlayCount} overlay(s)`;
        }
    } else {
        info = "Cervical Cytology AI Viewer - Ready";
    }
    
    document.getElementById('image-info').textContent = info;
}

// Global functions for UI controls
function resetView() {
    if (currentImage && usingFallback) {
        // Reset all image transformations
        imageScale = 1;
        imageX = 0;
        imageY = 0;
        brightness = 1;
        contrast = 1;
        
        // Clear annotations and redraw
        const overlayCanvas = document.getElementById('image-overlay');
        if (overlayCanvas) {
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
        
        displayImageWithNiivue(currentImage);
        updateStatus("View reset - Zoom: 100%, Position: Center, Brightness/Contrast: Normal");
    } else if (nv && nv.volumes && nv.volumes.length > 0) {
        // Reset view for medical format images
        nv.setSliceType(nv.sliceTypeAxial);
        nv.scene.renderAzimuth = 0;
        nv.scene.renderElevation = 0;
        nv.drawScene();
        updateStatus("View reset");
    }
}

// Make resetView global
window.resetView = resetView;

function toggleInfo() {
    const overlay = document.querySelector('.viewer-overlay');
    overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
}

// Make toggleInfo global
window.toggleInfo = toggleInfo;

// Function to simulate AI overlay (for demo)
async function addAIAnnotations() {
    if (!currentVolume && !currentImage) {
        showError("Load an image first");
        return;
    }
    
    updateStatus("Running AI analysis...");
    
    // Simulate AI processing
    setTimeout(() => {
        if (currentImage && usingFallback) {
            // For regular images, draw mock annotations on overlay canvas
            const overlayCanvas = document.getElementById('image-overlay');
            if (overlayCanvas && window.imagePosition) {
                const ctx = overlayCanvas.getContext('2d');
                const pos = window.imagePosition;
                
                // Add mock AI annotations (red circles for detected cells)
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                
                // Calculate positions relative to the image
                const imgCenterX = pos.x + pos.width / 2;
                const imgCenterY = pos.y + pos.height / 2;
                
                // Mock detected abnormal cells
                ctx.beginPath();
                ctx.arc(imgCenterX - 50, imgCenterY - 30, 20, 0, 2 * Math.PI);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(imgCenterX + 60, imgCenterY + 40, 25, 0, 2 * Math.PI);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(imgCenterX + 20, imgCenterY - 60, 15, 0, 2 * Math.PI);
                ctx.stroke();
                
                // Add labels with background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(imgCenterX - 70, imgCenterY - 70, 40, 16);
                ctx.fillRect(imgCenterX + 40, imgCenterY + 50, 35, 16);
                ctx.fillRect(imgCenterX, imgCenterY - 95, 45, 16);
                
                ctx.fillStyle = 'rgba(255, 255, 0, 1)';
                ctx.font = '12px Arial';
                ctx.fillText('HSIL', imgCenterX - 65, imgCenterY - 58);
                ctx.fillText('LSIL', imgCenterX + 45, imgCenterY + 62);
                ctx.fillText('ASC-US', imgCenterX + 5, imgCenterY - 83);
                
                updateStatus("AI analysis complete - 3 abnormal cells detected (demo)");
            }
        } else if (currentVolume) {
            // For medical format images, would load actual overlay
            updateStatus("AI overlay would be loaded here for medical format images");
        }
    }, 1500);
}

// Export functions for external use
window.cervicalAIViewer = {
    loadVolume,
    loadOverlay,
    addAIAnnotations,
    resetView
};
