import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	appType: 'custom',
	plugins: [
		tsconfigPaths(),
		dts()
	],
	build: {
		lib: {
			entry: [
				'src/index.ts',
			],
			name: '@mumaestro/env-chain',
		},
		rollupOptions: {
			// external: ['dotenv']
		},
	},
}) 