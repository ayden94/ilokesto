/**
 * Showable 패턴을 처리하는 공통 함수
 *
 * Forrable과 동일한 패턴:
 * - Showable을 찾아서 when 값을 기반으로 조건부 렌더링
 * - 다른 children은 그대로 유지
 * - Showable 위치에 렌더링 결과 삽입
 */
export declare function processShowable(children: React.ReactNode, when: any, fallback: React.ReactNode): import("react").ReactNode;
