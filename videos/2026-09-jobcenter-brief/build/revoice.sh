#!/bin/sh
set -e
python3 build/revoice.py
python3 build/render_video.py
python3 build/audio.py
./build/mux.sh
