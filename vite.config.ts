import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths'
import * as glob from 'glob';

const libEntrys = glob.sync('./src/*.ts');

export default defineConfig({
	appType: 'custom',
	plugins: [
		tsconfigPaths(),
		dts({
			logLevel: `info`,
			copyDtsFiles: true,
		})
	],
	build: {
		lib: {
			entry: libEntrys,
			name: '@mumaestro/env-chain',
			formats: ['cjs']
		},
	},
}) 