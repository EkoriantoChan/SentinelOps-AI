import glob
import re

for f in sorted(glob.glob('workflows/*.json')):
    lines = open(f, encoding='utf-8').read().splitlines()
    for idx, line in enumerate(lines):
        if re.search(r"\$\(['\"][^'\"]+['\"]\)\.item", line):
            print(f"{f}:{idx+1} -> {line.strip()}")
