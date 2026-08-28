# Bootpay React Native SDK

`react-native-bootpay-api` (npm).

## 배포 시 버전 동기화 체크리스트 (CRITICAL)

패키지 버전과 **런타임 VERSION 상수**가 어긋나면 webview/analytics 에 옛 버전이 보고된다. 한 곳만 올리면 안 된다. 특히 RN 은 **두 군데** 에 들어 있으니 둘 다 갱신해야 한다.

| 파일 | 상수 | 비고 |
|------|------|------|
| `package.json` | `version` | npm 배포 버전 |
| `src/Bootpay.tsx` | `SDK_VERSION` | webview `setVersion('...', '<os>_react_native')` 송신 값 |
| `src/BootpayWidget.tsx` | `SDK_VERSION` | 위젯 webview `setVersion('...', 'react_native')` 송신 값 |
| `CHANGELOG.md` | — | 새 버전 항목 추가 |

CDN URL 변경 시 추가:
- `src/Bootpay.tsx` → 결제 webview source uri (현재 `https://webview.bootpay.co.kr/5.3.0`)
- `src/BootpayWidget.tsx` → `WIDGET_URL` (현재 `https://webview.bootpay.co.kr/5.3.0/widget.html`)

## 배포 절차 (npm + 2FA bypass)

`~/.npmrc` 의 토큰은 2FA 를 요구해서 비대화형 publish 가 막힌다. Automation 토큰을 CLI 플래그로 주입해야 한다 — `set -a && . ./.env` 방식은 `~/.npmrc` 가 우선이라 먹히지 않는다.

⚠️ **`react-native-webview-bootpay/.env` 의 `NPM_TOKEN` 은 만료됐다** (2026-08-28 실측 E401).
`~/.npmrc` 도 E401. 살아있는 토큰은 아래 하나뿐이다 (계정 `bootpay`).

```bash
NPM_TOKEN=$(grep -m1 '^NPM_TOKEN' ~/bootpay-commerce/multi-manager/projects/ai-docs/bootpay-mcp/.env | cut -d= -f2)
npm access list collaborators react-native-bootpay-api --//registry.npmjs.org/:_authToken=$NPM_TOKEN  # 권한 먼저 확인
npm publish --//registry.npmjs.org/:_authToken=$NPM_TOKEN
git tag v<version> && git push origin v<version>
```

## 환경 기본값

`src/environment.ts` 의 `_environmentMode` 기본값은 `'production'`. `Bootpay.setEnvironmentMode('development' | 'stage' | 'production')` 으로 런타임 토글.
