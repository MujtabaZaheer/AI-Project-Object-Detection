import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'libs'))

from ultralytics import YOLO
import os

# --- Configuration ---
# Directory with images to be pre-labeled.
input_image_dir = '/home/mujtaba/Documents/BSE231010/Dataset/train/images'

# Directory to save the generated YOLO label files.
output_label_dir = '/home/mujtaba/Documents/BSE231010/Dataset/train/labels'

# Pre-trained model for detection.
model_path = 'yolov8x.pt'

# Confidence threshold for saving detections.
confidence_threshold = 0.25

# IoU threshold for Non-Maximum Suppression.
iou_threshold = 0.7

# --- Main Execution ---
if __name__ == '__main__':
    # --- Initialize Model ---
    try:
        model = YOLO(model_path)
        print(f"YOLOv8 model '{model_path}' loaded successfully.")
    except Exception as e:
        print(f"Error loading YOLO model: {e}")
        exit()

    # --- Prepare Directories ---
    if not os.path.exists(input_image_dir):
        print(f"Error: Input image directory '{input_image_dir}' does not exist.")
        exit()
    if not os.path.exists(output_label_dir):
        os.makedirs(output_label_dir)
        print(f"Created output label directory: '{output_label_dir}'")

    image_files = [f for f in os.listdir(input_image_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not image_files:
        print(f"No images found in '{input_image_dir}'.")
        exit()

    # --- Define Relevant Classes ---
    # We are looking for objects that might be 'pen' or 'wallet'.
    # The base YOLO model does not have these classes, so we use 'book' and 'notebook'
    # as proxies, which may have similar shapes. This requires manual correction later.
    relevant_classes = ['book', 'notebook']
    model_class_names = model.names

    print(f"\nStarting pre-labeling for {len(image_files)} images...")
    print(f"Looking for classes: {relevant_classes}")

    # --- Process Each Image ---
    for image_name in image_files:
        image_path = os.path.join(input_image_dir, image_name)
        label_name = os.path.splitext(image_name)[0] + '.txt'
        label_path = os.path.join(output_label_dir, label_name)

        # Perform inference
        results = model(image_path, conf=confidence_threshold, iou=iou_threshold, verbose=False)
        result = results[0] # Get the first result
        
        img_height, img_width = result.orig_shape

        detections = []
        for box in result.boxes:
            class_id = int(box.cls[0])
            class_name = model_class_names.get(class_id)

            # Save detections only for relevant classes
            if class_name in relevant_classes:
                # Convert coordinates to normalized YOLO format (center_x, center_y, width, height)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x_center = ((x1 + x2) / 2) / img_width
                y_center = ((y1 + y2) / 2) / img_height
                width = (x2 - x1) / img_width
                height = (y2 - y1) / img_height
                
                # The class_id from the pre-trained model is used. This will need to be
                # manually changed to the correct class ID for your custom dataset.
                detections.append(f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")
        
        if detections:
            with open(label_path, 'w') as f:
                f.write("\n".join(detections))
            print(f"  Labeled '{image_name}' with {len(detections)} objects.")

    print("\nPre-labeling complete.")
    print(f"Labels saved in: '{output_label_dir}'")
    print("IMPORTANT: You must now manually review these labels and correct the class IDs.")

