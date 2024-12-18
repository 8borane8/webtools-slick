import * as path from "@std/path";
import * as fs from "@std/fs";

import type { Page } from "../interfaces/Page.ts";

export class PageManager {
	private readonly pages: Array<Page> = [];

	constructor(private readonly workspace: string) {}

	public async load(): Promise<void> {
		for (const walkEntry of fs.walkSync(`${this.workspace}/pages`, { includeDirs: false })) {
			const dynamicImport = await import(path.toFileUrl(walkEntry.path).toString());
			const page: Page = dynamicImport.default;

			this.pages.push(page);
		}
	}

	public getPages(): Array<Page> {
		return this.pages;
	}
}
