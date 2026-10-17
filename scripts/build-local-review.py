#!/usr/bin/env python3
"""Build a LOCALHOST-PREVIEW review zip of the Mill from one exact committed SHA (no deploy, no network).
  python3 scripts/build-local-review.py [SHA]      -> /workspace/mill-review-local-<fullsha>.zip
Steps: clean `git worktree add --detach` of SHA -> `git archive` of it into a stage dir -> scripts/mill_stage.py prune
(same hygiene as a deploy) -> mill/build-info.js stamped with the full SHA and 'localhost-preview, not a deployed pin'
-> the _headers CSP injected into every HTML page as <meta http-equiv="Content-Security-Policy"> (frame-ancestors,
report-uri and sandbox dropped: browsers ignore them in a meta tag) -> README.md (from scripts/local-review-README.md
with placeholders filled) -> zip. This script lives in scripts/, which mill_stage drops from every deploy and zip.
"""
import datetime, hashlib, html, json, os, re, shutil, subprocess, sys, tempfile, zipfile
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META_IGNORED = ('frame-ancestors', 'report-uri', 'sandbox')
def git(*a, cwd=REPO): return subprocess.check_output(['git', '-C', cwd] + list(a)).decode().strip()
def csp_rules(headers_path):
    rules, cur = [], None
    for line in open(headers_path):
        if not line.strip() or line.lstrip().startswith('#'): continue
        if not line[0].isspace(): cur = [line.strip(), None]; rules.append(cur)
        else:
            k, v = line.strip().split(':', 1)
            if k.strip().lower() == 'content-security-policy': cur[1] = v.strip()
    return [(p, v) for p, v in rules if v]
def meta_csp(v): return '; '.join(d.strip() for d in v.split(';') if d.strip() and d.strip().split()[0] not in META_IGNORED)
def match(pattern, url):
    rx = '^' + re.escape(pattern).replace('\\*', '.*') + '$'
    return re.match(rx, url) or (pattern.endswith('/*') and url == pattern[:-1])
QA_DIR = os.environ.get('QA_DIR', '/workspace/mill-sprint-2026-10-16/qa')
def qa_status(slugs):
    # Per-piece status ONLY from QA's latest verdict file (qa/<slug>/<pin>/QA-*.md with a "## Verdict" section).
    # No verdict file = not QA'd = NOT READY. A verdict that isn't plainly READY counts as NOT READY.
    rows = ['| Piece | Status (from QA) | QA verdict file | Where QA ran |', '|---|---|---|---|']
    for slug in slugs:
        best = None; d = os.path.join(QA_DIR, slug)
        if os.path.isdir(d):
            for pin in os.listdir(d):
                for fn in os.listdir(os.path.join(d, pin)) if os.path.isdir(os.path.join(d, pin)) else []:
                    fp = os.path.join(d, pin, fn)
                    if fn.startswith('QA-') and fn.endswith('.md') and '## Verdict' in open(fp, encoding='utf-8').read():
                        if not best or os.path.getmtime(fp) > os.path.getmtime(best[0]): best = (fp, pin)
        if not best: rows.append('| %s | **NOT READY** (no QA verdict yet) | none | n/a |' % slug); continue
        txt = open(best[0], encoding='utf-8').read(); v = txt.split('## Verdict', 1)[1].strip().splitlines()
        line = next((l for l in v if l.strip()), '').strip(':').strip()
        ready = re.search(r'\bREADY\b', line) and not re.search(r'NOT READY|FAIL', line)
        where = 'localhost-preview' if best[1].startswith('local') else 'deployed pin ' + best[1]
        rows.append('| %s | **%s** | %s | %s |' % (slug, 'READY' if ready else 'NOT READY', os.path.relpath(best[0], QA_DIR), where))
    return '\n'.join(rows)
