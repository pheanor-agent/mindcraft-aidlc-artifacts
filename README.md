# MindCraft — 전체 산출물 통합 리포

ddt 에이전트가 AI-DLC 하네스로 개발한 **MindCraft**(LLM 기반 Windows 데스크톱 앱, TUI+Web)의 **전체 산출물** · **html 산출물** · **개발 회고 발표 사이트**를 하나로 총정리한 아카이브 겸 배포 저장소입니다.

## 빠른 진입

| | |
|---|---|
| [**🏠 프로젝트 소개**](https://pheanor-agent.github.io/mindcraft-aidlc-artifacts/about.html) | MindCraft란 · 리포 구성 · 개발/배포 정보 (Pages) |
| [**🎤 개발 회고**](https://pheanor-agent.github.io/mindcraft-aidlc-artifacts/retrospective/mindcraft-presentation/index.html) | 개발 과정 회고 발표 (13장 슬라이드 + 발표 대본) |
| [**📚 문서 허브**](https://pheanor-agent.github.io/mindcraft-aidlc-artifacts/) | 설계·개발·검증 문서 101개 검색·탐색 (Pages) |
| [**⬇️ Windows 실행 파일**](https://github.com/pheanor-agent/mindcraft-aidlc-artifacts/releases) | standalone `win-unpacked` (449M) — Release v0.1.0 |

> ⚠️ 이 리포는 기존 발표 리포 [`pheanor-agent/mindcraft-presentation`](https://github.com/pheanor-agent/mindcraft-presentation)과 **별개**입니다. 발표 전용 사이트는 그대로 유지되며, 여기서는 MindCraft **전체 산출물 아카이브**를 다룹니다.

## 구성

```
mindcraft-aidlc-artifacts/
├── implementation/           # ① MindCraft 구현 코드 (src·web·desktop·native·tools·scripts·installer)
├── build/                    # ② 빌드 산출물 최소 본질 (app.asar, LICENSES, builder-debug.yml)
├── site/                     # ③ 관련 html 산출물 (문서 허브 + 101 html) + about.html(프로젝트 소개)
├── retrospective/            # ④ 개발 과정 회고 발표 사이트 (mindcraft-presentation)
├── MANIFEST.md               # 원본 경로·SHA-256·수집 시각·선별/제외 기준 (immutable)
├── .hermes-manifest/         # 개별 파일 전체 SHA-256 JSON
└── README.md
```

| 카테고리 | 디렉토리 | 내용 | 비고 |
|---|---|---|---|
| ① 구현 코드 | `implementation/` | src(39), web(29), desktop(3), native(2), tools(19), scripts(6), installer(1) + package.json/lock | node_modules·캐시 제외 |
| ② 빌드 산출물 | `build/` | `app.asar`(81M)·LICENSES·`builder-debug.yml` | `.exe`(235M)는 GitHub 100MB 제한 초과 → **Release 전용** |
| ③ html 산출물 | `site/` | 문서 허브 `_site/` 전체 (287 files / 101 html) + `about.html` | GitHub Pages 서빙 대상 |
| ④ 개발 회고 | `retrospective/mindcraft-presentation/` | 발표 사이트 (index.html, speaker-script.html, slides.*, assets/) | 원본 site/ 그대로 |

## 원본 출처 · 무결성 (읽기 전용)

- **MindCraft 구현·빌드·html**: ddt-agent 컨테이너 `/opt/data/workspace/mindcraft/` — git `github.com/ddt-mindcraft/mindcraft.git` (브랜치 `feature/desktop-ui`)
- **개발 회고 html**: `ddt-astra-aidlc-presentation/site/` — 라이브 https://pheanor-agent.github.io/mindcraft-presentation/

원본은 **어떤 파일도 수정하지 않았습니다.** 리포 내 복사본의 동일성은 `MANIFEST.md`와 `.hermes-manifest/`의 SHA-256으로 증명합니다.

## 빌드 산출물 처리

- 단독 실행 가능한 Windows standalone(`dist/win-unpacked/` 전체, 449M, `.exe` 235M 포함)은 GitHub 100MB/파일 제한 때문에 **git 트리에 커밋하지 않고 [GitHub Release asset](https://github.com/pheanor-agent/mindcraft-aidlc-artifacts/releases)(`v0.1.0`)** 으로만 게시합니다.
- `build/`에는 다시 빌드할 때 참고할 해시·선별 기준과 100MB 미만 본질만 포함합니다.

## GitHub Pages

`site/` 디렉토리가 GitHub Pages로 서빙됩니다 (`/mindcraft-aidlc-artifacts/`):

- **루트** `…/mindcraft-aidlc-artifacts/` — 문서 허브 (프로젝트 소개·개발 회고 진입 카드 포함)
- **프로젝트 소개** `…/about.html`
- **개발 회고** `…/retrospective/mindcraft-presentation/`

상대경로 설계 그대로라 문서 링크가 그대로 동작하며, `retrospective/`는 서브경로로 제공됩니다.

## 제외 사항

- **AI DLC 시뮬레이션·분석 문서** (`mindcraft-aidlc-simulation`, `mindcraft-ai-dlc-analysis`) — 사용자 명시 제외
- node_modules/.next/.wrangler 등 재생성 가능 캐시, credential 계열 템플릿(`.env.example`)
- 원본 `.git/` 메타데이터

상세 선별/제외 근거는 [`MANIFEST.md`](MANIFEST.md) 참조.
