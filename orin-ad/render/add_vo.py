#!/usr/bin/env python3
"""
Drop a recorded voice-over into an already-rendered ad — no frame re-render needed.

    python3 render/add_vo.py recording.m4a                 # one continuous take (starts at 0:00)
    python3 render/add_vo.py 01.m4a 02.m4a … 10.m4a        # one file per line, in script order

Any format ffmpeg reads works (m4a/mp3/ogg/wav/opus from a phone). The script
  1. converts the recording(s) to 48 kHz wav (out/vo-v7.wav, or vo/v7/NN.wav per line),
  2. regenerates the soundtrack with the voice on top and the music ducked under it,
  3. remuxes that audio into the rendered videos → out/orin-ad-v7-9x16-{60,30}fps-vo.mp4.
Line timings live in src/v7.js (VO) and in vo/v7-script.md.
"""
import glob
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
AD = 'v7'


def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def to_wav(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run([ffmpeg(), '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '48000', dst], check=True)


def main():
    files = sys.argv[1:]
    if not files:
        sys.exit(__doc__)
    single = os.path.join(ROOT, 'out', f'vo-{AD}.wav')
    parts_dir = os.path.join(ROOT, 'vo', AD)
    for old in [single] + glob.glob(os.path.join(parts_dir, '*.wav')):
        os.remove(old)
    if len(files) == 1:
        to_wav(files[0], single)
    else:
        for i, f in enumerate(files, 1):
            to_wav(f, os.path.join(parts_dir, f'{i:02d}.wav'))
    cues = os.path.join(ROOT, 'out', f'cues-{AD}.json')
    wav = os.path.join(ROOT, 'out', f'soundtrack-{AD}-vo.wav')
    subprocess.run([sys.executable, os.path.join(ROOT, 'render', f'soundtrack_{AD}.py'), cues, wav], check=True)
    for fps in (60, 30):
        src = os.path.join(ROOT, 'out', f'orin-ad-{AD}-9x16-{fps}fps.mp4')
        if not os.path.exists(src):
            continue
        dst = src.replace('.mp4', '-vo.mp4')
        subprocess.run([ffmpeg(), '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-i', wav,
                        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
                        '-movflags', '+faststart', dst], check=True)
        print('→', os.path.relpath(dst, ROOT))


if __name__ == '__main__':
    main()
