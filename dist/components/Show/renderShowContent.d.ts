/**
 * children 렌더링을 처리하는 공통 함수
 *
 * 두 가지 사용 패턴:
 * 1. 함수 children: Show 자체가 조건부 렌더링 (<Show when={x}>{(val) => ...}</Show>)
 * 2. ReactNode children: Show는 항상 렌더링, Showable만 조건부 (<Show.div when={x}><Showable>...</Showable></Show.div>)
 */
export declare function renderShowContent(when: any, children: React.ReactNode | ((value: any) => React.ReactNode), fallback: React.ReactNode): React.ReactNode;
