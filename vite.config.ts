import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths'
import * as glob from 'glob';

const libEntrys = glob.sync('./src/!(*.d).ts');

export default defineConfig({
	appType: 'custom',
	plugins: [
		tsconfigPaths(),
		dts({
			tsconfigPath: './tsconfig.build.json',
			copyDtsFiles: true,
		})
	],
	build: {
		lib: {
			entry: libEntrys,
			name: '@mumaestro/env-chain',
			formats: ['es']
		},
		rollupOptions: {
			external: ['dotenv']
		}
	},
}) 