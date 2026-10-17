#!/usr/bin/env python3
# Record an ENGINEER SELF-CHECK in mill/hub.json against the exact piece files tested (HEAD commit + git tree id of mill/<slug>).
# usage: scripts/record-selfcheck.py <piece-id> <pin-short-id> "<result text>"
import json, os, subprocess, sys
repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); pid, pin, result = sys.argv[1:4]
p = os.path.join(repo, 'mill', 'hub.json'); d = json.load(open(p))
g = lambda *a: subprocess.check_output(['git', '-C', repo] + list(a)).decode().strip()
for r in d['pieces']:
    if r['id'] == pid:
        slug = r['path'].rstrip('/'); r['engineer'] = {'pin': pin, 'commit': g('rev-parse', 'HEAD'), 'tree': g('rev-parse', 'HEAD:mill/' + slug), 'result': result}
        break
else: sys.exit('no piece ' + pid)
json.dump(d, open(p, 'w'), indent=1, ensure_ascii=False); open(p, 'a').write('\n')
subprocess.check_call([sys.executable, os.path.join(repo, 'mill', 'build-hub.py')])
