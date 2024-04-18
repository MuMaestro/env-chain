import { config } from 'dotenv';
import { addPropertyToObject } from './addPropertyToObject';

export function envChain(options: Parameters<typeof config>[0] = {
	path: '.env',
}): Chainable {
	config(options);
	const newChain: Chainable<{}> = {
		add(key, value) {
			let internalValue = undefined as typeof value | undefined;
			return addPropertyToObject(this, key, {
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
			return addPropertyToObject(this, key, {
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
	return newChain;
}
