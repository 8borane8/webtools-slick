import * as expressapi from "@webtools/expressapi";
import * as preact from "preact-render-to-string";
import * as esbuild from "esbuild";
import * as fs from "@std/fs";

import { TemplateManager } from "./managers/TemplateManager.ts";
import { PageManager } from "./managers/PageManager.ts";
import { FileManager } from "./managers/FileManager.ts";
import type { Page } from "./interfaces/Page.ts";
import { Dom } from "./Dom.ts";

export class Slick {
	private static readonly requiredDirectories: Array<string> = ["templates", "scripts", "styles", "assets", "pages"];
	private static readonly staticDirectories: Array<string> = ["/styles", "/scripts", "/assets"];
	private static readonly appRegex = /(<[^>]*id\s*=\s*['"]app['"][^>]*>).*?(<\/[^>]*>)/s;
	private static readonly urlRegex = /^(\/|(?:\/[^\/]+)+)$/;

	private readonly httpServer: expressapi.HttpServer;
	private readonly templateManager: TemplateManager;
	private readonly pageManager: PageManager;
	private readonly fileManager: FileManager;

	private client = Deno.readTextFileSync(`${import.meta.dirname}/Client.ts`);

	constructor(
		private readonly workspace: string,
		port = 5000,
		private readonly lang = "fr",
		private readonly alias = new Map([
			["/favicon.ico", "/assets/favicon.ico"],
			["/robots.txt", "/assets/robots.txt"],
		]),
		private readonly redirect404 = "/",
	) {
		this.httpServer = new expressapi.HttpServer(port);
		this.templateManager = new TemplateManager(workspace);
		this.pageManager = new PageManager(workspace);
		this.fileManager = new FileManager(workspace);
	}

	public async start() {
		this.client = (await esbuild.transform(this.client, {
			loader: "ts",
			format: "esm",
		})).code;

		this.preventConfigurationErrors();

		await this.templateManager.load();
		await this.pageManager.load();
		await this.fileManager.load();

		this.preventErrors();
		this.registerRequestListeners();
	}

	private preventConfigurationErrors() {
		if (!fs.existsSync(this.workspace)) {
			throw new Error(`The specified workspace does not exist.`);
		}

		if (!Slick.urlRegex.test(this.redirect404)) {
			throw new Error(`Invalid redirect 404 url. Please provide a valid format: ${Slick.urlRegex}`);
		}

		if (!Object.entries(this.alias).every((pair) => pair.every(Slick.urlRegex.test))) {
			throw new Error(`Invalid alias url. Please provide a valid format: ${Slick.urlRegex}`);
		}

		for (const directory of Slick.requiredDirectories) {
			if (!fs.existsSync(`${this.workspace}/${directory}`)) {
				throw new Error(`The directory named '${directory}' does not exist.`);
			}
		}
	}

	private preventErrors() {
		if (!this.pageManager.getPages().some((page) => page.url == this.redirect404)) {
			throw new Error(`The 404 page does not exist.`);
		}

		for (const page of this.pageManager.getPages()) {
			if (Slick.staticDirectories.some((directory) => page.url.startsWith(directory))) {
				throw new Error(
					`URLs starting with ${Slick.staticDirectories.map((d) => `'${d}'`).join(", ")} are reserved.`,
				);
			}

			if (this.templateManager.getTemplate(page.template) == null) {
				throw new Error(`The template '${page.template}' does not exist.`);
			}
		}
	}

	private registerRequestListeners() {
		for (const page of this.pageManager.getPages()) {
			this.httpServer.get(page.url, (req, res) => this.getRequestListener(req, res, page));
			this.httpServer.post(page.url, (req, res) => this.postRequestListener(req, res, page));
		}

		this.httpServer.get("/@webtools/slick-client", (_req, res) => {
			res.setHeader("Content-Type", "application/javascript");
			res.setHeader("Content-Length", this.client.length.toString());
			return res.send(this.client);
		});

		this.httpServer.setEndpointNotFoundFunction(this.requestListener.bind(this));
	}

	private async getRequestListener(
		req: expressapi.HttpRequest,
		res: expressapi.HttpResponse,
		page: Page,
	): Promise<Response> {
		const template = this.templateManager.getTemplate(page.template);
		if (template == null) {
			throw new Error();
		}

		const templateOnRequest = template.onrequest == null ? undefined : await template.onrequest(req);
		if (templateOnRequest != undefined) {
			return res.redirect(templateOnRequest);
		}

		const pageOnRequest = page.onrequest == null ? undefined : await page.onrequest(req);
		if (pageOnRequest != undefined) {
			return res.redirect(pageOnRequest);
		}

		const styles: Array<string> = [
			...template.styles.map((s: string) => `<link rel="stylesheet" href="${s}" slick-type="template">`),
			...page.styles.map((s: string) => `<link rel="stylesheet" href="${s}" slick-type="page">`),
		];

		const scripts: Array<string> = [
			...template.scripts.map((s: string) => `<script src="${s}" type="module" slick-type="template"></script>`),
			...page.scripts.map((s: string) => `<script src="${s}" type="module" slick-type="page"></script>`),
		];

		const templateHead = preact.render(
			typeof template.head == "function" ? await template.head(req, res) : template.head,
		);
		const templateBody = preact.render(
			typeof template.body == "function" ? await template.body(req, res) : template.body,
		);

		const pageHead = preact.render(typeof page.head == "function" ? await page.head(req, res) : page.head);
		const pageBody = preact.render(typeof page.body == "function" ? await page.body(req, res) : page.body);

		const body = templateBody.replace(
			Slick.appRegex,
			(_match: string, p1: string, p2: string) => `${p1}${pageBody}${p2}`,
		);

		const dom = new Dom(
			this.lang,
			page.template,
			page.title,
			page.favicon,
			styles,
			scripts,
			templateHead,
			pageHead,
			body,
		);

		res.setHeader("Content-Type", "text/html; charset=utf-8");
		return res.send(dom.render());
	}

	private async postRequestListener(
		req: expressapi.HttpRequest,
		res: expressapi.HttpResponse,
		page: Page,
	): Promise<Response> {
		const template = this.templateManager.getTemplate(page.template);
		if (template == null) {
			throw new Error();
		}

		const templateOnRequest = template.onrequest == null ? undefined : await template.onrequest(req);
		if (templateOnRequest != undefined) {
			return res.redirect(templateOnRequest);
		}

		const pageOnRequest = page.onrequest == null ? undefined : await page.onrequest(req);
		if (pageOnRequest != undefined) {
			return res.redirect(pageOnRequest);
		}

		return res.json({
			url: req.url,
			title: page.title,
			favicon: page.favicon,

			template: req.body.template == page.template ? null : {
				name: template.name,
				styles: template.styles,
				scripts: template.scripts,
				head: preact.render(
					typeof template.head == "function" ? await template.head(req, res) : template.head,
				),
				body: preact.render(
					typeof template.body == "function" ? await template.body(req, res) : template.body,
				),
			},
			page: {
				styles: page.styles,
				scripts: page.scripts,
				head: preact.render(
					typeof page.head == "function" ? await page.head(req, res) : page.head,
				),
				body: preact.render(
					typeof page.body == "function" ? await page.body(req, res) : page.body,
				),
			},
		});
	}

	private requestListener(req: expressapi.HttpRequest, res: expressapi.HttpResponse): Response {
		if (![expressapi.HttpMethods.GET, expressapi.HttpMethods.POST].includes(req.method)) {
			return res.status(405).json({
				success: false,
				error: "405 Method Not Allowed.",
			});
		}

		if (this.alias.has(req.url)) {
			return res.redirect(this.alias.get(req.url) || "");
		}

		if (Slick.staticDirectories.some((url) => req.url.startsWith(url))) {
			if (req.method == expressapi.HttpMethods.POST) {
				return res.status(404).json({
					success: false,
					error: "405 Method Not Allowed.",
				});
			}

			if (fs.existsSync(this.workspace + req.url) && Deno.statSync(this.workspace + req.url).isFile) {
				return this.fileManager.serveFile(req, res);
			}

			return res.status(404).json({
				success: false,
				error: "404 Not Found.",
			});
		}

		return res.redirect(this.redirect404);
	}
}
