import * as fs from "@std/fs";

import type { Page } from "../interfaces/Page.ts";

export class PageManager {
	private readonly pages: Array<Page> = [];

	constructor(private readonly workspace: string) {}

	public async load() {
		for (const walkEntry of fs.walkSync(`${this.workspace}/pages`, { includeDirs: false })) {
			const dynamicImport = await import(`file:///${walkEntry.path}`);
			const page: Page = dynamicImport.default;

			this.pages.push(page);
		}
	}

	public getPages(): Array<Page> {
		return this.pages;
	}
}
