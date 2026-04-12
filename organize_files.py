import os
import shutil

# --- Configuration ---
# Source directories for the datasets
banana_dataset_dir = '/home/mujtaba/Documents/BSE231010/Dataset/Banana'
bottle_dataset_dir = '/home/mujtaba/Documents/BSE231010/Dataset/Bottle'
cellphone_dataset_dir = '/home/mujtaba/Documents/BSE231010/Dataset/Cell Phone'
furniture_dataset_dir = '/home/mujtaba/Documents/BSE231010/Dataset/Indoor Furniture'

# Destination directory for the combined training images
output_train_images_dir = '/home/mujtaba/Documents/BSE231010/Dataset/train/images'

# --- Helper Function to Move Files ---
def move_files(src_dir, dest_dir):
    """
    Recursively finds all .jpg files in src_dir and moves them to dest_dir.
    """
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        print(f"Created destination directory: {dest_dir}")

    moved_count = 0
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.lower().endswith('.jpg'):
                src_path = os.path.join(root, file)
                dest_path = os.path.join(dest_dir, file)
                try:
                    shutil.move(src_path, dest_path)
                    moved_count += 1
                except shutil.Error as e:
                    # This can happen if a file with the same name already exists.
                    # For this case, we'll just print a warning and continue.
                    print(f"Warning: Could not move '{src_path}'. A file with that name might already exist in the destination. Error: {e}")
    return moved_count

# --- Main Execution ---
if __name__ == "__main__":
    print("Starting to organize image files...")

    # Define a list of datasets to process
    datasets_to_process = {
        'banana': banana_dataset_dir,
        'bottle': bottle_dataset_dir,
        'cellphone': cellphone_dataset_dir,
        'furniture': furniture_dataset_dir
    }

    total_moved = 0
    for name, path in datasets_to_process.items():
        print(f"\nProcessing '{name}' dataset from '{path}'...")
        if os.path.exists(path):
            moved_count = move_files(path, output_train_images_dir)
            print(f"Moved {moved_count} images from the '{name}' dataset.")
            total_moved += moved_count
        else:
            print(f"Warning: Source directory '{path}' not found. Skipping.")

    print(f"\n---\nTotal images moved to '{output_train_images_dir}': {total_moved}")

    # Clean up the old, now empty, source folders
    print("\nCleaning up old dataset directories...")
    for name, path in datasets_to_process.items():
        if os.path.exists(path):
            try:
                shutil.rmtree(path)
                print(f"Successfully removed '{path}'.")
            except OSError as e:
                print(f"Error removing directory '{path}': {e}")

    print("\nFile organization complete.")
    print("Next step: Annotate the images in the 'train/images' folder.")