import { config } from 'dotenv';

type Flatten<T> = T extends number ? T : T extends object ? {
	[K in keyof T]: Flatten<T[K]>;
} : T;

type AddType<Acc> =
	<
		K extends string,
		V extends string | ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => any)
	>
		(key: K, value?: V) => Chainable<
			Flatten<
				(K extends keyof Acc ? Omit<Acc, K> : Acc) & {
					[k in K]: V extends ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => infer R) ? R : V | string;
				}
			>
		>

type InheritConfig = {
	quiet?: boolean;
};

type InheritType<Acc> =
	<
		K extends string,
		V extends keyof Acc
	>
		(key: K, from: V, config?: InheritConfig) => Chainable<
			Flatten<
				Acc & { [k in K]: Acc[V] | undefined; }
			>
		>;

type RemoveType<Acc> =
	<K extends keyof Acc>
		(key: K) => Chainable<Flatten<Omit<Acc, K>>>;

type RenderType<Acc> = () => Flatten<Acc>;

type ChainableOpts<Acc = {}> = {
	readonly add: AddType<Acc>;
	readonly inherit: InheritType<Acc>;
	readonly remove: RemoveType<Acc>;
	readonly render: RenderType<Acc>;
};

export type AccWithoutChainOpts<Acc> = Omit<Flatten<Acc>, keyof ChainableOpts<Flatten<Acc>>>;
export type Chainable<Acc = {}> = AccWithoutChainOpts<Acc> & ChainableOpts<Acc>;

function addProperty<Acc = {}>(
	acc: Acc, 
	key: string, 
	config: Parameters<typeof Object.defineProperty<Acc>>[2],
): Acc {
	Object.defineProperty(acc, key, {
		enumerable: true,
		configurable: true,
		...config,
	});
	return acc;
}

export function envChain(options: Parameters<typeof config>[0] = {
	path: '.env',
}): Chainable {
	config(options);
	const newChain: Chainable<{}> = {
		add(key, value) {
			let internalValue = undefined as typeof value | undefined;
			return addProperty(this, key, {
				get() {
					if (typeof internalValue === 'function') {
						return internalValue(process.env[key], this);
					}
					if (internalValue) return internalValue;
					if (typeof value === 'function') {
						return value(process.env[key], this);
					}
					return process.env[key] ?? value;
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
			return addProperty(this, key, {
				get() {
					if (from in this) return this[from];
					if (config?.quiet) return undefined;
					throw new Error('Missing inherited key');
				},
				set(v) {
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
					acc[k] = this[k];
					return acc;
				}, {})
			};
		},
	};
	Object.defineProperty(newChain, 'add', { enumerable: false, writable: false, value: newChain.add });
	Object.defineProperty(newChain, 'inherit', { enumerable: false, writable: false, value: newChain.inherit });
	Object.defineProperty(newChain, 'remove', { enumerable: false, writable: false, value: newChain.remove });
	Object.defineProperty(newChain, 'render', { enumerable: false, writable: false, value: newChain.render });
	return newChain
}

