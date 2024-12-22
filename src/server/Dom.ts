import type * as expressapi from "@webtools/expressapi";
import * as preact from "preact-render-to-string";

import type { Template } from "../interfaces/Template.ts";
import type { Config } from "../interfaces/Config.ts";
import type { Page } from "../interfaces/Page.ts";

export class Dom {
	private static readonly appRegex = /(<[^>]*id\s*=\s*['"]app['"][^>]*>).*?(<\/[^>]*>)/s;

	constructor(
		private readonly config: Config,
		private readonly template: Template,
		private readonly page: Page,
	) {}

	public async render(
		req: expressapi.HttpRequest,
		res: expressapi.HttpResponse,
	): Promise<string> {
		const styles: Array<string> = [
			...this.template.styles.map((s: string) => `<link rel="stylesheet" href="${s}" slick-type="template">`),
			...this.page.styles.map((s: string) => `<link rel="stylesheet" href="${s}" slick-type="page">`),
		];

		const scripts: Array<string> = [
			...this.template.scripts.map((s: string) =>
				`<script src="${s}" type="module" slick-type="template"></script>`
			),
			...this.page.scripts.map((s: string) => `<script src="${s}" type="module" slick-type="page"></script>`),
		];

		const tHead = preact.render(
			this.template.head instanceof Function ? await this.template.head(req, res) : this.template.head,
		);
		const tBody = preact.render(
			this.template.body instanceof Function ? await this.template.body(req, res) : this.template.body,
		);

		const pHead = preact.render(
			this.page.head instanceof Function ? await this.page.head(req, res) : this.page.head,
		);
		const pBody = preact.render(
			this.page.body instanceof Function ? await this.page.body(req, res) : this.page.body,
		);

		const body = tBody.replace(Dom.appRegex, (_match: string, p1: string, p2: string) => p1 + pBody + p2);

		return `<!DOCTYPE html>
<html lang="${this.config.lang}">
    <head>
        ${tHead}
        <title>${this.page.title}</title>
        <meta charset="UTF-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        ${styles.join("\n        ")}
        <link rel="icon shortcut" href="${this.page.favicon}" type="image/x-icon" />
        ${pHead}
    </head>
    <body>
        ${body}

        <script type="importmap">
            {
                "imports": {
                    "@webtools/slick-client": "/@webtools/slick-client"
                }
            }
        </script>
        <script type="module">
            import { Slick } from "@webtools/slick-client";

            Slick.initialize("${this.template.name}");
        </script>

        ${scripts.join("\n        ")}
    </body>
</html>`;
	}
}
