// Global variables for viewer state
let currentImage = null;
let imageScale = 1;
let imageX = 0;
let imageY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let canvas, ctx;

// Global Niivue instance
let nv = null;

document.addEventListener("DOMContentLoaded", async () => {
    canvas = document.getElementById("gl1");
    
    // Initialize Niivue with medical imaging capabilities
    await initializeNiivue();
    
    // Set canvas to full viewport size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Setup drag and drop functionality (Niivue has built-in support)
    setupDragAndDrop();
    
    // Setup file input
    setupFileInput();
    
    // Show initial message
    showWelcomeMessage();
    
    // Load default image if available
    loadDefaultImage();
});

async function initializeNiivue() {
    try {
        // Initialize Niivue with medical imaging optimizations
        nv = new niivue.Niivue({
            isResizeCanvas: true,
            dragAndDropEnabled: true,
            show3Dcrosshair: false,
            backColor: [0, 0, 0, 1], // Black background
            crosshairColor: [0, 1, 0, 1], // Green crosshair
            isColorbar: false, // Hide colorbar initially
            textHeight: 0.03,
            isOrientCube: false // Hide orientation cube for 2D slides
        });
        
        // Attach to canvas
    await nv.attachTo("gl1");
        
        // Set up event listeners for Niivue
        setupNiivueEventListeners();
        
        updateStatus("Niivue medical viewer initialized");
        console.log("Niivue initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize Niivue:", error);
        updateStatus("Error: Failed to initialize medical viewer");
        // Fallback to basic canvas if Niivue fails
        ctx = canvas.getContext("2d");
        setupMouseControls();
    }
}

function setupNiivueEventListeners() {
    if (!nv) return;
    
    // Listen for image loading events
    nv.onImageLoaded = function() {
        updateStatus("Medical image loaded successfully");
        updateImageInfoNiivue();
    };
    
    // Listen for mouse events for coordinate display
    canvas.addEventListener('mousemove', (e) => {
        if (nv && nv.volumes && nv.volumes.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Convert screen coordinates to image coordinates
            const coords = nv.screenToImageCoordinates(x, y);
            if (coords) {
                document.getElementById('coordinates').textContent = `${Math.round(coords[0])}, ${Math.round(coords[1])}`;
            }
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        document.getElementById('coordinates').textContent = '';
    });
}

async function loadDefaultImage() {
    try {
        if (nv) {
            // Try to load with Niivue first (for medical formats)
            try {
                await nv.loadVolumes([{
                    url: "assets/test-image.jpg",
                    name: "Cervical Cytology Sample",
                    colormap: "gray"
                }]);
                updateStatus("Default image loaded with Niivue - Try dragging medical images!");
                return;
            } catch (niivueError) {
                console.log("Niivue couldn't load JPEG, falling back to canvas method");
            }
        }
        
        // Fallback to canvas method for standard images
        const img = new Image();
        img.onload = function() {
            if (nv) {
                // If Niivue is available but couldn't load the image, show welcome
                showWelcomeMessage();
            } else {
                // Use canvas fallback
                currentImage = img;
                resetView();
                updateStatus("Default image loaded - Try dragging and dropping your own!");
                updateImageInfo();
            }
            console.log("Default image loaded successfully");
        };
        
        img.onerror = function() {
            showWelcomeMessage();
            console.log("No default image found - ready for drag and drop");
        };
        
        // Start loading the image
        img.src = "assets/test-image.jpg";
        
    } catch (error) {
        console.error("Error in default image loading:", error);
        showWelcomeMessage();
    }
}

function showWelcomeMessage() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#666";
    ctx.font = "24px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Cervical Cytology AI Viewer", canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.fillStyle = "#888";
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillText("Drag and drop medical images here", canvas.width / 2, canvas.height / 2);
    ctx.fillText("or click 'Load Image' button", canvas.width / 2, canvas.height / 2 + 25);
    
    ctx.fillStyle = "#555";
    ctx.font = "12px 'Segoe UI', sans-serif";
    ctx.fillText("Supported formats: JPEG, PNG, TIFF, DICOM, NIfTI", canvas.width / 2, canvas.height / 2 + 60);
    
    updateStatus("Ready - Drag and drop medical images or click Load Image");
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 30; // Account for status bar
    if (currentImage) {
        drawImage();
    }
}

function showLoadingMessage() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#888";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Loading cervical cytology image...", canvas.width / 2, canvas.height / 2);
    updateStatus("Loading...");
}

function showError(message) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff6b6b";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    updateStatus("Error");
}

function drawImage() {
    if (!currentImage) return;
    
    // Clear canvas with black background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate image position and size
    const scaledWidth = currentImage.width * imageScale;
    const scaledHeight = currentImage.height * imageScale;
    const x = imageX + (canvas.width - scaledWidth) / 2;
    const y = imageY + (canvas.height - scaledHeight) / 2;
    
    // Draw the image
    ctx.drawImage(currentImage, x, y, scaledWidth, scaledHeight);
    
    // Add subtle border around image
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, scaledWidth, scaledHeight);
}

function resetView() {
    if (!currentImage) return;
    
    // Calculate initial scale to fit image in viewport
    const scaleX = (canvas.width * 0.8) / currentImage.width;
    const scaleY = (canvas.height * 0.8) / currentImage.height;
    imageScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    
    // Center the image
    imageX = 0;
    imageY = 0;
    
    drawImage();
    updateStatus("View reset");
}

function setupMouseControls() {
    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = imageScale * zoomFactor;
        
        // Limit zoom range
        if (newScale >= 0.1 && newScale <= 10) {
            imageScale = newScale;
            drawImage();
            updateStatus(`Zoom: ${Math.round(imageScale * 100)}%`);
        }
    });
    
    // Mouse drag for pan
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
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
            
            drawImage();
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
}

