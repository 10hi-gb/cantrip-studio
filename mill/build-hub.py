#!/usr/bin/env python3
# Regenerate mill/hub-data.js from mill/hub.json (the single source of truth). No fetch at runtime: CSP connect-src 'none'.
import json, os
d = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(d, 'hub.json')))
open(os.path.join(d, 'hub-data.js'), 'w').write('// GENERATED from hub.json by build-hub.py. Do not edit.\nwindow.MILL_HUB = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
