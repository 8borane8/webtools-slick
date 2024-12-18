import * as expressapi from "@webtools/expressapi";
import * as preact from "preact-render-to-string";
import * as fs from "@std/fs";

import type { TemplateManager } from "../managers/TemplateManager.ts";
import type { PageManager } from "../managers/PageManager.ts";
import type { FileManager } from "../managers/FileManager.ts";
import type { Config } from "../interfaces/Config.ts";
import type { Page } from "../interfaces/Page.ts";
import { Client } from "./Client.ts";
import { Dom } from "./Dom.ts";

export class Router {
	public static readonly requiredDirectories: Array<string> = ["templates", "scripts", "styles", "assets", "pages"];
	public static readonly staticDirectories: Array<string> = ["/styles", "/scripts", "/assets"];
	public static readonly urlRegex = /^(\/|(?:\/[^\/]+)+)$/;

	private readonly httpServer: expressapi.HttpServer;

	constructor(
		private readonly workspace: string,
		private readonly config: Config,
		private readonly templateManager: TemplateManager,
		private readonly pageManager: PageManager,
		private readonly fileManager: FileManager,
	) {
		this.httpServer = new expressapi.HttpServer(this.config.port);
	}

	public registerRequestListeners(): void {
		for (const page of this.pageManager.getPages()) {
			this.httpServer.get(page.url, (req, res) => this.getRequestListener(req, res, page));
			this.httpServer.post(page.url, (req, res) => this.postRequestListener(req, res, page));
		}

		this.httpServer.get("/@webtools/slick-client", (_req, res) => {
			res.setHeader("Content-Type", "application/javascript");
			res.setHeader("Content-Length", Client.length.toString());
			return res.send(Client);
		});

		this.httpServer.setEndpointNotFoundFunction(this.requestListener.bind(this));
	}

	private async getRequestListener(
		req: expressapi.HttpRequest,
		res: expressapi.HttpResponse,
		page: Page,
	): Promise<Response> {
		const template = this.templateManager.getTemplate(page.template)!;

		const templateOnRequest = template.onrequest == null ? undefined : await template.onrequest(req);
		if (templateOnRequest != undefined) return res.redirect(templateOnRequest);

		const pageOnRequest = page.onrequest == null ? undefined : await page.onrequest(req);
		if (pageOnRequest != undefined) return res.redirect(pageOnRequest);

		const dom = new Dom(this.config, template, page);

		res.setHeader("Content-Type", "text/html");
		return res.send(await dom.render(req, res));
	}

	private async postRequestListener(
		req: expressapi.HttpRequest,
		res: expressapi.HttpResponse,
		page: Page,
	): Promise<Response> {
		const template = this.templateManager.getTemplate(page.template)!;

		const templateOnRequest = template.onrequest == null ? undefined : await template.onrequest(req);
		if (templateOnRequest != undefined) return res.redirect(templateOnRequest);

		const pageOnRequest = page.onrequest == null ? undefined : await page.onrequest(req);
		if (pageOnRequest != undefined) return res.redirect(pageOnRequest);

		return res.json({
			url: req.url,
			title: page.title,
			favicon: page.favicon,

			template: req.body.template == page.template ? null : {
				name: template.name,
				styles: template.styles,
				scripts: template.scripts,
				head: preact.render(template.head instanceof Function ? await template.head(req, res) : template.head),
				body: preact.render(template.body instanceof Function ? await template.body(req, res) : template.body),
			},
			page: {
				styles: page.styles,
				scripts: page.scripts,
				head: preact.render(page.head instanceof Function ? await page.head(req, res) : page.head),
				body: preact.render(page.body instanceof Function ? await page.body(req, res) : page.body),
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

		if (this.config.alias.has(req.url)) return res.redirect(this.config.alias.get(req.url)!);

		if (Router.staticDirectories.some((url) => req.url.startsWith(url))) {
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

		return res.redirect(this.config.redirect404);
	}
}
