import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'libs'))

from flask import Flask, render_template, Response, jsonify
import cv2
from ultralytics import YOLO

app = Flask(__name__)

camera = None
current_camera_index = 1
is_camera_active = False
model = None
detection_active = False
detected_items_summary = set()

print("Loading Your Object Detection) Model... please wait.")
try:
    model = YOLO('customYolo.pt')
    print("Model loaded successfully on CPU!")
except Exception as e:
    print(f"Critical Error loading YOLO model: {e}.")
    exit()

def get_available_cameras():
    camera_indices = []
    for i in range(5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            cap.release()
            camera_indices.append(i)
    return camera_indices

def get_camera_feed():
    global detection_active, detected_items_summary, camera, is_camera_active, current_camera_index

    if not is_camera_active:
        return

    if camera is None or not camera.isOpened():
        camera = cv2.VideoCapture(current_camera_index)
        if not camera.isOpened():
            print(f"Error: Could not open video stream from camera {current_camera_index}.")
            is_camera_active = False
            return

    while is_camera_active:
        ret, frame = camera.read()
        if not ret:
            print("Failed to grab frame. The camera may have been disconnected.")
            is_camera_active = False 
            break

        frame = cv2.flip(frame, 1)

        if detection_active and model:
            results = model(frame)
            annotated_frame = results[0].plot()
            for c in results[0].boxes.cls:
                label = results[0].names[int(c)]
                detected_items_summary.add(label)
            frame = annotated_frame
        
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            frame_bytes = buffer.tobytes()
        
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    if camera is not None:
        camera.release()
        camera = None
    print("Camera stream stopped and camera released.")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(get_camera_feed(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_detection')
def start_detection():
    global detection_active, detected_items_summary
    detection_active = True
    detected_items_summary = set()
    print("Detection Started!")
    return jsonify(status="Detection started")

@app.route('/stop_detection')
def stop_detection():
    global detection_active
    detection_active = False
    print("Detection Stopped!")
    return jsonify(status="Detection stopped", summary=list(detected_items_summary))

@app.route('/summary')
def get_summary():
    return jsonify(summary=list(detected_items_summary))

@app.route('/available_cameras')
def available_cameras():
    cameras = get_available_cameras()
    return jsonify(cameras=cameras)

@app.route('/camera_on/<int:index>')
def camera_on(index):
    global is_camera_active, current_camera_index, camera
    if camera is not None:
        camera.release()
        camera = None
    current_camera_index = index
    is_camera_active = True
    print(f"Camera {current_camera_index} turned ON.")
    return jsonify(status=f"Camera {current_camera_index} turned ON")

@app.route('/camera_off')
def camera_off():
    global is_camera_active, camera
    is_camera_active = False
    if camera is not None:
        camera.release()
        camera = None
    print("Camera turned OFF.")
    return jsonify(status="Camera turned OFF")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
