import { packageMetadata } from '@/lib/layout.shared';
import Image from 'next/image';
import Link from 'next/link';

type Locale = 'en' | 'ko';
type PackageName = 'store' | 'state' | 'overlay' | 'modal' | 'toast' | 'utilinent' | 'fetcher' | 'form';

const packageCards = [
  {
    pkg: 'store',
    title: '@ilokesto/store',
    descriptions: {
      en: 'Minimal vanilla state container for predictable shared state.',
      ko: '예측 가능한 공유 상태를 위한 작은 vanilla 상태 컨테이너.',
    },
  },
  {
    pkg: 'state',
    title: '@ilokesto/state',
    descriptions: {
      en: 'Framework-friendly state management tools for React, Vue, Svelte, Solid, and Angular.',
      ko: 'React, Vue, Svelte, Solid, Angular를 위한 프레임워크 친화적인 상태 관리 도구.',
    },
  },
  {
    pkg: 'form',
    title: '@ilokesto/form',
    descriptions: {
      en: 'Framework-friendly form state and field bindings for React, Vue, Solid, and Svelte.',
      ko: 'React, Vue, Solid, Svelte를 위한 폼 상태와 필드 바인딩 도구.',
    },
  },
  {
    pkg: 'overlay',
    title: '@ilokesto/overlay',
    descriptions: {
      en: 'Provider-scoped React overlay runtime for modals, toasts, and custom layers.',
      ko: '모달, 토스트, 커스텀 레이어를 위한 provider 단위 React 오버레이 런타임.',
    },
  },
  {
    pkg: 'modal',
    title: '@ilokesto/modal',
    descriptions: {
      en: 'React modals with stacking, focus management, and top-layer rendering.',
      ko: '중첩, 포커스 관리, 최상위 레이어 렌더링을 지원하는 React 모달.',
    },
  },
  {
    pkg: 'toast',
    title: '@ilokesto/toast',
    descriptions: {
      en: 'React notifications with positioning, auto-dismiss, and lifecycle controls.',
      ko: '위치 지정, 자동 닫기, 수명 주기 제어를 지원하는 React 알림.',
    },
  },
  {
    pkg: 'utilinent',
    title: '@ilokesto/utilinent',
    descriptions: {
      en: 'React rendering utilities for conditionals, lists, slots, and lazy UI.',
      ko: '조건부 렌더링, 목록, 슬롯, 지연 UI를 명확하게 작성하는 React 유틸리티.',
    },
  },
  {
    pkg: 'fetcher',
    title: '@ilokesto/fetcher',
    descriptions: {
      en: 'OpenAPI-aware ky wrapper with typed routes, bodies, and safe results.',
      ko: '타입 안전한 경로, 요청 본문, 실패를 던지지 않는 결과를 더한 ky 래퍼.',
    },
  },
] as const;

type PackageCard = (typeof packageCards)[number];

const homeCopy: Record<Locale, {
  subtitle: string;
  comingSoon: string;
}> = {
  en: {
    subtitle: "[iloˈkɛsto], which means \"toolbox\" in Esperanto\nA small, explicit collection of packages for predictable front-end development.",
    comingSoon: 'Coming soon',
  },
  ko: {
    subtitle: "[iloˈkɛsto], 에스페란토로 '도구상자'를 의미\n예측 가능한 프론트엔드 개발을 위한 작고 명시적인 패키지 모음.",
    comingSoon: '준비 중',
  },
};

function getLocale(lang: string): Locale {
  return lang === 'ko' ? 'ko' : 'en';
}

function PackageAccent({ pkg }: { pkg: PackageName }) {
  return (
    <span
      className={`mb-5 block h-2 w-16 rounded-full ${packageMetadata[pkg].colorClass}`}
      aria-hidden="true"
    />
  );
}

function PackageCardContent({
  card,
  copy,
  locale,
}: {
  readonly card: PackageCard;
  readonly copy: (typeof homeCopy)[Locale];
  readonly locale: Locale;
}) {
  return (
    <>
      <PackageAccent pkg={card.pkg} />
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-fd-foreground">
            {card.title}
          </h2>
          {'comingSoon' in card && card.comingSoon ? (
            <span className="shrink-0 rounded-full border border-fd-border bg-fd-background px-3 py-1 text-xs font-medium text-fd-muted-foreground">
              {copy.comingSoon}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-fd-muted-foreground">
          {card.descriptions[locale]}
        </p>
      </div>
    </>
  );
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const locale = getLocale(resolvedParams.lang);
  const copy = homeCopy[locale];

  return (
    <main className="flex flex-1 flex-col bg-fd-background text-fd-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">

          <div className="space-y-6">
            <div className='flex items-center justify-left gap-6'>
            <div className="flex size-20 items-center justify-center rounded-3xl border border-fd-border bg-fd-card p-3 shadow-sm">
              <Image
                src="/ilokesto-logo.webp"
                alt="ilokesto logo"
                width={56}
                height={56}
                priority
                className="size-14"
              />
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-fd-foreground sm:text-6xl lg:text-7xl">
              ilokesto
            </h1>
          </div>

            <p className="text-lg leading-8 text-fd-muted-foreground sm:text-xl whitespace-pre-wrap">
              {copy.subtitle}
            </p>
          </div>


        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {packageCards.map((card) => {
            const cardClassName =
              'rounded-3xl border border-fd-border bg-fd-card p-6 shadow-sm transition hover:border-fd-primary/40 hover:bg-fd-accent';

            if ('comingSoon' in card && card.comingSoon) {
              return (
                <article
                  key={card.pkg}
                  aria-disabled="true"
                  className="rounded-3xl border border-fd-border bg-fd-card/60 p-6 opacity-70 shadow-sm"
                >
                  <PackageCardContent card={card} copy={copy} locale={locale} />
                </article>
              );
            }

            return (
              <Link
                key={card.pkg}
                href={`/${resolvedParams.lang}/${card.pkg}`}
                className={cardClassName}
              >
                <PackageCardContent card={card} copy={copy} locale={locale} />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
