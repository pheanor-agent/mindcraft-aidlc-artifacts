"""Validate generated local URLs, assets, publication scope and slide links."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2] / '_site'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('href', 'src') and value: self.links.append(value)

def check():
    errors = []
    pages = list(ROOT.rglob('*.html'))
    for page in pages:
        parser = Links()
        parser.feed(page.read_text(encoding='utf-8'))
        for link in parser.links:
            url = urlsplit(link)
            if url.scheme or url.netloc or not url.path: continue
            target = (page.parent / unquote(url.path)).resolve()
            if not target.is_relative_to(ROOT) or not target.exists():
                errors.append(f'{page.relative_to(ROOT)}: {link}')
    manifest = json.loads((ROOT/'site-manifest.json').read_text(encoding='utf-8'))
    for item in manifest['catalog']:
        if not (ROOT/item['path']).is_file(): errors.append(item['path'])
    for forbidden in ['.git', 'src', 'node_modules', '.env', 'tools']:
        if (ROOT/forbidden).exists(): errors.append('Unexpected publication: '+forbidden)
    slides = (ROOT/'docs/presentations/agent-orchestration/index.html').read_text(encoding='utf-8')
    if 'evidence.html#s1' not in slides: errors.append('Presentation Markdown links not converted')
    directory_links = {
        'README.html': 'docs/legacy/2026-09-03-pre-dual-model-routing/README.html',
        'docs/windows-runtime-improvements-2026-09-08.html': 'validation/2026-09-08-runtime-fixes/index.html',
        'docs/windows-runtime-stability-2026-09-07.html': 'validation/2026-09-07-windows/runtime-stability/index.html',
        'docs/windows-tui-validation-2026-09-07.html': 'ddt-handoff/windows-tui-20260907/README.html',
        'docs/windows-validation-2026-09-07.html': 'validation/2026-09-07-windows/README.html',
    }
    for page_name, expected_target in directory_links.items():
        page = ROOT / page_name
        if not page.is_file():
            errors.append(f'Missing directory-link fixture page: {page_name}')
            continue
        parser = Links()
        parser.feed(page.read_text(encoding='utf-8'))
        if not any(urlsplit(link).path == expected_target for link in parser.links):
            errors.append(f'Directory link was not preserved: {page_name} -> {expected_target}')
    if errors: raise SystemExit('\n'.join(errors))
    print(f'PASS: {len(pages)} HTML pages; all local href/src targets exist; publication scope and directory links checked.')

if __name__ == '__main__': check()
