type ChainableOpts<Acc = {}> = {
	readonly add: AddType<Acc>;
	readonly inherit: InheritType<Acc>;
	readonly remove: RemoveType<Acc>;
	readonly render: RenderType<Acc>;
};

type AccWithoutChainOpts<Acc> = Omit<Flatten<Acc>, keyof ChainableOpts<Flatten<Acc>>>;
type Chainable<Acc = {}> = AccWithoutChainOpts<Acc> & ChainableOpts<Acc>;
