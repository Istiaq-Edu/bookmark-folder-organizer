"""
Extension Packaging Script
Creates a .xpi file (Firefox extension package) from the bookmark-folder-organizer directory
"""

import os
import zipfile
from datetime import datetime

# Configuration
SOURCE_DIR = "bookmark-folder-organizer"
OUTPUT_DIR = "dist"
EXTENSION_NAME = "bookmark-folder-organizer"

# Files and folders to include
INCLUDE_PATTERNS = [
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "README.md",
    "services/*.js",
    "icons/*.png"
]

# Files and folders to exclude
EXCLUDE_PATTERNS = [
    "*.test.js",
    "*.test.md",
    ".gitkeep",
    "node_modules",
    ".git",
    ".DS_Store",
    "Thumbs.db"
]

def should_include(file_path):
    """Check if file should be included in the package"""
    # Exclude test files and other unwanted files
    for pattern in EXCLUDE_PATTERNS:
        if pattern in file_path or file_path.endswith(pattern.replace('*', '')):
            return False
    return True

def create_xpi():
    """Create .xpi package from source directory"""
    
    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Get version from manifest.json
    import json
    manifest_path = os.path.join(SOURCE_DIR, "manifest.json")
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
        version = manifest.get('version', '1.0.0')
    
    # Create output filename with version and timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"{EXTENSION_NAME}-{version}.xpi"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    print(f"Creating Firefox extension package...")
    print(f"Source: {SOURCE_DIR}/")
    print(f"Output: {output_path}")
    print(f"Version: {version}\n")
    
    # Create ZIP file (which is what .xpi is)
    file_count = 0
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Walk through source directory
        for root, dirs, files in os.walk(SOURCE_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                
                # Check if file should be included
                if should_include(file_path):
                    # Calculate archive name (relative path from source dir)
                    arcname = os.path.relpath(file_path, SOURCE_DIR)
                    
                    # Add file to zip
                    zipf.write(file_path, arcname)
                    print(f"  ✓ Added: {arcname}")
                    file_count += 1
                else:
                    print(f"  ✗ Skipped: {os.path.relpath(file_path, SOURCE_DIR)}")
    
    # Get file size
    file_size = os.path.getsize(output_path)
    file_size_kb = file_size / 1024
    
    print(f"\n{'='*60}")
    print(f"✓ Package created successfully!")
    print(f"{'='*60}")
    print(f"File: {output_path}")
    print(f"Size: {file_size_kb:.2f} KB")
    print(f"Files: {file_count}")
    print(f"\nNext steps:")
    print(f"1. Test: Load the .xpi in Firefox (about:debugging)")
    print(f"2. Publish: Upload to addons.mozilla.org")
    print(f"3. Share: Distribute the .xpi file directly")

def main():
    """Main function"""
    # Check if source directory exists
    if not os.path.exists(SOURCE_DIR):
        print(f"Error: Source directory '{SOURCE_DIR}' not found!")
        print(f"Make sure you're running this script from the correct location.")
        return
    
    # Check if manifest.json exists
    manifest_path = os.path.join(SOURCE_DIR, "manifest.json")
    if not os.path.exists(manifest_path):
        print(f"Error: manifest.json not found in '{SOURCE_DIR}'!")
        return
    
    # Create the package
    try:
        create_xpi()
    except Exception as e:
        print(f"\n✗ Error creating package: {e}")
        return

if __name__ == "__main__":
    main()
