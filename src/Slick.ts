import * as fs from "@std/fs";

import { TemplateManager } from "./managers/TemplateManager.ts";
import { PageManager } from "./managers/PageManager.ts";
import { FileManager } from "./managers/FileManager.ts";
import type { Config } from "./interfaces/Config.ts";
import { Router } from "./server/Router.ts";

const defaultConfig: Config = {
	port: 5000,
	lang: "en",
	alias: new Map([
		["/favicon.ico", "/assets/favicon.ico"],
		["/robots.txt", "/assets/robots.txt"],
	]),
	redirect404: "/",
};

export class Slick {
	private readonly templateManager: TemplateManager;
	private readonly pageManager: PageManager;
	private readonly fileManager: FileManager;
	private readonly config: Config;

	private readonly router: Router;

	constructor(
		private readonly workspace: string,
		userConfig: Partial<Config> = defaultConfig,
	) {
		this.config = Object.assign(defaultConfig, userConfig);

		this.templateManager = new TemplateManager(this.workspace);
		this.pageManager = new PageManager(this.workspace);
		this.fileManager = new FileManager(this.workspace);

		this.router = new Router(
			this.workspace,
			this.config,
			this.templateManager,
			this.pageManager,
			this.fileManager,
		);
	}

	public async start(): Promise<void> {
		this.preventConfigurationErrors();
		await this.templateManager.load();
		await this.pageManager.load();
		this.fileManager.load();

		this.preventErrors();
		this.router.registerRequestListeners();
	}

	private preventConfigurationErrors(): void {
		if (!fs.existsSync(this.workspace)) {
			throw new Error(`The workspace '${this.workspace}' does not exist.`);
		}

		if (!Router.urlRegex.test(this.config.redirect404)) {
			throw new Error(`Invalid redirect 404 url. Please provide a valid format: ${Router.urlRegex}`);
		}

		if (!Object.entries(this.config.alias).every((pair) => pair.every(Router.urlRegex.test))) {
			throw new Error(`Invalid alias url. Please provide a valid format: ${Router.urlRegex}`);
		}

		for (const directory of Router.requiredDirectories) {
			if (!fs.existsSync(`${this.workspace}/${directory}`)) {
				throw new Error(`The directory '${directory}' does not exist.`);
			}
		}
	}

	private preventErrors(): void {
		if (!this.pageManager.getPages().some((page) => page.url == this.config.redirect404)) {
			throw new Error(`The 404 page does not exist.`);
		}

		for (const page of this.pageManager.getPages()) {
			if (Router.staticDirectories.some((directory) => page.url.startsWith(directory))) {
				const directories = Router.staticDirectories.map((d) => `'${d}'`).join(", ");
				throw new Error(`URLs starting with ${directories} are reserved.`);
			}

			if (this.templateManager.getTemplate(page.template) == null) {
				throw new Error(`The template '${page.template}' does not exist.`);
			}
		}
	}
}
