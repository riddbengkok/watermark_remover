#!/usr/bin/env python3
"""
Watermark Position Finder
This script helps you find the exact position of the watermark in your video.
"""

import subprocess
import sys
import os

def get_video_info(video_path):
    """Get video dimensions"""
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0',
        video_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            width, height = result.stdout.strip().split(',')
            return int(width), int(height)
        else:
            print(f"Error getting video info: {result.stderr}")
            return None, None
    except subprocess.TimeoutExpired:
        print("Timeout while getting video info")
        return None, None
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def extract_frame(video_path, timestamp="5", output_path="watermark_frame.jpg"):
    """Extract a frame from the video"""
    cmd = [
        'ffmpeg',
        '-ss', timestamp,
        '-i', video_path,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        output_path
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            return True
        else:
            print(f"Error extracting frame: {result.stderr}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def calculate_positions(width, height):
    """Calculate common watermark positions"""
    
    # Typical watermark size
    wm_width = 200
    wm_height = 60
    margin = 20
    
    positions = {
        "Bottom Right": {
            "x": width - wm_width - margin,
            "y": height - wm_height - margin,
            "width": wm_width,
            "height": wm_height
        },
        "Bottom Left": {
            "x": margin,
            "y": height - wm_height - margin,
            "width": wm_width,
            "height": wm_height
        },
        "Bottom Center": {
            "x": (width // 2) - (wm_width // 2),
            "y": height - wm_height - margin,
            "width": wm_width,
            "height": wm_height
        },
        "Top Right": {
            "x": width - wm_width - margin,
            "y": margin,
            "width": wm_width,
            "height": wm_height
        },
        "Top Left": {
            "x": margin,
            "y": margin,
            "width": wm_width,
            "height": wm_height
        },
        "Center": {
            "x": (width // 2) - (wm_width // 2),
            "y": (height // 2) - (wm_height // 2),
            "width": wm_width,
            "height": wm_height
        }
    }
    
    return positions

def main():
    print("=" * 60)
    print("🔍 WATERMARK POSITION FINDER")
    print("=" * 60)
    print()
    
    # Get list of video files
    video_files = [f for f in os.listdir('.') if f.endswith(('.mp4', '.avi', '.mov', '.mkv'))]
    
    if not video_files:
        print("❌ No video files found in current directory!")
        sys.exit(1)
    
    print("📹 Found video files:")
    for i, video in enumerate(video_files, 1):
        print(f"   {i}. {video}")
    print()
    
    # Select first video by default
    video_path = video_files[0]
    print(f"📊 Analyzing: {video_path}")
    print()
    
    # Get video dimensions
    print("⏳ Getting video dimensions...")
    width, height = get_video_info(video_path)
    
    if width is None or height is None:
        print("❌ Could not get video dimensions!")
        sys.exit(1)
    
    print(f"✅ Video Resolution: {width}x{height}")
    print()
    
    # Calculate positions
    positions = calculate_positions(width, height)
    
    print("=" * 60)
    print("📍 SUGGESTED WATERMARK POSITIONS FOR YOUR VIDEO")
    print("=" * 60)
    print()
    
    print(f"Your video is {width}x{height}")
    print()
    print("For OpusClip watermarks, try these positions:")
    print()
    
    # Highlight most common positions for OpusClip
    priority_positions = ["Bottom Right", "Bottom Center", "Bottom Left"]
    
    for pos_name in priority_positions:
        pos = positions[pos_name]
        print(f"🎯 {pos_name} (RECOMMENDED):")
        print(f"   X Position: {pos['x']}")
        print(f"   Y Position: {pos['y']}")
        print(f"   Width: {pos['width']}")
        print(f"   Height: {pos['height']}")
        print()
    
    print("Other positions:")
    print()
    
    for pos_name in ["Top Right", "Top Left", "Center"]:
        pos = positions[pos_name]
        print(f"   {pos_name}:")
        print(f"   X: {pos['x']}, Y: {pos['y']}, W: {pos['width']}, H: {pos['height']}")
    
    print()
    print("=" * 60)
    print("📝 HOW TO USE THESE VALUES:")
    print("=" * 60)
    print()
    print("1. Open http://localhost:5001 in your browser")
    print("2. Upload your video")
    print("3. Copy the values above into the position fields")
    print("4. Start with 'Bottom Right' (most common for OpusClip)")
    print("5. If the watermark isn't fully covered, adjust the values")
    print()
    print("💡 TIP: You can increase Width and Height by 20-50 pixels")
    print("   to make sure you capture the entire watermark!")
    print()
    
    # Extract a frame
    print("=" * 60)
    print("📸 Extracting sample frame...")
    print("=" * 60)
    print()
    
    frame_path = "watermark_sample.jpg"
    if extract_frame(video_path, "5", frame_path):
        print(f"✅ Sample frame saved to: {frame_path}")
        print()
        print("📝 Open this image to see where the watermark is located!")
        print("   This will help you verify the position.")
    else:
        print("⚠️  Could not extract frame, but you can still use the values above.")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
