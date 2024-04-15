import { DotenvConfigOptions, config } from 'dotenv';

type Flatten<T> =
	T extends number
	? T
	: T extends object
	? { [K in keyof T]: Flatten<T[K]> }
	: T;
// export type Simplify<T> = {[KeyType in keyof T]: T[KeyType]} & {};
type IfUndefinedAddString<T> = T extends undefined ? string | T : T;

type NewChain<Acc, K extends string, V> =
	K extends keyof Acc
	? Chainable<Acc & { [k in K]: Acc[k] | IfUndefinedAddString<V> }>
	: Chainable<Acc & { [k in K]: IfUndefinedAddString<V> }>;

type ChainableOpts<Acc = {}> = {
	add: <K extends string, V
		extends string | ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => any)
	>(key: K, value?: V) => Chainable<Acc & {
		[k in K]: V extends ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => infer R) ? R : V | string;
	}>;
	inherit: <K extends string, V extends keyof Acc>(key: K, from: V) => Chainable<Acc & {
		[k in K]: Acc[V];
	}>;
	remove: <K extends keyof Acc>(key: K) => Chainable<Omit<Acc, K>>;
	render: () => Flatten<Acc>;
};

type AccWithoutChainOpts<Acc> = Omit<Flatten<Acc>, keyof ChainableOpts<Flatten<Acc>>>;

type Chainable<Acc = {}> = AccWithoutChainOpts<Acc> & ChainableOpts<Acc>

function removeChainOpts<Acc>(chain: Acc): AccWithoutChainOpts<Acc> {
	return Object.keys(chain as any).reduce((acc, k) => {
		const descriptor = Object.getOwnPropertyDescriptor(chain, k);
		if (!descriptor || (descriptor.value !== undefined)) {
			return acc;
		}
		return {
			...acc,
			[k]: chain[k]
		};
	}, {} as any);
}


export function envChain(options?: DotenvConfigOptions): Chainable {
	const r = config({
		path: '.env',
		...options,
	})
	console.log(r);
	return {
		add(key, value) {
			let internalValue = value;
			return {
				...this,
				get [key]() {
					return typeof internalValue === 'function' ? internalValue(process.env[key], removeChainOpts(this)) :  process.env[key] ?? internalValue;
				},
				set [key](v: typeof internalValue) {
					internalValue = v;
				}
			}
		},
		inherit(key, from) {
			return {
				...this,
				get [key]() {
					return this[from];
				},
				set [key](v) {
					throw new Error('Cannot set inherited value');
				}
			}
		},
		remove(key) {
			const validKeys = Object.keys(this).filter(k => {
				if (k === key) {
					return false;
				}
				const descriptor = Object.getOwnPropertyDescriptor(this, k);
				if (!descriptor || (descriptor.value === undefined && descriptor.set === undefined)) {
					return false;
				}
				return true;
			});
			return {
				...this,
				...validKeys.reduce((acc, k) => {
					acc[k] = this[k];
					return acc;
				}, {} as any)
			};
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
	}
}

