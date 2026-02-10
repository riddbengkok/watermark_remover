#!/bin/bash

# Watermark Remover - Quick Start Script
# This script activates the virtual environment and runs the app

echo "🎬 Starting Watermark Remover..."
echo ""
echo "Activating virtual environment..."
source venv/bin/activate

echo "Starting Flask server..."
echo ""
echo "✅ Server starting on http://localhost:5001"
echo "📱 Open your browser and navigate to: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
