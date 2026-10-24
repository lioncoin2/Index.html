#!/usr/bin/env python3
"""Soundtrack for the Hairline morph film: a quiet airy pad, whooshes when the kit comes apart and goes back
together, a soft settle, a mechanical lock when the helicopter is complete, and a tick per caption."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, '..', '..', 'orin-ad', 'render')))
from soundtrack import SR, Mix, master, midi, pad, thump, tick, bell  # noqa: E402
from soundtrack_v5 import whoosh, riser  # noqa: E402
from soundtrack_v6 import blip  # noqa: E402
import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402


def build(cues, dur):
    mix = Mix(dur)
    add = mix.add
    for t0, t1, notes in [(0, 4.6, [50, 57, 62, 66]), (4.6, 11.1, [47, 54, 59, 62, 66]), (11.1, dur, [52, 59, 64, 68, 71])]:
        add('music', pad(notes, t1 - t0, cutoff=1300, attack=1.4, release=1.6, cents=9), t0, 0.13)
    for cu in cues:
        t, ty = cu['t'], cu['type']
        if ty == 'whoosh':
            add('sfx', whoosh(1.2, 300, 6000, q=0.7), t, 0.22); add('sfx', riser(1.0, 400, 4000), t, 0.06)
        elif ty == 'settle':
            add('drums', thump(70, 0.4, 0.12), t, 0.3)
        elif ty == 'lock':
            add('drums', thump(60, 0.35, 0.08), t, 0.45); add('sfx', blip(1200, 0.06, 0.02), t + 0.05, 0.12)
            for k, m in enumerate([76, 83, 88]): add('verb', bell(midi(m), 1.8, bright=0.5), t + 0.1 + k * 0.07, 0.06)
        elif ty == 'pop':
            add('sfx', blip(900, 0.05, 0.02), t, 0.08)
        elif ty == 'cap':
            add('sfx', tick(True), t, 0.06)
    mix.bus('verb')
    return mix, np.ones(mix.n)


meta = json.load(open(sys.argv[1], encoding='utf-8'))
mix, duck = build(meta['cues'], meta['duration'])
x = master(mix, duck)
wavfile.write(sys.argv[2], SR, (x.T * 32767).astype(np.int16))
print('soundtrack →', sys.argv[2])
