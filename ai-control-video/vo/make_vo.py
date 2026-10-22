"""Free local English voice-over with Kokoro-82M (Apache-2.0) via kokoro-onnx.
    python3 vo/make_vo.py <model.onnx> <voices.bin> part1   → vo/part1/line-NN.wav + vo/part1/lines.json (durations)
"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = {
    'part1': [
        "Imagine building something smarter than you... and then realising you can't switch it off.",
        "For most of history, machines did exactly what we told them. A calculator never surprised anyone.",
        "Modern AI is different. Nobody writes its rules. We grow it from data... and we only partly understand what grows.",
        "So, did we cross a line? And if we did... what now?",
    ],
}
VOICE, SPEED = 'am_onyx', 0.92

model, voices, part = sys.argv[1:4]
k = Kokoro(model, voices)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), part)
os.makedirs(out, exist_ok=True)
meta = []
for i, text in enumerate(LINES[part]):
    samples, sr = k.create(text, voice=VOICE, speed=SPEED, lang='en-us')
    path = os.path.join(out, f'line-{i:02d}.wav')
    sf.write(path, samples, sr)
    meta.append({'i': i, 'text': text, 'sec': round(len(samples) / sr, 3), 'file': os.path.basename(path)})
    print(f'{i}: {len(samples)/sr:.2f}s  {text[:50]}')
json.dump({'voice': VOICE, 'speed': SPEED, 'sr': sr, 'lines': meta}, open(os.path.join(out, 'lines.json'), 'w'), indent=1)