def main():
    sha = git('rev-parse', sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
    out = os.environ.get('OUT', '/workspace/mill-review-local-%s.zip' % sha)
    tmp = tempfile.mkdtemp(prefix='mill-review-'); wt = os.path.join(tmp, 'wt'); stage = os.path.join(tmp, 'mill-review-local-' + sha[:12])
    subprocess.check_call(['git', '-C', REPO, 'worktree', 'add', '--detach', wt, sha], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        os.makedirs(stage)
        arc = subprocess.Popen(['git', '-C', wt, 'archive', 'HEAD'], stdout=subprocess.PIPE); subprocess.check_call(['tar', '-x', '-C', stage], stdin=arc.stdout); arc.wait()
        subprocess.check_call([sys.executable, os.path.join(wt, 'scripts', 'mill_stage.py'), 'prune', stage], stdout=subprocess.DEVNULL)
        shipped = subprocess.check_output([sys.executable, os.path.join(wt, 'scripts', 'mill_stage.py'), 'shipped-pieces']).decode().split()
        trees = {s: git('rev-parse', 'HEAD:mill/' + s, cwd=wt) for s in shipped}
        with open(os.path.join(stage, 'mill', 'build-info.js'), 'w') as f:
            f.write('// Written by scripts/build-local-review.py (not in git). localhost-preview, not a deployed pin.\n')
            f.write('window.MILL_BUILD = ' + json.dumps({'commit': sha, 'label': 'localhost-preview, not a deployed pin', 'trees': trees}) + ';\n')
        rules = csp_rules(os.path.join(stage, '_headers')); n = 0
        for root, _, files in os.walk(stage):
            for fn in files:
                if not fn.endswith('.html'): continue
                path = os.path.join(root, fn); url = '/' + os.path.relpath(path, stage).replace(os.sep, '/')
                url_dir = url[:-len('index.html')] if fn == 'index.html' else url
                pol = None
                for pat, v in rules:
                    if match(pat, url) or match(pat, url_dir): pol = v
                if not pol: continue
                s = open(path, encoding='utf-8').read()
                if 'http-equiv="Content-Security-Policy"' in s: continue
                tag = '<meta http-equiv="Content-Security-Policy" content="%s">' % html.escape(meta_csp(pol), quote=True)
                s2, k = re.subn(r'(<meta charset="?[^">]+"?\s*/?>)', r'\1\n' + tag.replace('\\', '\\\\'), s, count=1, flags=re.I)
                if not k: s2, k = re.subn(r'(<head[^>]*>)', r'\1\n' + tag, s, count=1, flags=re.I)
                if k: open(path, 'w', encoding='utf-8').write(s2); n += 1
        tpl = open(os.path.join(wt, 'scripts', 'local-review-README.md'), encoding='utf-8').read()
        readme = tpl.replace('{SHA}', sha).replace('{BUILT}', datetime.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M %Z')).replace('{CSP_PAGES}', str(n)).replace('{PIECES}', ', '.join(shipped))
        readme = readme.replace('{STATUS}', qa_status(shipped))
        fr = os.environ.get('FILE_RESULTS')
        readme = readme.replace('{FILE_RESULTS}', open(fr, encoding='utf-8').read().strip() if fr else 'Not tested for this build. Use the local server.')
        open(os.path.join(stage, 'README.md'), 'w', encoding='utf-8').write(readme)
        if os.path.exists(out): os.remove(out)
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(stage):
                for fn in sorted(files):
                    p = os.path.join(root, fn); z.write(p, os.path.relpath(p, tmp))
        h = hashlib.sha256(open(out, 'rb').read()).hexdigest()
        print('zip', out); print('sha256', h); print('commit', sha); print('csp-meta pages', n); print('pieces', ' '.join(shipped))
    finally:
        subprocess.call(['git', '-C', REPO, 'worktree', 'remove', '--force', wt], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        shutil.rmtree(tmp, ignore_errors=True)
if __name__ == '__main__': main()
