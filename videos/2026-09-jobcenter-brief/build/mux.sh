#!/bin/sh
set -e
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
"$FF" -y -hide_banner -loglevel error -i build/video_silent.mp4 -i build/audio.wav \
  -c:v copy -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart \
  out/jobcenter-brief_9x16.mp4
echo "out/jobcenter-brief_9x16.mp4"
