import type { Flatten } from "./Flatten";
import type { AddType } from "./AddType";
import type { InheritType } from "./InheritType";
import type { RemoveType } from "./RemoveType";
import type { RenderType } from "./RenderType";

export type ChainableOpts<Acc = {}> = {
	readonly add: AddType<Acc>;
	readonly inherit: InheritType<Acc>;
	readonly remove: RemoveType<Acc>;
	readonly render: RenderType<Acc>;
};

export type AccWithoutChainOpts<Acc> = Omit<Flatten<Acc>, keyof ChainableOpts<Flatten<Acc>>>;
export type Chainable<Acc = {}> = AccWithoutChainOpts<Acc> & ChainableOpts<Acc>;
