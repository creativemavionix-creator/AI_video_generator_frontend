#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Download and unpack static Linux FFmpeg binary if not already present
if [ ! -f ./bin/ffmpeg ]; then
  echo "Downloading static FFmpeg binary..."
  mkdir -p bin
  curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar -xJ --strip-components=1 -C bin/
fi

# 3. Add local bin folder to system PATH so Python finds 'ffmpeg'
export PATH="$(pwd)/bin:$PATH"
