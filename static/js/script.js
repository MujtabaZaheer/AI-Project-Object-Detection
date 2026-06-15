const socket = io();
let localStream = null;
let frameInterval = null;
let currentCameraId = '';
let videoDevices = [];
let isCameraOn = false;

// Handle Socket.IO connection and response frames
socket.on('response_frame', function(data) {
    if (isCameraOn) {
        document.getElementById('video-feed').src = data;
    }
});

/**
 * Updates the status message display.
 * @param {string} message - The message to display.
 * @param {boolean} isError - Whether the message is an error.
 */
function updateStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message' + (isError ? ' error' : '');

    // This is a trick to force a reflow and restart the CSS animation.
    statusDiv.style.animation = 'none';
    void statusDiv.offsetWidth; // Trigger reflow
    statusDiv.style.animation = '';
}

/** Stops the periodic fetching of the detection summary. */
function stopSummaryPolling() {
    if (window.summaryInterval) {
        clearInterval(window.summaryInterval);
        window.summaryInterval = null;
    }
}

/** Updates the camera UI elements based on the current state. */
function updateCameraUI() {
    const videoFeed = document.getElementById('video-feed');
    const cameraToggleButton = document.getElementById('cameraToggleButton');
    
    if (isCameraOn) {
        cameraToggleButton.innerHTML = '<i class="fas fa-power-off"></i> Turn Camera Off (C)';
        cameraToggleButton.className = 'toggle-on';
    } else {
        videoFeed.src = ''; // Clear video feed
        cameraToggleButton.innerHTML = '<i class="fas fa-power-off"></i> Turn Camera On (C)';
        cameraToggleButton.className = 'toggle-off';
        stopSummaryPolling(); // Stop polling when camera is off
    }
    updateVideoFeedStatus();
}

        /** Updates the text indicating camera status and index. */
        function updateVideoFeedStatus() {
            const cameraCombinedStatus = document.getElementById('cameraCombinedStatus');
            let cameraLabel = 'Default';
            if (currentCameraId && videoDevices.length > 0) {
                const activeDevice = videoDevices.find(d => d.deviceId === currentCameraId);
                if (activeDevice) {
                    cameraLabel = activeDevice.label || 'Custom';
                }
            }
            cameraCombinedStatus.textContent = `Camera ${isCameraOn ? 'ON' : 'OFF'} | Selected: ${cameraLabel}`;
        }

        /** Enumerates and displays the list of available local cameras. */
        async function showCameras() {
            updateStatus('Scanning for cameras...');
            const cameraListDiv = document.getElementById('camera-list');
            cameraListDiv.innerHTML = ''; // Clear previous list

            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                updateStatus('Secure context required (HTTPS or localhost) for camera access. Please access via SSH port forwarding.', true);
                return;
            }

            try {
                // Request camera permission temporarily to obtain device labels if not already loaded
                if (videoDevices.length === 0 || videoDevices.every(d => !d.label)) {
                    try {
                        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                        tempStream.getTracks().forEach(track => track.stop());
                    } catch (e) {
                        console.log("Could not obtain camera permission for labels yet:", e);
                    }
                }

                const devices = await navigator.mediaDevices.enumerateDevices();
                videoDevices = devices.filter(device => device.kind === 'videoinput');

                if (videoDevices.length > 0) {
                    updateStatus(`Found ${videoDevices.length} camera(s).`);
                    videoDevices.forEach((device, index) => {
                        const cameraItem = document.createElement('span');
                        cameraItem.className = 'camera-item';
                        
                        if (!currentCameraId && index === 0) {
                            currentCameraId = device.deviceId;
                        }

                        if (device.deviceId === currentCameraId) {
                            cameraItem.classList.add('selected');
                        }
                        cameraItem.textContent = device.label || `Camera ${index + 1}`;
                        cameraItem.onclick = () => selectCamera(device.deviceId);
                        cameraListDiv.appendChild(cameraItem);
                    });
                } else {
                    updateStatus('No cameras found.', true);
                }
            } catch (error) {
                updateStatus('Error scanning for cameras: ' + error.message, true);
                console.error('Error scanning for cameras:', error);
            }
        }

        /**
         * Selects a camera and updates the UI.
         * @param {string} deviceId - The deviceId of the camera to select.
         */
        function selectCamera(deviceId) {
            currentCameraId = deviceId;
            updateStatus('Selected camera.');

            // Re-render the camera list UI to update the 'selected' class
            const cameraListDiv = document.getElementById('camera-list');
            cameraListDiv.innerHTML = '';
            videoDevices.forEach((device, index) => {
                const cameraItem = document.createElement('span');
                cameraItem.className = 'camera-item';
                if (device.deviceId === currentCameraId) {
                    cameraItem.classList.add('selected');
                }
                cameraItem.textContent = device.label || `Camera ${index + 1}`;
                cameraItem.onclick = () => selectCamera(device.deviceId);
                cameraListDiv.appendChild(cameraItem);
            });

            updateVideoFeedStatus(); // Update status text immediately

            // If the camera is on, we need to restart the stream to switch.
            if (isCameraOn) {
                toggleCamera(false); // Turn off
                setTimeout(() => toggleCamera(true), 500); // Turn on after a short delay
            }
        }

        /**
         * Toggles the camera on or off.
         * @param {boolean|null} forceState - Force the camera to be on (true) or off (false).
         */
        async function toggleCamera(forceState = null) {
            let targetState = forceState !== null ? forceState : !isCameraOn;
            let actionText = targetState ? 'Turning ON' : 'Turning OFF';

            updateStatus(`${actionText} camera...`);
            
            const localVideo = document.getElementById('local-video');
            const localCanvas = document.getElementById('local-canvas');
            const canvasContext = localCanvas ? localCanvas.getContext('2d') : null;

            if (targetState) {
                try {
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                        throw new Error("Secure context required (HTTPS or localhost) for camera access. Please access via SSH port forwarding (http://localhost:5000) or configure browser flags.");
                    }

                    const constraints = {
                        video: {
                            deviceId: currentCameraId ? { exact: currentCameraId } : undefined,
                            width: { ideal: 416 },
                            height: { ideal: 312 }
                        }
                    };
                    
                    localStream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (localVideo) {
                        localVideo.srcObject = localStream;
                        localVideo.onloadedmetadata = () => {
                            localVideo.play();
                        };
                    }

                    isCameraOn = true;
                    updateStatus('Camera turned ON');
                    updateCameraUI();
                    
                    const summaryTableBody = document.querySelector('#summary-table tbody');
                    if (summaryTableBody) {
                        summaryTableBody.innerHTML = '<tr><td><i class="fas fa-box"></i> Detection not active.</td></tr>';
                    }
                    
                    if (frameInterval) {
                        clearInterval(frameInterval);
                    }
                    
                    frameInterval = setInterval(() => {
                        if (localVideo && localVideo.readyState === localVideo.HAVE_ENOUGH_DATA && localCanvas && canvasContext) {
                            canvasContext.drawImage(localVideo, 0, 0, localCanvas.width, localCanvas.height);
                            const dataUrl = localCanvas.toDataURL('image/jpeg', 0.65);
                            socket.emit('video_frame', dataUrl);
                        }
                    }, 50); // ~20 FPS

                } catch (error) {
                    isCameraOn = false;
                    updateStatus('Error: ' + error.message, true);
                    console.error('Error turning on camera:', error);
                    updateCameraUI();
                }
            } else {
                isCameraOn = false;
                
                if (frameInterval) {
                    clearInterval(frameInterval);
                    frameInterval = null;
                }
                
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                    localStream = null;
                }
                
                if (localVideo) {
                    localVideo.srcObject = null;
                }
                
                updateStatus('Camera turned OFF');
                updateCameraUI();
            }
        }

        /** Starts the object detection process. */
        async function startDetection() {
            if (!isCameraOn) {
                updateStatus('Please turn on the camera first!', true);
                return;
            }
            updateStatus('Starting detection...');
            try {
                const response = await fetch('/start_detection');
                const data = await response.json();
                updateStatus(data.status);
                const summaryTableBody = document.querySelector('#summary-table tbody');
                summaryTableBody.innerHTML = '<tr><td><i class="fas fa-box"></i> Detection active. Items will appear here.</td></tr>';
                
                // Start polling for summary updates if not already polling.
                if (!window.summaryInterval) {
                    window.summaryInterval = setInterval(getSummary, 2000); // Poll every 2 seconds
                }
            } catch (error) {
                updateStatus('Error starting detection.', true);
                console.error('Error starting detection:', error);
            }
        }

        /** Stops the object detection process. */
        async function stopDetection() {
            updateStatus('Stopping detection...');
            try {
                const response = await fetch('/stop_detection');
                const data = await response.json();
                updateStatus(data.status);
                stopSummaryPolling();
                displaySummary(data.summary);
                
                const summaryTableBody = document.querySelector('#summary-table tbody');
                const stopRow = document.createElement('tr');
                stopRow.innerHTML = `<td><i class="fas fa-info-circle"></i> Detection stopped.</td>`;
                summaryTableBody.appendChild(stopRow);
            } catch (error) {
                updateStatus('Error stopping detection.', true);
                console.error('Error stopping detection:', error);
            }
        }

        /** Fetches the latest detection summary from the server. */
        async function getSummary() {
            try {
                const response = await fetch('/summary');
                const data = await response.json();
                displaySummary(data.summary);
            } catch (error) {
                console.error('Error fetching summary:', error);
                // Don't show an error message to the user for polling failures
            }
        }

        /**
         * Displays the a-zA-Z0-9 detected items in the summary table.
         * @param {string[]} summary - An array of detected item labels.
         */
        function displaySummary(summary) {
            const summaryTableBody = document.querySelector('#summary-table tbody');
            summaryTableBody.innerHTML = ''; // Clear previous items

            if (summary && summary.length > 0) {
                summary.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td><i class="fas fa-box"></i> ${item}</td>`;
                    summaryTableBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                row.innerHTML = `<td><i class="fas fa-box"></i> No items detected yet.</td>`;
                summaryTableBody.appendChild(row);
            }
        }

        // --- Event Listeners ---

        // Initial setup on load
        window.onload = function() {
            updateCameraUI();
            showCameras(); // Automatically scan for cameras on load
        };

        // Keyboard controls
        document.addEventListener('keydown', function(event) {
            if (event.code === 'Space') {
                event.preventDefault();
                startDetection();
            } else if (event.code === 'Escape') {
                stopDetection();
            } else if (event.key.toLowerCase() === 'c') {
                event.preventDefault();
                toggleCamera();
            } else if (event.key.toLowerCase() === 's') {
                event.preventDefault();
                showCameras();
            } else if (!isNaN(event.key) && event.key.trim() !== '') {
                event.preventDefault();
                const camIndex = parseInt(event.key) - 1;
                if (videoDevices[camIndex]) {
                    selectCamera(videoDevices[camIndex].deviceId);
                } else {
                    updateStatus(`Camera index ${event.key} not available.`, true);
                }
            }
        });