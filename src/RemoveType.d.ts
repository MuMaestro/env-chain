type RemoveType<Acc> = <K extends keyof Acc>(key: K) => Chainable<Flatten<Omit<Acc, K>>>;
