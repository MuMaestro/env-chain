import { config } from 'dotenv';

export type Flatten<T> =
	T extends number
	? T
	: T extends object
	? { [K in keyof T]: Flatten<T[K]>; } : T;

export type DefaultValue<ChainEnv> =
	string | ChainableEnv<ChainEnv> | ((v: string | undefined, ctx: Omit<Flatten<ChainEnv>, keyof ChainableEnvOperators<Flatten<ChainEnv>>>) => any) | undefined;

type IncludeInChainWithFunction<
	ChainEnv,
	K extends string,
	V = DefaultValue<ChainEnv>
> = (K extends keyof ChainEnv ? Omit<ChainEnv, K> : ChainEnv) & {
	[k in K]: V extends string ? string
	: V extends ChainableEnv<infer R> ? ChainableEnv<Flatten<R>>
	: V extends ((v: string | undefined, ctx: Omit<Flatten<ChainEnv>, keyof ChainableEnvOperators<Flatten<ChainEnv>>>) => infer R) ? R
	: V extends undefined ? string | undefined
	: V;
};

export type AddOperator<ChainEnv> = <
	K extends string,
	V extends DefaultValue<ChainEnv>
>(key: K, defaultValue?: V) =>
	ChainableEnv<
		Flatten<
			IncludeInChainWithFunction<ChainEnv, K, V>
		>
	>;


export type AliasOperator<ChainEnv> = <
	K extends string,
	D extends string,
	V extends DefaultValue<ChainEnv>,
>(key: K, envVariable: D, defaultValue?: V) =>
	ChainableEnv<
		Flatten<
			IncludeInChainWithFunction<ChainEnv, K, V>
		>
	>;


export type GroupOperator<ChainEnv> = <
	K extends string,
	GroupChainEnv,
	GroupChainableEnv = ChainableEnv<Flatten<GroupChainEnv>>,
>(key: K, groupCreateFunction: (envChain: ChainableEnv) => GroupChainableEnv) =>
	ChainableEnv<
		Flatten<
			IncludeInChainWithFunction<ChainEnv, K, GroupChainableEnv>
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

export type CloneOperator<ChainEnv> = () => ChainableEnv<Flatten<ChainEnv>>;

export type ChainableEnvOperators<ChainEnv = {}> = {
	readonly add: AddOperator<ChainEnv>;
	readonly alias: AliasOperator<ChainEnv>;
	readonly inherit: InheritOperator<ChainEnv>;
	readonly group: GroupOperator<ChainEnv>;
	readonly remove: RemoveOperator<ChainEnv>;
	readonly render: RenderOperator<ChainEnv>;
	readonly clone: CloneOperator<ChainEnv>;
};

export type ChainableEnv<ChainEnv = {}> =
	Omit<
		Flatten<ChainEnv>, 
		keyof ChainableEnvOperators<Flatten<ChainEnv>>
	>
	& ChainableEnvOperators<ChainEnv>;

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
		group(k, groupCreateFunction) {
			const groupChain = groupCreateFunction(envChain(options));
			return addPropertyToObject(this, k, {
				get() {
					return groupChain;
				},
				set() {
					throw new Error('Cannot set group value');
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

