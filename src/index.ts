import { config } from 'dotenv';

export type Flatten<T> = T extends number ? T : T extends object ? {
	[K in keyof T]: Flatten<T[K]>;
} : T;

export type AddOperator<ChainEnv> = <
	K extends string,
	V extends string | ((v: string | undefined, ctx: ChainEnvWithoutOperators<ChainEnv>) => any)
>(key: K, defaultValue?: V) => ChainableEnv<
	Flatten<
		(K extends keyof ChainEnv ? Omit<ChainEnv, K> : ChainEnv) & {
			[k in K]: V extends ((v: string | undefined, ctx: ChainEnvWithoutOperators<ChainEnv>) => infer R) ? R : V | string;
		}
	>
>;

export type InheritConfig = {
	quiet?: boolean;
};

export type InheritOperator<ChainEnv> = <
	K extends string,
	V extends keyof ChainEnv
>(key: K, from: V, config?: InheritConfig) => ChainableEnv<
	Flatten<
		ChainEnv & {
			[k in K]: ChainEnv[V] | undefined;
		}
	>
>;

export type RemoveOperator<ChainEnv> = <K extends keyof ChainEnv>(key: K) => ChainableEnv<Flatten<Omit<ChainEnv, K>>>;

export type RenderOperator<ChainEnv> = () => Flatten<ChainEnv>;

export type ChainableEnvOperators<ChainEnv = {}> = {
	readonly add: AddOperator<ChainEnv>;
	readonly inherit: InheritOperator<ChainEnv>;
	readonly remove: RemoveOperator<ChainEnv>;
	readonly render: RenderOperator<ChainEnv>;
};

export type ChainEnvWithoutOperators<ChainEnv> = Omit<Flatten<ChainEnv>, keyof ChainableEnvOperators<Flatten<ChainEnv>>>;
export type ChainableEnv<ChainEnv = {}> = ChainEnvWithoutOperators<ChainEnv> & ChainableEnvOperators<ChainEnv>;

export function addPropertyToObject<T = {}>(
	obj: T,
	key: string,
	config: Parameters<typeof Object.defineProperty<T>>[2]
): T {
	Object.defineProperty(obj, key, {
		enumerable: true,
		configurable: true,
		...config,
	});
	return obj;
}


export function envChain(options: Parameters<typeof config>[0] = {
	path: '.env',
}): ChainableEnv {
	config(options);
	const newChain: ChainableEnv<{}> = {
		add(key, defaultValue) {
			let internalValue = undefined as typeof defaultValue | undefined;
			return addPropertyToObject(this, key, {
				get() {
					if (typeof internalValue === 'function') {
						return internalValue(process.env[key], this);
					}
					if (internalValue) return internalValue;
					if (typeof defaultValue === 'function') {
						return defaultValue(process.env[key], this);
					}
					return process.env[key] ?? defaultValue;
				},
				set(v: typeof internalValue) {
					internalValue = v;
				},
			});
		},
		inherit(key, from, config) {
			if (key in this) {
				throw new Error('Cannot inherit value from existing key');
			}
			if (!(from in this)) {
				throw new Error('Cannot inherit value from non-existing key');
			}
			return addPropertyToObject(this, key, {
				get() {
					if (from in this) return this[from];
					if (config?.quiet) return undefined;
					throw new Error('Missing inherited key');
				},
				set() {
					if (config?.quiet) return;
					throw new Error('Cannot set inherited value');
				},
			});
		},
		remove(key) {
			delete this[key];
			return this;
		},
		render() {
			return {
				...Object.keys(this).reduce((acc, k) => {
					const descriptor = Object.getOwnPropertyDescriptor(this, k);
					if (!descriptor || (descriptor.value === undefined && descriptor.set === undefined)) {
						return acc;
					}
					(acc as any)[k] = (this as any)[k];
					return acc;
				}, {})
			};
		},
	} as ChainableEnv;
	Object.defineProperty(newChain, 'add', { enumerable: false, writable: false, value: newChain.add });
	Object.defineProperty(newChain, 'inherit', { enumerable: false, writable: false, value: newChain.inherit });
	Object.defineProperty(newChain, 'remove', { enumerable: false, writable: false, value: newChain.remove });
	Object.defineProperty(newChain, 'render', { enumerable: false, writable: false, value: newChain.render });
	return newChain;
}
