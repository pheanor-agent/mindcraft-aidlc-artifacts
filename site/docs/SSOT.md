# MindCraft SSOT 안내

## 역할

이 문서는 제품 문서가 같은 사실을 서로 다르게 소유하지 않도록 권위와 참조 규칙을 정의한다. 새로운 SSOT 서비스나 별도 상태 저장소를 만들지 않는다.

## 권위 순서

1. `ROUTING.md`: 현재 Model 수, purpose mapping, Episode 시작 시 1회 선택, fallback 정책
2. `README.md`: 사용자-facing 제품 범위와 실행 계약
3. `DESIGN.md`: 구현 구조·상태·안전 경계
4. `docs/MINDCRAFT-PRODUCT-METADATA.md`: 승인된 제품 결정
5. `src/**`, `test/**`: 특정 리비전에서 확인된 실제 동작과 검증 증거

작업 요청·설계·리뷰·승인·검증 자료는 `/opt/data/workspace/jobs/**`에 있으며 제품 요구사항의 권위가 아니다. 과거 자료는 `docs/legacy/**`에 보존하며 현재 요구사항으로 자동 승격하지 않는다.

## 사실별 ownership

전역 문서 권위 순서는 정책 문서를 읽는 기준이고, 실제 관측 사실은 별도의 원본을 가진다. 새 SSOT 서비스나 별도 상태 저장소를 만들지 않는다.

| 사실 | authoritative owner | 파생/표시 |
|---|---|---|
| 제품 범위·사용 목적 | 승인된 product policy 문서 | README 요약 |
| Model 수/purpose/fallback | `ROUTING.md` | setup/help/UI |
| 현재 workspace 설정 | `.mindcraft/config.json` | resolved config/display |
| effective config | 설정과 명시적 override의 deterministic 해석 결과 | doctor/preflight/provider |
| 특정 Run의 실제 Model/provider/mode | Run-start snapshot in state journal | history/status |
| Task/Episode/Run lifecycle | state journal | memory/TUI |
| approval/effect lifecycle | state journal | approval UI/audit |
| Knowledge 상태·revision | Knowledge journal | search/index/UI |
| 실제 workspace artifact | workspace file | digest/reference |
| 특정 Run Context | RunContextManifest | preview/context inspector |
| Pi 실행 상세 | Pi session/transcript 원본 | MindCraft history reference |
| provider 지원 여부 | provider registry/source + tests | README/provider help |
| release artifact 구성 | release manifest + artifact hash | README/release 안내 |
| 실행 검증 결과 | `docs/validation/**` + revision/environment/command | README 링크 |

정책 문서는 관측된 runtime 사실을 대신하지 않고, validation report는 제품 정책을 자동 변경하지 않는다. bundle과 발표 자료도 SSOT가 아니다.

## 현재와 제안의 구분

- 문서가 승인됐다는 사실은 구현 완료를 의미하지 않는다.
- source에 구현됐다는 사실은 기존 요구사항이 폐기됐다는 의미가 아니다.
- Token Switching과 verification feedback routing은 현재 기능이 아니라 후속 제안이다.
- 현재 routing은 Episode 시작 시 purpose를 확인해 Model을 한 번 선택한다.

## Knowledge 경계

제품 Knowledge는 제품 runtime의 `captured/promoted/rejected` lifecycle과 provenance/redaction 정책을 따른다. 개발 process 자료·과거 기록·미승인 제안은 실행 context에 자동 포함하지 않는다. DDT 공통 Knowledge와 제품 Knowledge를 통합하지 않는다.

## 변경 게이트

문서나 코드에 새 주장을 추가할 때는 제품 범위, 현재/후속 상태, source·config·test 근거, 승인 범위를 함께 확인한다. 충돌은 임의 삭제 대신 `미구현`, `불일치`, `미확인`, `historical` 중 근거에 맞는 상태로 기록한다.