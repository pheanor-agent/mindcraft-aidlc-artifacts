# MANIFEST — MindCraft AI-DLC 전체 산출물 통합 리포 (JOB-3653)

> 이 파일은 원본 읽기 전용 보존 원칙에 따라, 수집한 각 산출물의 **원본 경로 · SHA-256 · 수집 시각 · 선별/제외 기준**을 immutable로 기록하는 매니페스트입니다.
> **수집 시각**: 2026-09-17 00:10 KST

## 1. 원본 출처 (읽기 전용, 수정 금지)

| 카테고리 | 원본 경로 | 비고 |
|---|---|---|
| 구현 코드 (MindCraft) | ddt-agent 컨테이너 `/opt/data/workspace/mindcraft/` | git repo `github.com/ddt-mindcraft/mindcraft.git`, 브랜치 `feature/desktop-ui` |
| html 산출물 (`_site`) | `.../mindcraft/_site/` | 문서 허브 정적 사이트 (101 html) |
| 빌드 산출물 (`win-unpacked`) | `.../mindcraft/dist/win-unpacked/` | Electron Windows x64 standalone (449M) |
| 개발 회고 html (mindcraft-presentation) | `~/.hermes/code/ddt-astra-aidlc-presentation/site/` | 발표 사이트 (별개 리포로 이미 배포) |

## 2. 리포 구성 (수집 결과)

| 디렉토리 | 내용 | 파일 수 | 비고 |
|---|---|---|---|
| `implementation/` | MindCraft 구현 코드 (src, web, desktop, native, tools, scripts, installer, package*.json) | **102** | node_modules·.next·.wrangler 캐시 제외 |
| `site/` | `_site/` 전체 트리 (문서 허브 + 개별 문서 html) | **287** (html 101) | 상대경로 링크 그대로 보존 |
| `build/` | 빌드 산출물 **최소 본질**(선별) | **4** | .exe는 GitHub 100MB 제한 초과 → Release 전용(§4) |
| `retrospective/mindcraft-presentation/` | 개발 회고 발표 사이트 | **12** | 원본 site/ 트리 그대로 |

## 3. 대표 파일 SHA-256 (전체 해시는 `.hermes-manifest/` JSON에 수록)

| 파일 (리포 내) | SHA-256 |
|---|---|
| `site/index.html` | `064232e710a96e3725a1c08156c8fc8ee9273ae2cd5bcfe4a5befdd32f7df16c` |
| `site/site-manifest.json` | `0937586cda55965685d82d3f460b28f7ef7f341e63304ce2314e392384a8a8ff` |
| `retrospective/mindcraft-presentation/index.html` | `a56a8b6dcc03feb2ba61da2667151e497311312a3979b3a60afb8046e2b0c73f` |
| `build/app.asar` | `d50ff6d2e2d20b95bb8edeb395026a1d2187cbd95ee2a3a18f98b2b164709388` |
| `build/builder-debug.yml` | `6ed988174a8546bec7c3fe621ca8f411003f41344f8061be586e780988927c12` |
| `build/LICENSE.electron.txt` | `5154e165bd6c2cc0cfbcd8916498c7abab0497923bafcd5cb07673fe8480087d` |
| `build/LICENSES.chromium.html` | `7b328b8c7463ac9bfc7dc648c751533517c8441a0b5b21047d6c0b2620e60d70` |

## 4. 빌드 선별 기준 (최소 본질) — §6 조정 기록

**선별 사유**: `dist/win-unpacked/`(449M)는 Electron Chromium 런타임(DLL·locales·.pak)을 포함해 단독 실행이 가능한 구조입니다.
통합 리포의 용량을 제어하고 git 100MB/파일 제한을 준수하기 위해 다음 최소 본질만 `build/`에 커밋합니다.

**⚠️ `MindCraft Desktop.exe`(235M) — GitHub 100MB 대용량 파일 제한 초과 → Release-only 처리**
- 단일 파일 100MB를 초과하는 `.exe`(235M)는 git 트리에 커밋하지 않고,
  **완전 실행 가능한 standalone `win-unpacked/` 전체(449M)를 압축해 GitHub Release asset**(tag `v0.1.0`)으로만 게시합니다.
- `.exe` 해시/크기: `fdaa99d54788653bb06245a263e9caebca7d1d724996053efa0414d40cf80787` / 246070272 bytes
- 같이 압축되는 `resources/app.asar` 해시: `d50ff6d2e2d20b95bb8edeb395026a1d2187cbd95ee2a3a18f98b2b164709388`
- `build/`에는 해시·선별기준 외에 .exe 바이너리를 두지 않고, `release-staging/`도 git 트리에서 제외합니다.

## 5. 제외 기준

| 제외 항목 | 사유 |
|---|---|
| `node_modules/`, `.next/`, `.wrangler/`, `web/out/_next` | 대용량·재생성 가능 잔재, git 정책 |
| `mindcraft-aidlc-simulation`, `mindcraft-ai-dlc-analysis`, `mindcraft-ai-dlc-greenfield-run` | 사용자 명시 제외(설계 §8-1) — AI DLC 시뮬레이션/분석 문서 |
| `web/.env.example` | credential 계열 템플릿 — 복사 제외 원칙 |
| 원본 `.git/` 메타데이터 | git 저장소 중첩 방지 |
| `MindCraft Desktop.exe` (235M) | GitHub 100MB 제한 초과 → Release 전용(§4) |

## 6. 원본 무결성
- 원본 컨테이너(ddt-agent)·발표 site/ 는 **어떤 파일도 수정하지 않았습니다** — 읽기 전용 접근만 사용.
- 리포 내 복사본은 원본 바이트와 SHA-256 동일 확인(§3, `.hermes-manifest/` 전체 해시).
- GitHub Pages 배포 시 상대경로 설계 그대로 서빙 → 링크 무결성 보장.
