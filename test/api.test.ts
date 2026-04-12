import { envChain } from '../src/index';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

const validEnvConfig = { path: 'test/.env.example', quiet: true, debug: false };

describe('envChain', () => {
	describe('build time vs runtime', () => {
		const targetKey = 'NEXT_PUBLIC_RUNTIME_DIFF_TEST';
		const previousValue = process.env[targetKey];

		afterEach(() => {
			if (previousValue === undefined) {
				delete process.env[targetKey];
				return;
			}
			process.env[targetKey] = previousValue;
		});

		test('prefers build-time injected env, while runtime chain reads process.env', () => {
			process.env[targetKey] = 'runtime-value';

			const buildTimeChain = envChain({
				disableDotenvx: true,
				debug: false,
				quiet: true,
				env: {
					[targetKey]: 'build-time-value',
				},
			}).add(targetKey);

			const runtimeChain = envChain({
				disableDotenvx: true,
				debug: false,
				quiet: true,
			}).add(targetKey);

			expect(buildTimeChain[targetKey]).toBe('build-time-value');
			expect(runtimeChain[targetKey]).toBe('runtime-value');
		});
	});

	describe('populates process.env', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		test.each(['VARIABLE_1', 'VARIABLE_2'])('contain target variable %s', async (variable) => {
			expect(Object.keys(process.env)).toContain(variable);
		});
	})

	describe('adding a variable', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		describe('gets value of variable can get value', () => {
			let env = envChain(validEnvConfig);

			beforeEach(() => {
				env = envChain(validEnvConfig);
			});

			test('from env', async () => {
				const chain = env.add('VARIABLE_1', 'test');
				expect(chain.VARIABLE_1).toBe('variable_1');
			})

			test('from default', async () => {
				const chain = env.add('UNSET_VARIABLES', 'test');
				expect(chain.UNSET_VARIABLES).toBe('test');
			})

			test('from override', async () => {
				const chain = env.add('VARIABLE_1', 'test');
				chain.VARIABLE_1 = 'another_test';
				expect(chain.VARIABLE_1).toBe('another_test');
			});

			test('from function', async () => {
				const chain = env.add('VARIABLE_1', (v) => 'from function');
				expect(chain.VARIABLE_1).toBe('from function');
			});

			test('from function override', async () => {
				const chain = env.add('VARIABLE_1', (v) => 'from function');
				chain.VARIABLE_1 = 'another_test';
				expect(chain.VARIABLE_1).toBe('another_test');
			});

		})

		test('can redefine same variable', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.add('VARIABLE_1', () => 10)
			// .alias('VARIABLE_1', 'AUTH_VARIABLE_1')
			// .group('auth', (g) => g.add('VARIABLE_1', 'test'));
			expect(chain.VARIABLE_1).toBe(10);
		})

		describe('inheriting another variable', () => {
			let env = envChain(validEnvConfig);

			beforeEach(() => {
				env = envChain(validEnvConfig);
			});

			test('gets values from first variable', async () => {
				const chain = env
					.add('VARIABLE_1', 'test')
					.inherit('UNSET_VARIABLES', 'VARIABLE_1');
				expect(chain.UNSET_VARIABLES).toBe('variable_1');
			});

			test('throws on missing inherited variable', async () => {
				const chain = env
					.add('VARIABLE_1', 'test');
				expect(() => (chain as any).inherit('VARIABLE_2', 'VARIABLE_3')).toThrow();
			});

			test('throws on variable already set', async () => {
				const chain = env
					.add('VARIABLE_1', 'test');
				expect(() => (chain as any).inherit('VARIABLE_1', 'VARIABLE_1')).toThrow();
			});

			test('overwrithing throws', async () => {
				const chain = env
					.add('VARIABLE_1', 'test');
				expect(() => (chain as any).inherit('VARIABLE_1', 'VARIABLE_1')).toThrow();
			});

			test('value changes when original changes', async () => {
				const chain = env
					.add('UNKNOW_VARIABLE', 'test')
					.inherit('VARIABLE_2', 'UNKNOW_VARIABLE');
				chain.UNKNOW_VARIABLE = 'another_test';
				expect(chain.VARIABLE_2).toBe('another_test');
			})
		})
	})

	describe('removing a variable', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		test('deletes it from object', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.remove('VARIABLE_1');
			expect(Object.keys(chain)).not.toContain('VARIABLE_1');
		})

		test('can remove a variable and add it back', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.remove('VARIABLE_1')
				.add('VARIABLE_1', 'test');
			expect(chain.VARIABLE_1).toBe('variable_1');
		})

		test('deletes throws inheriteds errors', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.inherit('VARIABLE_2', 'VARIABLE_1')
				.remove('VARIABLE_1');
			expect(() => chain.VARIABLE_2).toThrow();
		})

		test('deletes do not throw on quiet config', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.inherit('VARIABLE_2', 'VARIABLE_1', { quiet: true })
				.remove('VARIABLE_1');
			expect(() => chain.VARIABLE_2).not.toThrow();
		})
	});

	describe('rendering', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		test('renders all variables', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.add('VARIABLE_2', 'test');
			expect(chain.render()).toEqual({
				VARIABLE_1: 'variable_1',
				VARIABLE_2: 'variable_2',
			});
		})

		test('renders all variables with functions', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.add('VARIABLE_2', (v) => 'from function');
			expect(chain.render()).toEqual({
				VARIABLE_1: 'variable_1',
				VARIABLE_2: 'from function',
			});
		})

		test('renders all variables with inherited', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.inherit('VARIABLE_2', 'VARIABLE_1');
			expect(chain.render()).toEqual({
				VARIABLE_1: 'variable_1',
				VARIABLE_2: 'variable_1',
			});
		});

		test('renders all variables with removed', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.add('VARIABLE_2', 'test')
				.remove('VARIABLE_1');
			expect(chain.render()).toEqual({
				VARIABLE_2: 'variable_2',
			});
		});

		test('does not render default functions', async () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.add('VARIABLE_2', (v) => 'from function');
			expect((chain.render() as any).add).toBeUndefined();
		})
	});

	describe('alias', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		test('alias a variable', async () => {
			const chain = env
				.alias('ALIAS_VARIABLE_1', 'VARIABLE_1');
			expect(chain.ALIAS_VARIABLE_1).toBe('variable_1');
		})
	});

	describe('clone', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		test('chain does not interfere with original chain', async () => {
			const chain = env.add('UNKNOWN_VARIABLE', 'test').add('VARIABLE_1', 'test_1');
			const clone = chain.clone().add('VARIABLE_2', 'test_2');
			clone.UNKNOWN_VARIABLE = 'another_test';
			expect(clone).not.toEqual(chain);
			expect(clone.UNKNOWN_VARIABLE).toBe('another_test');
			expect(chain.UNKNOWN_VARIABLE).not.toBe('another_test');
			expect(clone.VARIABLE_1).toBe('variable_1');
			expect(clone.VARIABLE_2).toBe('variable_2');
			expect((chain as any).VARIABLE_2).not.toBeDefined();
		})
	})

	describe('build time validation', () => {
		test('reads encrypted variables from dotenvx env file', () => {
			const chain = envChain(validEnvConfig).add('VARIABLE_1').add('VARIABLE_2');
			expect(chain.VARIABLE_1).toBe('variable_1');
			expect(chain.VARIABLE_2).toBe('variable_2');
		});

		test('build-time env option takes precedence over process.env', () => {
			const key = 'BUILD_PRECEDENCE_TEST_' + Date.now();
			process.env[key] = 'runtime-value';
			try {
				const chain = envChain({
					disableDotenvx: true,
					env: { [key]: 'build-time-value' },
				}).add(key);
				expect(chain[key]).toBe('build-time-value');
			} finally {
				delete process.env[key];
			}
		});

		test('build-time env option takes precedence over dotenvx loaded variables', () => {
			const chain = envChain({
				...validEnvConfig,
				env: { VARIABLE_1: 'overridden-at-build-time' },
			}).add('VARIABLE_1');
			expect(chain.VARIABLE_1).toBe('overridden-at-build-time');
		});

		test('default value is used when variable is absent from env', () => {
			const chain = envChain({ disableDotenvx: true }).add('ABSENT_VAR', 'my-default');
			expect(chain.ABSENT_VAR).toBe('my-default');
		});

		test('default function receives the raw env value and current context', () => {
			const chain = envChain({ disableDotenvx: true, env: { RAW_VAR: 'raw' } })
				.add('RAW_VAR', (v, ctx) => `processed:${v}`);
			expect(chain.RAW_VAR).toBe('processed:raw');
		});
	});

	describe('secret isolation (build-time env must not leak)', () => {
		test('build-time env secrets do not appear in process.env', () => {
			const secretKey = 'BT_SECRET_' + Date.now();
			envChain({ disableDotenvx: true, env: { [secretKey]: 'secret-value' } }).add(secretKey);
			expect(process.env[secretKey]).toBeUndefined();
		});

		test('build-time env secrets are not accessible from an independent runtime chain', () => {
			const secretKey = 'BT_SECRET_CHAIN_' + Date.now();
			envChain({ disableDotenvx: true, env: { [secretKey]: 'secret-value' } }).add(secretKey);
			const runtimeChain = envChain({ disableDotenvx: true }).add(secretKey);
			expect(runtimeChain[secretKey]).toBeUndefined();
		});

		test('two build-time chains with different secrets do not share values', () => {
			const key1 = 'BT_SECRET_A_' + Date.now();
			const key2 = 'BT_SECRET_B_' + Date.now();
			const chainA = envChain({ disableDotenvx: true, env: { [key1]: 'secret-a' } }).add(key1).add(key2);
			const chainB = envChain({ disableDotenvx: true, env: { [key2]: 'secret-b' } }).add(key1).add(key2);
			expect(chainA[key1]).toBe('secret-a');
			expect(chainA[key2]).toBeUndefined();
			expect(chainB[key1]).toBeUndefined();
			expect(chainB[key2]).toBe('secret-b');
		});

		test('dotenvx loaded variables are reflected in process.env', () => {
			envChain(validEnvConfig);
			expect(process.env['VARIABLE_1']).toBeDefined();
			expect(process.env['VARIABLE_2']).toBeDefined();
		});

		test('rendered output excludes operator methods', () => {
			const chain = envChain({ disableDotenvx: true, env: { SAFE_VAR: 'value' } }).add('SAFE_VAR');
			const rendered = chain.render();
			expect((rendered as any).add).toBeUndefined();
			expect((rendered as any).validate).toBeUndefined();
			expect((rendered as any).render).toBeUndefined();
		});
	});

	describe('validate', () => {
		test('throws when a required variable is missing', () => {
			const chain = envChain({ disableDotenvx: true }).add('MISSING_REQUIRED');
			expect(() => chain.validate()).toThrow(/MISSING_REQUIRED/);
		});

		test('throws listing all missing variables', () => {
			const chain = envChain({ disableDotenvx: true })
				.add('MISSING_A')
				.add('MISSING_B');
			expect(() => chain.validate()).toThrow(/MISSING_A/);
			expect(() => chain.validate()).toThrow(/MISSING_B/);
		});

		test('does not throw when all variables are defined via env option', () => {
			const chain = envChain({ disableDotenvx: true, env: { PRESENT_VAR: 'value' } })
				.add('PRESENT_VAR');
			expect(() => chain.validate()).not.toThrow();
		});

		test('does not throw when all variables have string defaults', () => {
			const chain = envChain({ disableDotenvx: true })
				.add('VAR_WITH_DEFAULT', 'fallback');
			expect(() => chain.validate()).not.toThrow();
		});

		test('does not throw when all variables have function defaults returning a value', () => {
			const chain = envChain({ disableDotenvx: true })
				.add('VAR_WITH_FN_DEFAULT', () => 'computed');
			expect(() => chain.validate()).not.toThrow();
		});

		test('throws when a function default returns undefined', () => {
			const chain = envChain({ disableDotenvx: true })
				.add('VAR_FN_UNDEF', () => undefined);
			expect(() => chain.validate()).toThrow(/VAR_FN_UNDEF/);
		});

		test('returns the chain itself when validation passes (chainable)', () => {
			const chain = envChain({ disableDotenvx: true, env: { CHAIN_VAR: 'v' } })
				.add('CHAIN_VAR');
			const result = chain.validate();
			expect(result).toBe(chain);
		});

		test('can call render after validate', () => {
			const chain = envChain({ disableDotenvx: true, env: { RENDER_VAR: 'val' } })
				.add('RENDER_VAR')
				.validate();
			expect(chain.render()).toEqual({ RENDER_VAR: 'val' });
		});

		test('validate is not included in render output', () => {
			const chain = envChain({ disableDotenvx: true, env: { SOME_VAR: 'val' } })
				.add('SOME_VAR');
			const rendered = chain.render();
			expect((rendered as any).validate).toBeUndefined();
		});
	});

	describe('group', () => {
		let env = envChain(validEnvConfig);

		beforeEach(() => {
			env = envChain(validEnvConfig);
		});

		test('creates subchain', () => {
			const chain = env
				.add('VARIABLE_1', 'test')
				.group('auth', (g, ctx) => g.add('VARIABLE_2', 'test').add('VARIABLE_3', ctx.VARIABLE_1));
			expect(chain.auth.VARIABLE_2).not.toBe('test');
			expect(chain.auth.VARIABLE_3).toBe('variable_1');

		})
	})
})

