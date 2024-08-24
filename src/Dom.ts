export class Dom {
	constructor(
		private readonly lang: string,
		private readonly template: string,
		private readonly title: string,
		private readonly favicon: string,
		private readonly styles: Array<string>,
		private readonly scripts: Array<string>,
		private readonly templateHead: string,
		private readonly pageHead: string,
		private readonly body: string,
	) {}

	public render(): string {
		return `<!DOCTYPE html>
<html lang="${this.lang}">
    <head>
        ${this.templateHead}
        <title>${this.title}</title>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        ${this.styles.join("\n        ")}
        <link rel="icon shortcut" href="${this.favicon}">
        ${this.pageHead}
    </head>
    <body>
        ${this.body}

        <script type="importmap">
            {
                "imports": {
                    "@webtools/slick-client": "/@webtools/slick-client"
                }
            }
        </script>
        <script src="/@webtools/slick-client" type="module"></script>
        <script type="module">
            import { Slick } from "@webtools/slick-client";

            Slick.initTemplate("${this.template}");
        </script>

        ${this.scripts.join("\n        ")}
    </body>
</html>`;
	}
}
