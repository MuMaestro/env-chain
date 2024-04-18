import type { Chainable } from "./Chainable";
import type { Flatten } from "./Flatten";

export type RemoveType<Acc> = <K extends keyof Acc>(key: K) => Chainable<Flatten<Omit<Acc, K>>>;
