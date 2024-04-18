export type Flatten<T> = T extends number ? T : T extends object ? {
	[K in keyof T]: Flatten<T[K]>;
} : T;
