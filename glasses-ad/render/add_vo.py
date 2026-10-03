#!/usr/bin/env python3
"""
Drop a recorded voice-over into the rendered glasses ad, no re-render needed.

    python3 render/add_vo.py recording.m4a              # ad 1, one take starting at 0:00
    python3 render/add_vo.py 01.m4a 02.m4a … 10.m4a     # ad 1, one file per line (vo/script.md)
    python3 render/add_vo.py --ad v2 recording.m4a      # ad 2 (vo/script-v2.md)

→ out/glasses-ad[-v2]-9x16-{60,30}fps-vo.mp4, music ducked under the voice.
"""
import glob, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


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
    ad = ''
    if '--ad' in files:
        k = files.index('--ad')
        ad = files[k + 1]
        del files[k:k + 2]
    if not files:
        sys.exit(__doc__)
    sfx = f'-{ad}' if ad else ''
    single = os.path.join(ROOT, 'out', f'vo{sfx}.wav')
    parts = os.path.join(ROOT, 'vo', f'parts{sfx}')
    for old in [single] + glob.glob(os.path.join(parts, '*.wav')):
        if os.path.exists(old):
            os.remove(old)
    if len(files) == 1:
        to_wav(files[0], single)
    else:
        for i, f in enumerate(files, 1):
            to_wav(f, os.path.join(parts, f'{i:02d}.wav'))
    wav = os.path.join(ROOT, 'out', f'soundtrack{sfx}-vo.wav')
    script = f'soundtrack_{ad}.py' if ad else 'soundtrack_glasses.py'
    subprocess.run([sys.executable, os.path.join(ROOT, 'render', script), os.path.join(ROOT, 'out', f'cues{sfx}.json'), wav], check=True)
    for fps in (60, 30):
        src = os.path.join(ROOT, 'out', f'glasses-ad{sfx}-9x16-{fps}fps.mp4')
        if not os.path.exists(src):
            continue
        dst = src.replace('.mp4', '-vo.mp4')
        subprocess.run([ffmpeg(), '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-i', wav, '-map', '0:v', '-map', '1:a',
                        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', dst], check=True)
        print('→', os.path.relpath(dst, ROOT))


if __name__ == '__main__':
    main()
