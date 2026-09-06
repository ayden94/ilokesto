import { RootProvider } from 'fumadocs-ui/provider/next';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;

  return (
    <RootProvider
      search={{
        options: {
          type: 'fetch',
          api: '/api/search',
        },
      }}
      i18n={{
        locale: resolvedParams.lang,
        locales:
          resolvedParams.lang === 'ko'
            ? [
                { locale: 'en', name: '영어' },
                { locale: 'ko', name: '한국어' },
              ]
            : [
                { locale: 'en', name: 'English' },
                { locale: 'ko', name: 'Korean' },
              ],
        translations:
          resolvedParams.lang === 'ko'
            ? {
                search: '검색',
                searchNoResult: '결과 없음',
                toc: '목차',
                tocNoHeadings: '제목 없음',
                lastUpdate: '마지막 업데이트',
                chooseLanguage: '언어 선택',
                nextPage: '다음',
                previousPage: '이전',
              }
            : undefined,
      }}
    >
      {children}
    </RootProvider>
  );
}
