"""Build a portable Pages site from Git-tracked documentation only."""
import argparse
import html
import json
import os
import posixpath
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = 'https://github.com/ddt-mindcraft/mindcraft'
GROUPS = ['발표와 개발 경험', '제품과 아키텍처', 'AI-DLC 개발 과정', 'Windows 실행·검증', '개발 계획', '과거 이력', '첨부 자료']

def category(path):
    if '/legacy/' in path: return '과거 이력'
    if '/presentations/' in path: return '발표와 개발 경험'
    if '/aidlc/' in path: return 'AI-DLC 개발 과정'
    if '/demo-plan/' in path: return '개발 계획'
    if any(x in path.lower() for x in ['windows', '/ddt-handoff/', '/validation/']): return 'Windows 실행·검증'
    return '제품과 아키텍처'

def relative(target, current):
    return quote(posixpath.relpath(target, posixpath.dirname(current) or '.'), safe='/')

def build(output):
    output = output.resolve()
    # Restrict recursive replacement to this dedicated build directory.
    if output != ROOT / '_site': raise ValueError('Output must be the repository _site directory')
    tracked = set(subprocess.check_output(['git', '-C', str(ROOT), 'ls-files', '-z'], encoding='utf-8').split('\0')) - {''}
    selected = sorted(p for p in tracked if p.startswith('docs/') or p.endswith('.md'))
    if output.is_symlink(): raise ValueError('Output cannot be a symlink')
    if output.exists(): shutil.rmtree(output)
    output.mkdir()
    mapping = {p: (p[:-3] + '.html' if p.endswith('.md') else p) for p in selected}
    directory_landing = {}
    for candidate in sorted(tracked):
        path = Path(candidate)
        if path.name.lower() not in {'readme.md', 'index.md', 'index.html'}:
            continue
        directory = path.parent.as_posix()
        directory_landing[directory] = mapping.get(candidate, candidate)
    directory_targets = set()
    texts = {p: (ROOT/p).read_text(encoding='utf-8-sig') for p in selected if p.endswith('.md')}
    rendered = json.loads(subprocess.check_output([os.environ.get('PAGES_NODE', 'node'), str(ROOT/'tools/pages/render.mjs')], input=json.dumps(texts, ensure_ascii=False), encoding='utf-8'))
    unavailable = []
    def rewrite(content, source, destination):
        def replace(match):
            attr, delimiter, value = match.groups()
            value = html.unescape(value)
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path: return match.group(0)
            target = posixpath.normpath(posixpath.join(posixpath.dirname(source), unquote(url.path)))
            if target in mapping:
                result = relative(mapping[target], destination)
                if url.query: result += '?' + url.query
                if url.fragment: result += '#' + quote(unquote(url.fragment), safe='-_.~')
                return f'{attr}={delimiter}{html.escape(result, quote=True)}{delimiter}'
            if target in directory_landing or Path(ROOT / target).is_dir():
                if target not in directory_landing:
                    directory_landing[target] = posixpath.join(target, 'index.html')
                    directory_targets.add(target)
                result = relative(directory_landing[target], destination)
                if url.query: result += '?' + url.query
                if url.fragment: result += '#' + quote(unquote(url.fragment), safe='-_.~')
                return f'{attr}={delimiter}{html.escape(result, quote=True)}{delimiter}'
            if target in tracked:
                return f'{attr}={delimiter}{REPOSITORY}/blob/master/{quote(target, safe="/")}{delimiter}'
            if attr.lower() == 'href':
                unavailable.append({'source': source, 'reference': value})
                return 'class="unavailable-reference" title="저장소에 없는 과거 또는 로컬 참조: ' + html.escape(value, quote=True) + '"'
            return match.group(0)
        return re.sub(r'\b(href|src)\s*=\s*([\"\'])(.*?)\2', replace, content, flags=re.I)
    def shell(title, body, path, source=None, toc=''):
        home = relative('index.html', path)
        css = relative('assets/pages.css', path)
        js = relative('assets/pages.js', path)
        back = f'<a href="{home}">← 전체 문서</a>'
        raw = f'<a href="{relative(source, path)}">Markdown 원문</a>' if source else ''
        historical = '<p class="historical">과거 설계 이력입니다. 현재 제품 기준은 SSOT를 확인하세요.</p>' if '/legacy/' in path else ''
        return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)} · MindCraft</title><link rel="stylesheet" href="{css}"></head><body><header><a class="brand" href="{home}">MindCraft <span>문서</span></a><nav>{back}{raw}<a href="{REPOSITORY}">GitHub ↗</a></nav></header>{historical}<main>{body}</main>{'<aside class="toc"><strong>이 문서에서</strong>'+toc+'</aside>' if toc else ''}<footer>MindCraft · 제품 기준과 개발 이력을 함께 읽는 곳</footer><script src="{js}"></script></body></html>'''
    catalog = []
    for source in selected:
        src = ROOT / source
        if src.is_symlink(): raise ValueError('Documentation cannot contain symlinks: ' + source)
        destination = mapping[source]
        dest = output / destination
        dest.parent.mkdir(parents=True, exist_ok=True)
        if source.endswith('.md'):
            text = texts[source]
            body = rendered[source]['body']
            first = re.search(r'^#\s+(.+)', text, re.M)
            title = first.group(1).strip() if first else src.stem
            body = rewrite(body, source, destination)
            dest.write_text(shell(title, '<article>'+body+'</article>', destination, source, rendered[source]['toc']), encoding='utf-8')
            shutil.copyfile(src, output / source)
            catalog.append({'title': title, 'path': destination, 'source': source, 'group': category(source), 'search': re.sub(r'<[^>]+>', ' ', body)})
        elif source.endswith('.html'):
            text = src.read_text(encoding='utf-8-sig')
            dest.write_text(rewrite(text, source, destination), encoding='utf-8')
            first = re.search(r'<title>(.*?)</title>', text, re.S | re.I)
            catalog.append({'title': html.unescape(first.group(1)) if first else src.stem, 'path': destination, 'source': source, 'group': category(source), 'search': ''})
        else:
            shutil.copyfile(src, dest)
    for directory in sorted(directory_targets):
        destination = directory_landing[directory]
        dest = output / destination
        dest.parent.mkdir(parents=True, exist_ok=True)
        children = []
        prefix = directory.rstrip('/') + '/'
        for item in selected:
            if not item.startswith(prefix):
                continue
            child = item[len(prefix):]
            child_target = mapping[item]
            children.append(f'<li><a href="{html.escape(relative(child_target, destination), quote=True)}">{html.escape(child)}</a></li>')
        body = '<h1>' + html.escape(Path(directory).name or directory) + '</h1><ul>' + ''.join(children) + '</ul>'
        dest.write_text(shell(Path(directory).name or directory, body, destination), encoding='utf-8')
    cards = ''
    for group in GROUPS:
        items = [item for item in catalog if item['group'] == group]
        if not items: continue
        links = ''.join(f'<li data-document data-search="{html.escape((item["title"]+" "+item["source"]+" "+item["search"]).casefold(), quote=True)}"><a href="{quote(item["path"], safe="/")}"><strong>{html.escape(item["title"])}</strong><small>{html.escape(item["source"])}</small></a></li>' for item in items)
        cards += f'<details class="group" {"" if group=="과거 이력" else "open"}><summary>{group} <span>{len(items)}</span></summary><ul>{links}</ul></details>'
    body = f'''<section class="hero"><p class="eyebrow">MINDCRAFT KNOWLEDGE & DEVELOPMENT</p><h1>제품의 기준부터,<br>함께 개발한 기록까지.</h1><p>설계·개발·검증 문서와 해커톤 발표를 한곳에서 탐색하세요.</p><div class="featured"><a href="docs/presentations/agent-orchestration/index.html">해커톤 발표 보기 ↗</a><a href="docs/SSOT.html">현재 제품 기준</a><a href="README.html">MindCraft 시작하기</a></div></section><section class="library"><label for="search">전체 문서 검색</label><input id="search" type="search" placeholder="제목·내용·파일 경로로 검색" autocomplete="off"><p id="result-count" aria-live="polite">{len(catalog)}개 문서</p>{cards}<p id="empty" hidden>검색 결과가 없습니다.</p></section>'''
    (output/'index.html').write_text(shell('문서 허브', body, 'index.html'), encoding='utf-8')
    (output/'assets').mkdir(exist_ok=True)
    for name in ['pages.css', 'pages.js']:
        shutil.copyfile(ROOT/'tools/pages'/name, output/'assets'/name)
    (output/'.nojekyll').touch()
    manifest = {'documents': len(catalog), 'trackedInputs': len(selected), 'sourceCommit': subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],encoding='utf-8').strip(), 'catalog': [{k:v for k,v in item.items() if k!='search'} for item in catalog], 'unavailableReferences': unavailable}
    (output/'site-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'documents':len(catalog),'trackedInputs':len(selected),'historicalOrLocalReferences':len(unavailable)}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT/'_site')
    build(parser.parse_args().output)
