import { config } from 'dotenv';

export type Flatten<T> = T extends number ? T : T extends object ? {
	[K in keyof T]: Flatten<T[K]>;
} : T;

export type AddType<Acc> = <
	K extends string,
	V extends string | ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => any)
>(key: K, defaultValue?: V) => Chainable<
	Flatten<
		(K extends keyof Acc ? Omit<Acc, K> : Acc) & {
			[k in K]: V extends ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => infer R) ? R : V | string;
		}
	>
>;

export type InheritConfig = {
	quiet?: boolean;
};

export type InheritType<Acc> = <
	K extends string,
	V extends keyof Acc
>(key: K, from: V, config?: InheritConfig) => Chainable<
	Flatten<
		Acc & {
			[k in K]: Acc[V] | undefined;
		}
	>
>;

export type RemoveType<Acc> = <K extends keyof Acc>(key: K) => Chainable<Flatten<Omit<Acc, K>>>;

export type RenderType<Acc> = () => Flatten<Acc>;


export type ChainableOpts<Acc = {}> = {
	readonly add: AddType<Acc>;
	readonly inherit: InheritType<Acc>;
	readonly remove: RemoveType<Acc>;
	readonly render: RenderType<Acc>;
};

export type AccWithoutChainOpts<Acc> = Omit<Flatten<Acc>, keyof ChainableOpts<Flatten<Acc>>>;
export type Chainable<Acc = {}> = AccWithoutChainOpts<Acc> & ChainableOpts<Acc>;

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
}): Chainable {
	config(options);
	const newChain: Chainable<{}> = {
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
	} as Chainable;
	Object.defineProperty(newChain, 'add', { enumerable: false, writable: false, value: newChain.add });
	Object.defineProperty(newChain, 'inherit', { enumerable: false, writable: false, value: newChain.inherit });
	Object.defineProperty(newChain, 'remove', { enumerable: false, writable: false, value: newChain.remove });
	Object.defineProperty(newChain, 'render', { enumerable: false, writable: false, value: newChain.render });
	return newChain;
}
