import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	appType: 'custom',
	plugins: [
		dts()
	],
	build: {
		lib: {
			entry: [
				'src/index.ts',
			],
			name: '@mumaestro/env-chain',
			fileName: 'env-chain',
		},
		rollupOptions: {
			external: ['dotenv']
		},
	},
}) 