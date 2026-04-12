import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'libs'))

from ultralytics import YOLO

model = YOLO('yolov8x.pt')

print("Starting YOLOv8 fine-tuning...")
model.train(
    data='/home/mujtaba/Documents/BSE231010/data.yaml',
    epochs=50,
    imgsz=640,
    batch=8,
    name='yolov8x_custom'
)
print("Fine-tuning complete!")
