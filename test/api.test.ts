import { envChain } from '../src/index';
import { beforeEach, describe, expect, test } from '@jest/globals';

const validEnvConfig = { path: 'test/.env.example' };

describe('envChain', () => {
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
})

