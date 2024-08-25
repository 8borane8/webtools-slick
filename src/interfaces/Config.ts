export interface Config {
	readonly port: number;
	readonly lang: string;
	readonly alias: Map<string, string>;
	readonly redirect404: string;
}