function updateStatus(message) {
    document.getElementById('status-text').textContent = message;
}

function updateCoordinates(mouseX, mouseY) {
    if (!currentImage) return;
    
    // Calculate image coordinates
    const scaledWidth = currentImage.width * imageScale;
    const scaledHeight = currentImage.height * imageScale;
    const imageLeft = imageX + (canvas.width - scaledWidth) / 2;
    const imageTop = imageY + (canvas.height - scaledHeight) / 2;
    
    // Check if mouse is over image
    if (mouseX >= imageLeft && mouseX <= imageLeft + scaledWidth &&
        mouseY >= imageTop && mouseY <= imageTop + scaledHeight) {
        
        // Convert to image coordinates
        const imgX = Math.round((mouseX - imageLeft) / imageScale);
        const imgY = Math.round((mouseY - imageTop) / imageScale);
        
        document.getElementById('coordinates').textContent = `${imgX}, ${imgY}`;
    } else {
        document.getElementById('coordinates').textContent = '';
    }
}



function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const viewerContainer = document.querySelector('.viewer-container');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        viewerContainer.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        viewerContainer.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        viewerContainer.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    viewerContainer.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        dropZone.classList.add('drag-over');
        updateStatus("Drop image to load");
    }
    
    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
        if (!currentImage) {
            updateStatus("Ready - Drag and drop medical images or click Load Image");
        }
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }
}

function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
}

async function handleFiles(files) {
    const file = files[0];
    
    if (!file) return;
    
    updateStatus(`Loading ${file.name}...`);
    showLoadingMessage(`Loading ${file.name}...`);
    
    // Try Niivue first for medical formats
    if (nv) {
        try {
            // Create a temporary URL for the file
            const fileUrl = URL.createObjectURL(file);
            
            await nv.loadVolumes([{
                url: fileUrl,
                name: file.name,
                colormap: "gray"
            }]);
            
            updateStatus(`${file.name} loaded successfully with Niivue`);
            updateImageInfoNiivue();
            console.log(`Medical image loaded: ${file.name}`);
            
            // Clean up the temporary URL
            URL.revokeObjectURL(fileUrl);
            return;
            
        } catch (niivueError) {
            console.log(`Niivue couldn't load ${file.name}, trying fallback method:`, niivueError);
            // Clean up the temporary URL
            URL.revokeObjectURL(fileUrl);
        }
    }
    
    // Fallback for standard image formats
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                if (nv) {
                    // If Niivue is available but couldn't load, show message
                    showError(`${file.name} loaded as standard image. For full medical imaging features, use NIfTI, DICOM, or TIFF formats.`);
                    updateStatus(`${file.name} loaded (standard format)`);
                } else {
                    // Canvas fallback
                    currentImage = img;
                    resetView();
                    updateStatus(`${file.name} loaded successfully`);
                    updateImageInfo(file.name);
                }
                console.log(`Image loaded: ${file.name}`);
            };
            
            img.onerror = function() {
                showError(`Failed to load ${file.name}`);
                updateStatus("Error loading image");
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            showError(`Failed to read ${file.name}`);
            updateStatus("Error reading file");
        };
        
        reader.readAsDataURL(file);
    } else {
        // Unknown format
        showError(`Unsupported file format: ${file.name}. Please use medical imaging formats (NIfTI, DICOM, TIFF) or standard images (JPEG, PNG).`);
        updateStatus("Unsupported file format");
    }
}

function showLoadingMessage(message = "Loading cervical cytology image...") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#888";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    
    // Add loading animation dots
    let dots = 0;
    const loadingInterval = setInterval(() => {
        if (currentImage) {
            clearInterval(loadingInterval);
            return;
        }
        
        ctx.fillStyle = "#000";
        ctx.fillRect(canvas.width / 2 - 50, canvas.height / 2 + 20, 100, 30);
        ctx.fillStyle = "#888";
        ctx.fillText(".".repeat((dots % 3) + 1), canvas.width / 2, canvas.height / 2 + 40);
        dots++;
    }, 500);
}

function updateImageInfo(filename = null) {
    if (!currentImage) return;
    
    const name = filename || "Cervical Cytology Sample";
    const info = `${name} | ${currentImage.width}×${currentImage.height}px | Zoom: ${Math.round(imageScale * 100)}%`;
    document.getElementById('image-info').textContent = info;
}

function updateImageInfoNiivue() {
    if (!nv || !nv.volumes || nv.volumes.length === 0) return;
    
    const vol = nv.volumes[0];
    const name = vol.name || "Medical Image";
    const dims = vol.dims;
    const info = `${name} | ${dims[1]}×${dims[2]}×${dims[3]} | Medical Format`;
    document.getElementById('image-info').textContent = info;
}

// Global functions for UI controls
function resetView() {
    if (nv && nv.volumes && nv.volumes.length > 0) {
        // Reset Niivue view
        nv.setSliceType(nv.sliceTypeAxial);
        nv.scene.renderAzimuth = 0;
        nv.scene.renderElevation = 0;
        nv.drawScene();
        updateStatus("Niivue view reset");
    } else if (currentImage) {
        // Reset canvas view
        const scaleX = (canvas.width * 0.8) / currentImage.width;
        const scaleY = (canvas.height * 0.8) / currentImage.height;
        imageScale = Math.min(scaleX, scaleY, 1);
        
        imageX = 0;
        imageY = 0;
        
        drawImage();
        updateStatus("View reset");
    }
}

function toggleInfo() {
    const overlay = document.querySelector('.viewer-overlay');
    overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
}
  