from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import subprocess
import uuid
import threading
import json
from datetime import datetime

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

# Ensure folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Store processing status
processing_status = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def remove_watermarks(input_path, output_path, task_id, watermarks, method='delogo'):
    """Remove multiple watermarks from video using FFmpeg"""
    try:
        processing_status[task_id]['status'] = 'processing'
        processing_status[task_id]['progress'] = 10
        
        # Build filter chain for multiple watermarks
        if method == 'delogo':
            # Chain multiple delogo filters
            filter_chain = ','.join([
                f"delogo=x={wm['x']}:y={wm['y']}:w={wm['width']}:h={wm['height']}"
                for wm in watermarks if wm.get('enabled', True)
            ])
        elif method == 'cover':  # Use drawbox for cover method
            filter_chain = ','.join([
                f"drawbox=x={wm['x']}:y={wm['y']}:w={wm['width']}:h={wm['height']}:color=black:t=fill"
                for wm in watermarks if wm.get('enabled', True)
            ])
        else:  # blur - create actual blur effect
            # For multiple watermarks, we need to apply blur to each region
            # We'll use a complex filter to crop, blur, and overlay each region
            enabled_watermarks = [wm for wm in watermarks if wm.get('enabled', True)]
            
            if len(enabled_watermarks) == 1:
                # Simple case: one watermark
                wm = enabled_watermarks[0]
                # Crop the region, blur it heavily, then overlay it back
                filter_chain = (
                    f"[0:v]split[base][blur];"
                    f"[blur]crop={wm['width']}:{wm['height']}:{wm['x']}:{wm['y']},"
                    f"boxblur=15:5[blurred];"  # Changed from 20 to 15 (max is 18)
                    f"[base][blurred]overlay={wm['x']}:{wm['y']}"
                )
            else:
                # Multiple watermarks - apply blur sequentially
                # Start with the base video
                filter_parts = ["[0:v]split=" + str(len(enabled_watermarks) + 1)]
                
                # Create labels for each split output
                labels = ["base"] + [f"blur{i}" for i in range(len(enabled_watermarks))]
                filter_parts[0] += "[" + "][".join(labels) + "]"
                
                # For each watermark, crop and blur
                for i, wm in enumerate(enabled_watermarks):
                    filter_parts.append(
                        f"[blur{i}]crop={wm['width']}:{wm['height']}:{wm['x']}:{wm['y']},"
                        f"boxblur=15:5[blurred{i}]"  # Changed from 20 to 15 (max is 18)
                    )
                
                # Overlay each blurred region back onto the video
                current_label = "base"
                for i, wm in enumerate(enabled_watermarks):
                    if i == len(enabled_watermarks) - 1:
                        # Last overlay doesn't need a label
                        filter_parts.append(
                            f"[{current_label}][blurred{i}]overlay={wm['x']}:{wm['y']}"
                        )
                    else:
                        filter_parts.append(
                            f"[{current_label}][blurred{i}]overlay={wm['x']}:{wm['y']}[overlay{i}]"
                        )
                        current_label = f"overlay{i}"
                
                filter_chain = ";".join(filter_parts)
        
        # Ensure we have a valid filter
        if not filter_chain or filter_chain.strip() == '':
            raise Exception("No watermarks enabled or invalid filter configuration")
        
        # Build FFmpeg command
        if method == 'blur':
            # Complex filtergraph for blur
            cmd = [
                'ffmpeg',
                '-i', input_path,
                '-filter_complex', filter_chain,
                '-c:a', 'copy',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-y',
                output_path
            ]
        else:
            # Simple filter for delogo and cover
            cmd = [
                'ffmpeg',
                '-i', input_path,
                '-vf', filter_chain,
                '-c:a', 'copy',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-y',
                output_path
            ]
        
        processing_status[task_id]['progress'] = 30
        processing_status[task_id]['ffmpeg_cmd'] = ' '.join(cmd)  # Store command for debugging
        
        # Execute FFmpeg command
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Capture all stderr output for error logging
        stderr_output = []
        
        # Monitor progress
        for line in process.stderr:
            stderr_output.append(line)
            if 'time=' in line:
                processing_status[task_id]['progress'] = 60
        
        process.wait()
        
        if process.returncode == 0:
            processing_status[task_id]['status'] = 'completed'
            processing_status[task_id]['progress'] = 100
            processing_status[task_id]['output_file'] = output_path
        else:
            # Capture the full error output
            error_msg = '\n'.join(stderr_output[-20:])  # Last 20 lines
            processing_status[task_id]['status'] = 'failed'
            processing_status[task_id]['error'] = f'FFmpeg error (code {process.returncode})'
            processing_status[task_id]['error_detail'] = error_msg
            print(f"FFmpeg Error for task {task_id}:")
            print(error_msg)
            
    except Exception as e:
        processing_status[task_id]['status'] = 'failed'
        processing_status[task_id]['error'] = str(e)
        print(f"Exception in remove_watermarks for task {task_id}: {e}")


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'videos' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400
    
    files = request.files.getlist('videos')
    
    if not files or files[0].filename == '':
        return jsonify({'error': 'No files selected'}), 400
    
    # Get watermark regions from request
    watermarks_json = request.form.get('watermarks', '[]')
    watermarks = json.loads(watermarks_json)
    method = request.form.get('method', 'delogo')
    
    task_ids = []
    
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            task_id = str(uuid.uuid4())
            
            # Save uploaded file
            input_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{task_id}_{filename}")
            file.save(input_path)
            
            # Prepare output path
            output_filename = f"removed_{filename}"
            output_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{task_id}_{output_filename}")
            
            # Initialize status
            processing_status[task_id] = {
                'status': 'queued',
                'progress': 0,
                'filename': filename,
                'created_at': datetime.now().isoformat()
            }
            
            # Start processing in background thread
            thread = threading.Thread(
                target=remove_watermarks,
                args=(input_path, output_path, task_id, watermarks, method)
            )
            thread.start()
            
            task_ids.append({
                'task_id': task_id,
                'filename': filename
            })
    
    return jsonify({
        'tasks': task_ids,
        'message': f'{len(task_ids)} video(s) processing started'
    }), 200

