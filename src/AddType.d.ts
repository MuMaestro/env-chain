type AddType<Acc> = <
	K extends string,
	V extends string | ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => any)
>(key: K, value?: V) => Chainable<
	Flatten<
		(K extends keyof Acc ? Omit<Acc, K> : Acc) & {
			[k in K]: V extends ((v: string | undefined, ctx: AccWithoutChainOpts<Acc>) => infer R) ? R : V | string;
		}
	>
>;
