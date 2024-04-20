import { config } from 'dotenv';

export type Flatten<T> =
	T extends number
	? T
	: T extends object ? { [K in keyof T]: Flatten<T[K]>; } : T;

export type DefaultValue<ChainEnv> = string | ((v: string | undefined, ctx: ChainEnvWithoutOperators<ChainEnv>) => any);

type IncludeInChainWithFunction<
	ChainEnv,
	K extends string,
	V extends DefaultValue<ChainEnv>
> = ChainableEnv<
	Flatten<
		(K extends keyof ChainEnv ? Omit<ChainEnv, K> : ChainEnv) &
		{
			[k in K]:
			V extends undefined
			? (never)
			: V extends ((v: string | undefined, ctx: ChainEnvWithoutOperators<ChainEnv>) => infer R)
			? R
			: V extends string ? string : V;
		}
	>
>;

export type AddOperator<ChainEnv> = <
	K extends string,
	V extends DefaultValue<ChainEnv>
>(key: K, defaultValue?: V) =>
	IncludeInChainWithFunction<ChainEnv, K, V>;


export type AliasOperator<ChainEnv> = <
	K extends string,
	D extends string,
	V extends DefaultValue<ChainEnv>,
>(key: K, envVariable: D, defaultValue?: V) =>
	IncludeInChainWithFunction<ChainEnv, K, V>;

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

export type CloneOperator<ChainEnv> = () => ChainableEnv<Flatten<ChainEnv>>;

export type ChainableEnvOperators<ChainEnv = {}> = {
	readonly add: AddOperator<ChainEnv>;
	readonly alias: AliasOperator<ChainEnv>;
	readonly inherit: InheritOperator<ChainEnv>;
	readonly remove: RemoveOperator<ChainEnv>;
	readonly render: RenderOperator<ChainEnv>;
	readonly clone: CloneOperator<ChainEnv>;
};

export type ChainEnvWithoutOperators<ChainEnv> = Omit<Flatten<ChainEnv>, keyof ChainableEnvOperators<Flatten<ChainEnv>>>;
export type ChainableEnv<ChainEnv = {}> = ChainEnvWithoutOperators<ChainEnv> & ChainableEnvOperators<ChainEnv>;

export function envChain(options: Parameters<typeof config>[0] = {
	path: '.env',
}): ChainableEnv {
	config(options);
	const newChain: ChainableEnv<{}> = {
		add(key, defaultValue) {
			return addKeyWithDefaultValue(this, key, defaultValue);
		},
		alias(key, envVariable, defaultValue) {
			return addKeyWithDefaultValue(this, key, defaultValue, envVariable);
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
		clone() {
			const newChain = envChain(options)
			return Object.assign(newChain, this);
		},
	} as ChainableEnv;
	freezeOperators(newChain);
	return newChain;
}

function freezeOperators(newChain: ChainableEnv<{}>) {
	Object.keys(newChain).forEach((key) => {
		Object.defineProperty(newChain, key, { enumerable: false, writable: false });
	});
}

function addKeyWithDefaultValue<ChainEnv, V>(
	context: ChainableEnv<ChainEnv>,
	key: string,
	defaultValue: V | undefined,
	envKey = key
) {
	let internalValue = undefined as typeof defaultValue | undefined;
	return addPropertyToObject(context, key, {
		get() {
			if (typeof internalValue === 'function') {
				return internalValue(process.env[envKey], this);
			}
			if (internalValue) return internalValue;
			if (typeof defaultValue === 'function') {
				return defaultValue(process.env[envKey], this);
			}
			return process.env[envKey] ?? defaultValue;
		},
		set(v: typeof internalValue) {
			internalValue = v;
		},
	});
}

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

