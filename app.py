import os
import base64
import cv2
import numpy as np
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO, emit
from ultralytics import YOLO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'yolo_secret_key_bse'
# Initialize SocketIO with cross-origin allowance for cloud traffic
socketio = SocketIO(app, cors_allowed_origins="*")

model = None
detection_active = False
detected_items_summary = set()

print("Loading Your Object Detection Model... please wait.")
try:
    model = YOLO('customYolo.pt')
    print("Model loaded successfully on CPU!")
except Exception as e:
    print(f"Critical Error loading YOLO model: {e}")
    exit()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('video_frame')
def handle_video_frame(data):
    global detection_active, detected_items_summary
    try:
        # Decode base64 image chunk sent from client browser
        encoded_data = data.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is not None:
            # Run inference if user clicked 'Start Detection'
            if detection_active and model:
                results = model(frame)
                frame = results[0].plot() # Overwrite with bounding box canvas
                
                for c in results[0].boxes.cls:
                    label = results[0].names[int(c)]
                    detected_items_summary.add(label)

            # Mirror the frame to preserve your original layout preview format
            frame = cv2.flip(frame, 1)

            # Encode processed frame back to standard string transmission layout
            _, buffer = cv2.imencode('.jpg', frame)
            b64_frame = base64.b64encode(buffer).decode('utf-8')
            
            # Emit back down to the local browser window view context
            emit('response_frame', 'data:image/jpeg;base64,' + b64_frame)
    except Exception as e:
        pass

@app.route('/start_detection')
def start_detection_route():
    global detection_active, detected_items_summary
    detection_active = True
    detected_items_summary = set()
    return jsonify(status="Detection started")

@app.route('/stop_detection')
def stop_detection_route():
    global detection_active
    detection_active = False
    return jsonify(status="Detection stopped", summary=list(detected_items_summary))

@app.route('/summary')
def get_summary():
    return jsonify(summary=list(detected_items_summary))

@app.route('/available_cameras')
def available_cameras():
    # Mocking single-client local browser web-camera stream index visibility mapping
    return jsonify(cameras=[0])

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
