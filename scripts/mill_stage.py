#!/usr/bin/env python3
"""Decide which committed files ship in a Mill review deploy (deploy hygiene, QA 83a2ebcd).
Dropped: build scripts and tooling (*.py, *.sh, scripts/, tests/), repo meta (README.md, .gitignore),
nested _headers files, the hub build input mill/hub.json, and any mill/<slug>/ piece the hub does not link (path null).
  mill_stage.py prune <stage_dir>   delete dropped files from a staged tree; prints what was dropped
  mill_stage.py classify            read repo paths on stdin; print "keep<TAB>path" or "drop<TAB>path"
"""
import json, os, subprocess, sys
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def linked():
    hub = json.loads(subprocess.check_output(['git', '-C', REPO, 'show', 'HEAD:mill/hub.json']))
    items = hub['pieces'] if isinstance(hub, dict) else hub
    return {p['path'].strip('/') for p in items if p.get('path')}
def piece_dirs():
    out = subprocess.check_output(['git', '-C', REPO, 'ls-tree', '-d', '--name-only', 'HEAD', 'mill/']).decode().split()
    return {d.split('/', 1)[1] for d in out if subprocess.run(['git', '-C', REPO, 'cat-file', '-e', 'HEAD:' + d + '/index.html'], capture_output=True).returncode == 0}
def dropped(path, live, pieces):
    base = os.path.basename(path)
    if path.startswith(('scripts/', 'tests/')): return True
    if path in ('README.md', '.gitignore', 'mill/hub.json'): return True
    if base.endswith(('.py', '.sh', '.pyc', '.md')): return True
    if base == '_headers' and path != '_headers': return True
    parts = path.split('/')
    if len(parts) > 2 and parts[0] == 'mill' and parts[1] in pieces and parts[1] not in live: return True
    return False
def main():
    live, pieces = linked(), piece_dirs()
    if sys.argv[1] == 'prune':
        stage = sys.argv[2]; n = 0
        for root, _, files in os.walk(stage):
            for f in files:
                rel = os.path.relpath(os.path.join(root, f), stage)
                if dropped(rel, live, pieces): os.remove(os.path.join(root, f)); n += 1; print('dropped', rel)
        for root, dirs, files in sorted(os.walk(stage), key=lambda x: -len(x[0])):
            if root != stage and not os.listdir(root): os.rmdir(root)
        print('dropped %d files; unlinked pieces not shipped: %s' % (n, ', '.join(sorted(pieces - live)) or 'none'))
    elif sys.argv[1] == 'classify':
        for line in sys.stdin:
            p = line.strip()
            if p: print(('drop' if dropped(p, live, pieces) else 'keep') + '\t' + p)
    elif sys.argv[1] == 'shipped-pieces':
        print(' '.join(sorted(pieces & live)))
if __name__ == '__main__': main()
