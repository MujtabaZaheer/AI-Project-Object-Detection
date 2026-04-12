let currentCameraIndex = 1; // Default
        let isCameraOn = false;

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
                videoFeed.src = `/video_feed?camera_index=${currentCameraIndex}&_=${new Date().getTime()}`;
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
            cameraCombinedStatus.textContent = `Camera ${isCameraOn ? 'ON' : 'OFF'} | Index: ${currentCameraIndex}`;
        }

        /** Fetches and displays the list of available cameras. */
        async function showCameras() {
            updateStatus('Scanning for cameras...');
            try {
                const response = await fetch('/available_cameras');
                const data = await response.json();
                const cameraListDiv = document.getElementById('camera-list');
                cameraListDiv.innerHTML = ''; // Clear previous list

                if (data.cameras && data.cameras.length > 0) {
                    updateStatus(`Found ${data.cameras.length} camera(s).`);
                    window.availableCameras = data.cameras;
                    data.cameras.forEach(index => {
                        const cameraItem = document.createElement('span');
                        cameraItem.className = 'camera-item';
                        if (index === currentCameraIndex) {
                            cameraItem.classList.add('selected');
                        }
                        cameraItem.textContent = `Camera ${index}`;
                        cameraItem.onclick = () => selectCamera(index);
                        cameraListDiv.appendChild(cameraItem);
                    });
                } else {
                    updateStatus('No cameras found.', true);
                }
            } catch (error) {
                updateStatus('Error scanning for cameras.', true);
                console.error('Error scanning for cameras:', error);
            }
        }

        /**
         * Selects a camera and updates the UI.
         * @param {number} index - The index of the camera to select.
         */
        function selectCamera(index) {
            if (!window.availableCameras || !window.availableCameras.includes(index)) {
                updateStatus(`Camera index ${index} is not available.`, true);
                return;
            }
            currentCameraIndex = index;
            document.querySelectorAll('.camera-item').forEach(item => {
                item.classList.remove('selected');
                if (parseInt(item.textContent.replace('Camera ', '')) === index) {
                    item.classList.add('selected');
                }
            });
            updateStatus(`Selected Camera Index: ${index}`);
            updateVideoFeedStatus(); // Update status text immediately

            // If the camera is on, we need to restart the stream to switch.
            // This is done by turning it off and then on again.
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
            let endpoint = targetState ? `/camera_on/${currentCameraIndex}` : '/camera_off';
            let actionText = targetState ? 'Turning ON' : 'Turning OFF';

            updateStatus(`${actionText} camera...`);
            try {
                const response = await fetch(endpoint);
                const data = await response.json();
                isCameraOn = targetState;
                updateStatus(data.status);
                updateCameraUI();
                
                const summaryTableBody = document.querySelector('#summary-table tbody');
                summaryTableBody.innerHTML = '<tr><td><i class="fas fa-box"></i> Detection not active.</td></tr>';
                
                if (!isCameraOn) {
                    stopSummaryPolling(); // Ensure polling stops if camera is turned off
                }
            } catch (error) {
                updateStatus(`Error ${actionText.toLowerCase()} camera.`, true);
                console.error(`Error ${actionText.toLowerCase()} camera:`, error);
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
                selectCamera(parseInt(event.key));
            }
        });