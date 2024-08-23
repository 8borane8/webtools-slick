import type { OnRequest } from "./OnRequest.ts";
import type { Render } from "./Render.ts";
import type { JSX } from "preact/jsx-runtime";

export interface Page {
	readonly url: string;
	readonly template: string;

	readonly title: string;
	readonly favicon: string;

	readonly styles: Array<string>;
	readonly scripts: Array<string>;

	readonly head: Render | JSX.Element;
	readonly body: Render | JSX.Element;

	readonly onrequest: OnRequest | null;
}
