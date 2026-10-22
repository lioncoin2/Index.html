"""Free local English voice-over with Kokoro-82M (Apache-2.0) via kokoro-onnx.
    python3 vo/make_vo.py <model.onnx> <voices.bin> part1   → vo/part1/line-NN.wav + vo/part1/lines.json (durations)
"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = {
    'part1': [
        "Imagine building something smarter than you... and then realising you can't switch it off.",
        "It sounds like science fiction. But some of the people who build today's most advanced AI say this is a risk we have to take seriously.",
        "For most of history, machines did exactly what we told them.",
        "A calculator never surprised anyone. A factory robot repeats the same movement, millions of times.",
        "And if something went wrong, you could open the code, find the broken line, and fix it.",
        "Modern AI is different. Nobody writes its rules, line by line.",
        "Instead, we feed it enormous amounts of data. Text, images and code. And it adjusts billions of internal numbers, until it gets very good at predicting what comes next.",
        "The result works remarkably well. But when we look inside, we mostly see numbers. We grow these systems... and we only partly understand what grows.",
        "And now, these systems are starting to act on their own. Writing code, browsing the web, carrying out tasks for hours.",
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
js = 'window.VO_DUR=' + json.dumps([m['sec'] for m in meta]) + ';window.VO_TXT=' + json.dumps([m['text'] for m in meta]) + ';\n'
open(os.path.join(os.path.dirname(out), '..', 'src', f'vo-{part}.js'), 'w').write(js)
json.dump({'voice': VOICE, 'speed': SPEED, 'sr': sr, 'lines': meta}, open(os.path.join(out, 'lines.json'), 'w'), indent=1)
