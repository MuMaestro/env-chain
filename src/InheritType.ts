import type { Chainable } from "./Chainable";
import type { Flatten } from "./Flatten";

type InheritConfig = {
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
