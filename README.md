# YOLOv8 Object Detection Web Application

A comprehensive solution for training and deploying custom object detection models using YOLOv8. This project features a Flask-based web interface for real-time monitoring and detection, alongside utility scripts for data preparation and model training.

## 🚀 Features

- **Real-time Object Detection:** High-performance detection using YOLOv8 models.
- **Live Web Interface:** Flask-powered dashboard for video streaming and detection control.
- **Multi-Camera Support:** Dynamically detect and switch between available camera sources.
- **Detection Summary:** Real-time tracking of unique objects detected during a session.
- **Custom Training Pipeline:** Fine-tune pre-trained YOLOv8 models on your own datasets.
- **Automated Data Prep:** Scripts for image organization and automated pre-labeling.

## 🛠️ Tech Stack

- **Backend:** Flask, Python
- **AI/ML:** Ultralytics YOLOv8, PyTorch
- **Computer Vision:** OpenCV
- **Frontend:** HTML5, CSS3, JavaScript

## 📦 Project Structure

```text
├── app.py                # Main Flask web application
├── train.py              # YOLOv8 fine-tuning script
├── pre_label.py          # Automated image labeling utility
├── organize_files.py     # Data organization & management script
├── data.yaml             # YOLO training configuration
├── requirements.txt      # Python dependencies
├── static/               # Frontend assets (CSS, JS)
├── templates/            # HTML templates (index.html)
└── Members.txt           # Project contributors
```

## 🎯 Target Classes

The current custom model is trained to detect the following classes:
- Person
- Book
- Cellphone
- Bottle
- Chair
- Laptop

## ⚙️ Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/ai-project.git
   cd ai-project
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify Model**
   Ensure `customYolo.pt` (for detection) or `yolov8x.pt` (for training) is present in the root directory.

## 🖥️ Usage

### Running the Web Application
```bash
python app.py
```
- Open your browser and navigate to `http://localhost:5000`.
- Select a camera and click **Camera ON**.
- Use **Start Detection** to begin real-time object tracking.

### Training the Model
To start fine-tuning with your custom dataset:
```bash
python train.py
```

### Data Preparation
Organize your dataset:
```bash
python organize_files.py
```
Pre-label images:
```bash
python pre_label.py
```

## 👥 Contributors

- **Mujtaba Zaheer** (BSE231010)
- **Ayesha Babar** (BSE231036)
- **Sameer Sajid** (BSE231035)

## 📄 License

This project is for educational purposes as part of the BSE program.
