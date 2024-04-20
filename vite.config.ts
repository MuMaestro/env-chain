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
			rollupTypes: true,
			strictOutput: true,
		})
	],
	build: {
		lib: {
			entry: libEntrys,
			name: '@mumaestro/env-chain',
			fileName: 'index',
			formats: ['es', 'cjs'],
		},
		// rollupOptions: {
		// 	external: ['dotenv']
		// }
	},
}) 