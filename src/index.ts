import { config } from 'dotenv';

export type Flatten<T, Skip = undefined> =
	T extends number
	? T
	: T extends object
	? {
		[K in keyof T]: K extends keyof Skip
		? T[K]
		: Flatten<T[K]>;
	} : T;

export type DefaultValueTo<ctx> =
	string
	| ChainableEnv<ctx>
	| ((v: string | undefined, ctx: Omit<Flatten<ctx>, keyof ChainableEnvOperators<Flatten<ctx>>>) => any)
	| undefined;

export type KeysWhereChainableEnv<T> = {
	[K in keyof T]: T[K] extends ChainableEnvOperators ? T : never
}

export type FlattenSkippingChainableEnv<T> = Flatten<T, KeysWhereChainableEnv<T>>;

export type RemoveChainableEnvOperators<T> = Omit<T, keyof ChainableEnvOperators>

export type AmmendInChainCtx<
	ctx,
	K extends string,
	V = DefaultValueTo<ctx>
> = (K extends keyof ctx ? Omit<ctx, K> : ctx) & {
	[k in K]: V extends string ? string
	: V extends ChainableEnvOperators<infer R> ? ChainableEnv<FlattenSkippingChainableEnv<R>>
	: V extends ((v: string | undefined, ctx: RemoveChainableEnvOperators<FlattenSkippingChainableEnv<ctx>>) => infer R) ? R
	: V extends undefined ? string | undefined
	: V;
};

export type AddOperator<ctx> = <
	K extends string,
	V extends DefaultValueTo<ctx>,
	CtxAmmended = AmmendInChainCtx<ctx, K, V>
>(key: K, defaultValue?: V) =>
	ChainableEnv<
		FlattenSkippingChainableEnv<CtxAmmended>
	>;


export type AliasOperator<ctx> = <
	K extends string,
	D extends string,
	V extends DefaultValueTo<ctx>,
	CtxAmmended = AmmendInChainCtx<ctx, K, V>
>(key: K, envVariable: D, defaultValue?: V) =>
	ChainableEnv<
		FlattenSkippingChainableEnv<CtxAmmended>
	>;

export type GroupOperator<ctx> = <
	K extends string,
	Groupctx,
	GroupChainableEnv = ChainableEnv<Flatten<Groupctx, KeysWhereChainableEnv<Groupctx>>>,
	CtxAmmended = AmmendInChainCtx<ctx, K, GroupChainableEnv>
>(key: K, groupCreateFunction: (envChain: ChainableEnv) => GroupChainableEnv) =>
	ChainableEnv<
		FlattenSkippingChainableEnv<CtxAmmended>
	>;

export type InheritConfig = {
	quiet?: boolean;
};

export type InheritOperator<ctx> = <
	K extends string,
	V extends keyof ctx,
	CtxAmmended = ctx & {
		[k in K]: ctx[V] | undefined;
	}
>(key: K, from: V, config?: InheritConfig) => ChainableEnv<
	FlattenSkippingChainableEnv<CtxAmmended>
>;

export type RemoveOperator<ctx> = <
	K extends keyof ctx,
	CtxAmmended = Omit<ctx, K>
>(key: K) => ChainableEnv<
	FlattenSkippingChainableEnv<CtxAmmended>
>;

export type RenderChainCtx<ctx> = {
	[K in keyof ctx]: ctx[K] extends ChainableEnvOperators<infer R>
	? RenderChainCtx<R>
	: ctx[K]
}

export type RenderOperator<ctx> = () =>
	Flatten<RenderChainCtx<ctx>>;

export type CloneOperator<ctx> = () => ChainableEnv<
	Flatten<ctx, KeysWhereChainableEnv<ctx>>
>;

export type ChainableEnvOperators<ctx = {}> = {
	readonly add: AddOperator<ctx>;
	readonly alias: AliasOperator<ctx>;
	readonly inherit: InheritOperator<ctx>;
	readonly group: GroupOperator<ctx>;
	readonly remove: RemoveOperator<ctx>;
	readonly render: RenderOperator<ctx>;
	readonly clone: CloneOperator<ctx>;
};

export type ChainableEnv<ctx = {}> =
	ctx
	& ChainableEnvOperators<ctx>;

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
					if (typeof (this as any)[k].render === 'function') {
						(acc as any)[k] = (this as any)[k]();
					} else {
						(acc as any)[k] = (this as any)[k];
					}
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

function addKeyWithDefaultValue<ctx, V>(
	context: ChainableEnv<ctx>,
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

