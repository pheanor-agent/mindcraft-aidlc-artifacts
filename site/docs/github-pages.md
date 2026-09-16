# GitHub Pages 문서 배포

이 저장소의 Markdown 문서와 기존 HTML 발표를 하나의 정적 문서 사이트로 만든다. 현재 저장소 공개 설정이나 Pages 설정은 변경하지 않는다.

## 공개할 때 한 번 설정

1. 문서·Pages 구성 브랜치를 기본 브랜치 `master`에 병합한다.
2. 저장소를 공개 전환한 뒤 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택한다.
3. **Settings → Secrets and variables → Actions → Variables**에 `PAGES_ENABLED` 값을 `true`로 등록한다. 비밀값은 필요하지 않다.
4. **Actions → Documentation Pages → Run workflow**를 기본 브랜치에서 실행한다.

이후 기본 브랜치의 문서 변경 시 빌드·검증 후 배포한다. 저장소가 비공개이거나 변수가 활성화되지 않았거나 PR/기능 브랜치 실행이면 배포하지 않는다. 공개 전환 이벤트만으로 즉시 배포되지는 않으므로 최초에는 수동 실행한다. `github-pages` environment의 배포 허용 브랜치는 기본 브랜치로 설정한다.

예상 주소는 `https://ddt-mindcraft.github.io/mindcraft/`다. 현재 운영 중인 공개 주소라는 뜻은 아니다. 배포 성공 시 Actions의 environment URL에서 실제 주소를 확인한다.

GitHub의 [사용자 지정 Pages 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)와 [게시 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)을 따른다.

## 빌드와 로컬 미리보기

저장소 루트에서 Python 3.12 이상과 Node.js 22를 사용한다. 제품 의존성과 별도로 고정 버전의 문서 렌더러를 설치한다.

```sh
npm install --prefix tools/pages --ignore-scripts --no-package-lock
python tools/pages/build.py
python tools/pages/check.py
python -m http.server 8767 --bind 127.0.0.1 --directory _site
```

`http://127.0.0.1:8767/`에서 확인한다. 생성 폴더 `_site/`는 Git에서 제외하며 빌드 때 교체된다. 다른 출력 경로는 실수로 원본을 지우지 않도록 허용하지 않는다.

## 포함되는 자료

- **Git에 등록한 모든 `docs/**`**: Markdown, HTML, 발표용 폰트·이미지, 검증 로그·JSON 등의 첨부 자료.
- **Git에 등록한 다른 위치의 `.md`**: 루트 제품 README·설계·라우팅·환경 문서, 예제 설명 등.
- 실제 제품 코드, 실행 파일, 의존성 폴더, Git 메타데이터, Git에 등록하지 않은 개인 조사 자료는 산출물에 복사하지 않는다.

새 문서는 `git add` 후 빌드해야 포함된다. Git에 추가한 문서는 공개 대상이 되므로 private 원시 대화나 인증 파일을 `docs/`에 추가하지 않는다. 기존 기록의 로컬 경로와 미확인 사항은 역사 자료로 남아 있으므로 공개 전 기록 내용도 검토한다.

## 경로와 읽기 경험

- 사이트 루트 `index.html`: 분류별 전체 문서와 제목·본문·경로 검색.
- Markdown: 원래 경로를 유지하고 `.md` 대신 `.html`로 렌더링. 원문 `.md`도 다운로드용으로 보존.
- 기존 발표 HTML: 레이아웃·인터랙션을 유지하고 Markdown 링크만 사이트의 HTML로 연결.
- 코드 링크: 파일을 배포하지 않고 GitHub의 원본 파일로 연결.
- 상대 경로 사용: `/mindcraft/` 같은 프로젝트 Pages 경로에서도 작동.
- 저장소에 없는 과거 상대 참조: 깨진 링크 대신 밑줄과 설명으로 표시하고 `site-manifest.json`에 목록 기록.
- 과거 `legacy` 문서: 현재 제품 기준과 구분하는 안내 표시.

`site-manifest.json`에는 문서 목록, 입력 파일 수, 원본 커밋과 해결할 수 없었던 과거 참조를 남긴다. `check.py`는 생성한 HTML의 로컬 링크와 첨부 파일 존재 여부, 발표 근거 링크 변환, 배포 폴더 범위를 검사한다. 외부 링크의 로그인·접근 권한이나 모든 Markdown 절 앵커를 검사하는 것은 아니다.

[문서 목록](README.md) · [해커톤 발표](presentations/README.md)
