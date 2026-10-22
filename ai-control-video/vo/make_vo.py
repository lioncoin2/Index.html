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
    'part2': [
        "So what is this line, exactly? It isn't one dramatic moment, like in the movies.",
        "Think of AI as climbing a ladder. On the first rung, it's a tool. Like a spell checker, it does one narrow job, only when you ask.",
        "On the second rung, it's an assistant. You ask a question, it answers... and you decide what happens next.",
        "On the third rung, it becomes an agent. You give it a goal, and it plans the steps, uses tools, and acts on its own. Sometimes for hours.",
        "Booking a flight. Fixing a bug. Sending emails. Each step is small... but no human checks every single one.",
        "Now picture two dials. One measures what AI can do. The other measures how well we can steer it.",
        "For years, both dials moved slowly. Lately, the first one has been turning much faster than the second.",
        "It's like a car whose engine keeps getting more powerful... while the steering and the brakes stay the same.",
        "The danger isn't the speed itself. It's speed, without control.",
        "So the line is this: the moment AI becomes capable, autonomous, and hard to look inside, all at the same time. And many researchers think we are getting closer.",
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