@app.route('/status/<task_id>')
def get_status(task_id):
    if task_id in processing_status:
        return jsonify(processing_status[task_id])
    return jsonify({'error': 'Task not found'}), 404

@app.route('/download/<task_id>')
def download_file(task_id):
    if task_id in processing_status and processing_status[task_id]['status'] == 'completed':
        output_file = processing_status[task_id]['output_file']
        if os.path.exists(output_file):
            # Check if it's a download request or preview request
            download = request.args.get('download', 'false').lower() == 'true'
            
            # Get original filename and extension
            original_filename = processing_status[task_id]['filename']
            name, ext = os.path.splitext(original_filename)
            
            # Ensure extension exists
            if not ext:
                ext = '.mp4'  # Default to mp4 if no extension
            
            download_filename = f"{name}_watermark_removed{ext}"
            
            # Map common video extensions to proper mimetypes
            mimetype_map = {
                '.mp4': 'video/mp4',
                '.mov': 'video/quicktime',
                '.avi': 'video/x-msvideo',
                '.mkv': 'video/x-matroska',
                '.webm': 'video/webm',
                '.flv': 'video/x-flv',
                '.wmv': 'video/x-ms-wmv',
                '.m4v': 'video/x-m4v'
            }
            
            # Get proper mimetype
            mimetype = mimetype_map.get(ext.lower(), 'video/mp4')
            
            if download:
                # Force download with correct extension
                response = send_file(
                    output_file,
                    as_attachment=True,
                    download_name=download_filename,
                    mimetype=mimetype
                )
                # Explicitly set Content-Disposition header
                response.headers['Content-Disposition'] = f'attachment; filename="{download_filename}"'
                return response
            else:
                # Stream for preview (inline)
                return send_file(
                    output_file,
                    mimetype=mimetype,
                    as_attachment=False
                )
    return jsonify({'error': 'File not found'}), 404

@app.route('/list-jobs')
def list_jobs():
    return jsonify(processing_status)

@app.route('/preview-frame', methods=['POST'])
def preview_frame():
    """Extract a frame from uploaded video for preview"""
    if 'video' not in request.files:
        return jsonify({'error': 'No video uploaded'}), 400
    
    file = request.files['video']
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        preview_id = str(uuid.uuid4())
        
        # Save to temporary location
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"preview_{preview_id}_{filename}")
        file.save(temp_path)
        
        # Extract frame at middle of video
        frame_path = os.path.join(app.config['UPLOAD_FOLDER'], f"frame_{preview_id}.jpg")
        
        try:
            # First, get the video duration
            duration_cmd = [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                temp_path
            ]
            
            duration_result = subprocess.run(duration_cmd, capture_output=True, text=True, timeout=10)
            
            # Calculate middle timestamp
            try:
                duration = float(duration_result.stdout.strip())
                middle_timestamp = duration / 2
            except:
                # Fallback to 3 seconds if duration detection fails
                middle_timestamp = 3
            
            # Extract frame at middle timestamp
            cmd = [
                'ffmpeg',
                '-ss', str(middle_timestamp),
                '-i', temp_path,
                '-vframes', '1',
                '-q:v', '2',
                '-y',
                frame_path
            ]
            
            subprocess.run(cmd, capture_output=True, timeout=10)
            
            if os.path.exists(frame_path):
                # Return the frame path for the client
                return jsonify({
                    'preview_id': preview_id,
                    'frame_url': f'/preview-image/{preview_id}',
                    'timestamp': middle_timestamp
                })
            else:
                return jsonify({'error': 'Frame extraction failed'}), 500
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file'}), 400

@app.route('/preview-image/<preview_id>')
def serve_preview_image(preview_id):
    """Serve the extracted preview frame"""
    frame_path = os.path.join(app.config['UPLOAD_FOLDER'], f"frame_{preview_id}.jpg")
    
    if os.path.exists(frame_path):
        return send_file(frame_path, mimetype='image/jpeg')
    
    return jsonify({'error': 'Frame not found'}), 404


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
