/**
 * Bootpay WebView 환경 모드 (development | stage | production).
 * SDK 내부 컴포넌트(Bootpay / BootpayWidget / BootpayCommerce)가 공유한다.
 */

export type BootpayEnvironmentMode = 'development' | 'stage' | 'production';

/**
 * 기본값은 항상 'production'. 배포 시 절대 변경하지 말 것.
 * 로컬 테스트는 `setEnvironmentMode('development')` 등을 런타임에 호출.
 */
let _environmentMode: BootpayEnvironmentMode = 'production';

/**
 * WebView 결제 환경을 설정합니다. 기본값은 production.
 * @param mode "development" | "stage" | "production" (그 외 값은 production 으로 fallback)
 */
export const setEnvironmentMode = (mode: string): void => {
  if (mode === 'development' || mode === 'stage' || mode === 'production') {
    _environmentMode = mode;
  } else {
    _environmentMode = 'production';
  }
};

export const getEnvironmentMode = (): BootpayEnvironmentMode => _environmentMode;

/**
 * SDK 내부 스크립트 빌더용 헬퍼.
 * `bridge` 는 'Bootpay' | 'BootpayWidget' | 'BootpayCommerce' 등 WebView 측 SDK 객체 이름.
 * DEBUG 빌드일 때 production 인 경우 development 로 자동 fallback (legacy 호환).
 * production 이면 빈 문자열을 반환해 불필요한 스크립트 주입을 피한다.
 */
export const buildEnvironmentScript = (bridge: string, debug: boolean): string => {
  const overridden = _environmentMode !== 'production';
  if (!debug && !overridden) return '';
  const mode = debug && !overridden ? 'development' : _environmentMode;
  return `${bridge}.setEnvironmentMode('${mode}');`;
};
