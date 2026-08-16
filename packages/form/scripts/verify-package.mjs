import { execFileSync } from 'node:child_process';
import {
  accessSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const storeDirectory = path.resolve(packageDirectory, '../store');
const consumerDirectory = mkdtempSync(path.join(tmpdir(), 'ilokesto-form-pack-'));
const artifactsDirectory = path.join(consumerDirectory, 'artifacts');

const run = (command, args, cwd) => {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
};

const requireTarball = (packageName) => {
  const tarball = readdirSync(artifactsDirectory).find((entry) => entry.startsWith(packageName));
  if (tarball === undefined) throw new TypeError(`Missing ${packageName} tarball`);
  return path.join(artifactsDirectory, tarball);
};

try {
  run('pnpm', ['build'], storeDirectory);
  run('pnpm', ['pack', '--pack-destination', artifactsDirectory], storeDirectory);
  run('pnpm', ['pack', '--pack-destination', artifactsDirectory], packageDirectory);

  const storeTarball = requireTarball('ilokesto-store-');
  const formTarball = requireTarball('ilokesto-form-');
  writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@ilokesto/form': `file:${formTarball}`,
        '@ilokesto/store': `file:${storeTarball}`,
        immer: '11.1.8',
        react: '^19.0.0',
        'solid-js': '^1.9.0',
        svelte: '^5.0.0',
        typescript: '^6.0.2',
        vue: '^3.5.0',
      },
      pnpm: {
        overrides: {
          '@ilokesto/store': `file:${storeTarball}`,
        },
      },
      private: true,
      type: 'module',
    }),
  );
  writeFileSync(
    path.join(consumerDirectory, 'verify.mjs'),
    `import { CreateForm } from '@ilokesto/form';
import { useForm as useReactForm } from '@ilokesto/form/react';
import { useForm as useSolidForm } from '@ilokesto/form/solid';
import { useForm as useSvelteForm } from '@ilokesto/form/svelte';
import { useForm as useVueForm } from '@ilokesto/form/vue';

for (const exportedValue of [CreateForm, useReactForm, useSolidForm, useSvelteForm, useVueForm]) {
  if (typeof exportedValue !== 'function') throw new TypeError('Expected a function export');
}
const form = new CreateForm({ defaultValues: { email: '' } });
form.setValue('email', 'packed');
if (form.getValue('email') !== 'packed') throw new TypeError('Packed form runtime failed');
`,
  );
  writeFileSync(
    path.join(consumerDirectory, 'types.ts'),
    `import type { VueFormOptions } from '@ilokesto/form/vue';
import type { SvelteFieldSnapshot } from '@ilokesto/form/svelte';

const options: VueFormOptions<{ readonly email: string }> = {
  defaultValues: { email: '' },
};
const snapshot: SvelteFieldSnapshot = {
  dirty: false,
  errors: [],
  touched: false,
  value: '',
};
void options;
void snapshot;
`,
  );
  writeFileSync(
    path.join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        lib: ['DOM', 'ES2022'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        strict: true,
        target: 'ES2022',
      },
      include: ['types.ts'],
    }),
  );

  run('pnpm', ['install', '--prefer-offline', '--ignore-scripts'], consumerDirectory);
  run('node', ['verify.mjs'], consumerDirectory);
  run('pnpm', ['exec', 'tsc', '--noEmit'], consumerDirectory);

  const installedFormDirectory = path.join(consumerDirectory, 'node_modules/@ilokesto/form');
  for (const target of [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/react/index.js',
    'dist/react/index.d.ts',
    'dist/solid/index.js',
    'dist/solid/index.d.ts',
    'dist/svelte/index.js',
    'dist/svelte/index.d.ts',
    'dist/vue/index.js',
    'dist/vue/index.d.ts',
  ]) {
    accessSync(path.join(installedFormDirectory, target));
  }

  const installedManifest = JSON.parse(
    readFileSync(path.join(installedFormDirectory, 'package.json'), 'utf8'),
  );
  const storeRange = installedManifest?.dependencies?.['@ilokesto/store'];
  if (typeof storeRange !== 'string' || storeRange.startsWith('workspace:')) {
    throw new TypeError('Packed manifest contains an invalid @ilokesto/store dependency');
  }
} finally {
  rmSync(consumerDirectory, { force: true, recursive: true });
}
