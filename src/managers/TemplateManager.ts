import * as fs from "@std/fs";

import type { Template } from "../interfaces/Template.ts";

export class TemplateManager {
	private readonly templates: Array<Template> = [];

	constructor(private readonly workspace: string) {}

	public async load() {
		for (const walkEntry of fs.walkSync(`${this.workspace}/templates`, { includeDirs: false })) {
			const dynamicImport = await import(`file:///${walkEntry.path}`);
			const template: Template = dynamicImport.default;

			this.templates.push(template);
		}
	}

	public getTemplate(name: string): Template | null {
		return this.templates.find((template) => template.name == name) || null;
	}
}
