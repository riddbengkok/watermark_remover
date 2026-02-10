# 🎬 Video Watermark Remover

A powerful web application for removing watermarks from videos with an interactive drag-and-drop interface and live preview.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/flask-3.0+-green.svg)
![FFmpeg](https://img.shields.io/badge/ffmpeg-required-red.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

### 🎯 Core Features
- **Multiple Watermark Removal** - Remove multiple watermarks from a single video
- **Bulk Processing** - Process multiple videos simultaneously
- **Live Preview** - See exactly where watermarks will be removed
- **Interactive Positioning** - Drag boxes to position, drag corners to resize
- **Multiple Methods** - Smart Removal (Delogo), Blur, or Cover options
- **Format Preservation** - Maintains original video format (MP4, MOV, AVI, etc.)

### 🎨 Interactive Interface
- **Drag & Drop Upload** - Easy video upload
- **Real-time Preview** - Extracts frame from middle of video
- **Visual Editor** - Drag red boxes to position over watermarks
- **Corner Resize** - Drag corners to adjust watermark box size
- **Live Updates** - Input fields update as you drag

### 🚀 Advanced Features
- **Pre-configured for OpusClip** - Default settings optimized for OpusClip watermarks
- **Quick Presets** - One-click positioning for common watermark locations
- **Progress Tracking** - Real-time progress updates for each video
- **Video Preview** - Preview processed videos before downloading
- **Batch Download** - Download all processed videos

## 📋 Requirements

- Python 3.8+
- FFmpeg (must be installed and in PATH)
- Modern web browser

## 🔧 Installation

### Quick Setup for macOS 🍎

Follow these steps to get the app running on your MacBook:

#### Step 1: Clone the repository

Open Terminal and run:

```bash
git clone https://github.com/riddbengkok/watermark_remover.git
cd watermark_remover
```

#### Step 2: Install FFmpeg

FFmpeg is required for video processing. Install using Homebrew:

```bash
# If you don't have Homebrew, install it first:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg

# Verify installation
ffmpeg -version
```

#### Step 3: Create virtual environment

Create an isolated Python environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

#### Step 4: Install Python dependencies

```bash
pip install -r requirements.txt
```

Or install manually:

```bash
pip install flask werkzeug
```

#### Step 5: Create required folders

```bash
mkdir -p uploads outputs
```

---

### 📦 Installation for Other Platforms

<details>
<summary>Ubuntu/Debian Linux</summary>

```bash
# Install FFmpeg
sudo apt update
sudo apt install ffmpeg python3 python3-venv python3-pip

# Clone repository
git clone https://github.com/riddbengkok/watermark_remover.git
cd watermark_remover

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create folders
mkdir -p uploads outputs
```
</details>

<details>
<summary>Windows</summary>

1. **Install FFmpeg:**
   - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Extract and add to System PATH
   - Open CMD and verify: `ffmpeg -version`

2. **Clone repository:**
   ```cmd
   git clone https://github.com/riddbengkok/watermark_remover.git
   cd watermark_remover
   ```

3. **Setup virtual environment:**
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```

4. **Install dependencies:**
   ```cmd
   pip install -r requirements.txt
   ```

5. **Create folders:**
   ```cmd
   mkdir uploads outputs
   ```
</details>

---

## 🚀 Running the App

### On macOS 🍎

#### Method 1: Use the startup script (Easiest)

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Run the app
./start.sh
```

#### Method 2: Manual startup

```bash
# Navigate to project folder
cd watermark_remover

# Activate virtual environment
source venv/bin/activate

# Run the app
python app.py
```

The app will start and show:

```
 * Running on http://0.0.0.0:5001
 * Running on http://127.0.0.1:5001
```

#### Open in browser

Open your web browser and go to:

```
http://localhost:5001
```

#### Stop the app

Press `Ctrl + C` in the terminal to stop the server.

---

### 💡 Quick Start (macOS One-Liner)

After initial setup, you can start the app with:

```bash
cd watermark_remover && source venv/bin/activate && python app.py
```

Or create an alias in your `~/.zshrc` or `~/.bash_profile`:

```bash
alias watermark='cd ~/Documents/watermark_remover && source venv/bin/activate && python app.py'
```

Then just run: `watermark`

### Basic Workflow

1. **Upload Videos** - Drag & drop or select multiple videos
2. **Adjust Position** - Use live preview to position watermark removal box:
   - **Drag the red box** to move it
   - **Drag corners** to resize it
   - Or enter exact coordinates manually
3. **Choose Method**:
   - **Smart Removal (Delogo)** - Recommended for logos
   - **Blur** - Blur out the watermark
   - **Cover** - Cover with black box
4. **Process** - Click "Start Bulk Processing"
5. **Preview & Download** - Preview results and download processed videos

### OpusClip Watermark (Default)

The app comes pre-configured with perfect settings for OpusClip watermarks:
```
X: 119, Y: 253, Width: 362, Height: 92
```

Just upload your OpusClip videos and hit process!

## 📐 Default Coordinates

The app is pre-configured for **OpusClip watermarks** with these exact coordinates:

- **X Position**: 119px
- **Y Position**: 253px (middle-left of vertical video)
- **Width**: 362px
- **Height**: 92px

These values work perfectly for vertical videos (1080x1920) with the OpusClip logo.

## 🎯 Watermark Removal Methods

### 1. Smart Removal (Delogo) ⭐ Recommended
- Uses FFmpeg's delogo filter
- Intelligently removes logos and watermarks
- Best for semi-transparent or solid watermarks
- Preserves video quality

### 2. Blur
- Applies Gaussian blur to watermark area
- Good for logos that can't be fully removed
- Makes watermark unreadable while maintaining video aesthetics

### 3. Cover (Black Box)
- Covers watermark with solid black box
- Simple and fast
- Use when other methods don't work well

## 🎨 Interface Features

### Live Preview
- Automatically extracts frame from **middle of video**
- Shows red overlay boxes indicating removal areas
- Real-time updates as you adjust position

### Drag & Drop Controls
- **Move**: Click and drag the red box
- **Resize**: Click and drag corner handles
- **Cursor Feedback**: Changes to show available actions
  - ✋ Move cursor over box
  - ⤡ Resize cursor over corners
  - 👊 Grabbing cursor while dragging

### Multiple Watermarks
- Add unlimited watermark regions
- Each watermark can be positioned independently
- Enable/disable individual watermarks
- Remove unwanted watermark regions

## 📁 Project Structure

```
watermark_remover/
├── app.py                  # Flask backend
├── templates/
│   └── index.html         # Main UI
├── static/
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       └── app.js         # Frontend logic
├── uploads/               # Temporary upload storage
├── outputs/               # Processed videos
├── venv/                  # Python virtual environment
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── DEFAULT_VALUES.md     # Default coordinate documentation
├── QUICKSTART.md         # Quick start guide
└── POSITION_ANALYSIS.md  # Watermark position analysis
```

## ⚙️ Configuration

### Supported Video Formats
- MP4 (H.264, H.265)
- MOV (QuickTime)
- AVI
- MKV
- WebM
- FLV
- WMV
- M4V

### Output Settings
- Video Codec: H.264 (libx264)
- Audio: Copy (no re-encoding)
- Preset: Medium (balance of speed and quality)
- Format: Same as input

## 🐛 Troubleshooting

### FFmpeg not found
```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not, install it (see Installation section)
```

### Port 5001 already in use
Change the port in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5002)  # Change to any available port
```

### Video not downloading properly
- Refresh the browser after processing
- Ensure JavaScript is enabled
- Check browser console for errors

### Watermark not fully removed
- Increase the width and height by 10-20 pixels
- Use the live preview to verify coverage
- Try the Blur method instead of Delogo

## 🎓 Tips for Best Results

1. **Use Live Preview** - Always verify watermark coverage before processing
2. **Add Margin** - Make the removal box slightly larger than the watermark
3. **Test Methods** - Try different removal methods to see which works best
4. **Middle Frame** - Preview extracts from middle of video where watermark is stable
5. **Bulk Processing** - Process multiple videos with same settings to save time

## 📈 Performance

- **Processing Speed**: ~1-2x real-time (depends on method and hardware)
- **Concurrent Processing**: Multiple videos processed in parallel
- **Memory Usage**: ~100-200MB per video being processed
- **Disk Space**: 2x video size (original + processed)

## 🔐 Privacy

- All processing happens **locally on your machine**
- No videos are uploaded to external servers
- No data is collected or stored
- Uploaded files can be deleted after processing

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Created for efficient watermark removal from video content.

## 🙏 Acknowledgments

- FFmpeg for video processing capabilities
- Flask for the web framework
- The open-source community

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section
2. Review the documentation files
3. Open an issue on GitHub

---

**⭐ If this project helped you, please give it a star on GitHub! ⭐**

## 🚀 Quick Start for macOS

**Complete setup from scratch:**

```bash
# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install FFmpeg
brew install ffmpeg

# 3. Clone and setup
git clone https://github.com/riddbengkok/watermark_remover.git
cd watermark_remover
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
mkdir -p uploads outputs

# 4. Run the app
python app.py
```

**Open browser and visit:** `http://localhost:5001`

---

**Next time (after setup):**

```bash
cd watermark_remover
source venv/bin/activate
python app.py
```

That's it! 🎉 Start removing watermarks from your videos!
