import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

const packageDocs = (dir: string) =>
  defineDocs({
    dir,
    docs: {
      schema: pageSchema,
      postprocess: {
        includeProcessedMarkdown: true,
      },
    },
    meta: {
      schema: metaSchema,
    },
  });

export const store = packageDocs('../../packages/store/docs');
export const state = packageDocs('../../packages/state/docs');
export const form = packageDocs('../../packages/form/docs');
export const overlay = packageDocs('../../packages/overlay/docs');
export const modal = packageDocs('../../packages/modal/docs');
export const toast = packageDocs('../../packages/toast/docs');
export const utilinent = packageDocs('../../packages/utilinent/docs');
export const fetcher = packageDocs('../../packages/fetcher/docs');

export default defineConfig();
