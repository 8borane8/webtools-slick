import * as esbuild from "esbuild";

const client = `export abstract class Slick {
	private static title: HTMLTitleElement = document.querySelector("title")!;
	private static favicon: HTMLLinkElement = document.querySelector("link[rel='icon shortcut']")!;
	private static importmap: HTMLScriptElement = document.querySelector("script[type='importmap']")!;

	// deno-lint-ignore ban-types
	private static readonly onloadListeners: Array<Function> = [];
	private static template: string | null = null;

	static {
		globalThis.addEventListener("popstate", async (event: PopStateEvent) => {
			event.preventDefault();
			await Slick.redirect(Slick.getPathFromUrl(new URL(globalThis.location.href)));
		});

		globalThis.addEventListener("DOMContentLoaded", () => Slick.addEventListeners("a"));
	}

	private static getPathFromUrl(url: URL): string {
		return url.pathname + url.hash + url.search;
	}

	private static addEventListeners(selector: string): void {
		for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>(selector))) {
			link.addEventListener("click", async (event) => {
				if (!["", "_self"].includes(link.getAttribute("target") || "")) return;

				const url = new URL(link.href);
				if (globalThis.location.host != url.host) return;

				event.preventDefault();
				await Slick.redirect(Slick.getPathFromUrl(url));
			});
		}

		Slick.onloadListeners.forEach((fnc) => fnc());
	}

	private static async loadStyles(styles: string[], type: string): Promise<void> {
		await Promise.all(
			styles.map((href) => {
				return new Promise<void>((resolve) => {
					const style = document.createElement("link");
					style.setAttribute("rel", "stylesheet");
					style.setAttribute("slick-type", type);
					style.setAttribute("href", href);

					style.onload = () => resolve();
					if (Slick.favicon != null) Slick.favicon.insertAdjacentElement("beforebegin", style);
				});
			}),
		);
	}

	private static async loadScripts(scripts: string[], type: string): Promise<void> {
		await Promise.all(
			scripts.map((src) => {
				return new Promise<void>((resolve) => {
					const script = document.createElement("script");
					script.setAttribute("src", \`\${src}?cacheBust=\${Date.now()}\`);
					script.setAttribute("slick-type", type);
					script.setAttribute("type", "module");

					script.onload = () => resolve();
					document.body.appendChild(script);
				});
			}),
		);
	}

	public static initTemplate(name: string) {
		if (this.template == null) this.template = name;
	}

	public static async redirect(url: string, reload: boolean = false): Promise<void> {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				template: reload ? null : Slick.template,
			}),
		});

		const jsonResponse = await response.json();

		if (response.redirected) globalThis.history.pushState({}, "", response.url);
		else globalThis.history.pushState({}, "", url);

		Slick.title.innerHTML = jsonResponse.title;
		Slick.favicon.href = jsonResponse.favicon;

		const headChildren = Array.from(document.head.children);

		if (jsonResponse.template != null) {
			Slick.template = jsonResponse.template.name;

			headChildren.slice(0, headChildren.indexOf(Slick.title)).forEach((e) => e.remove());
			Slick.title.insertAdjacentHTML("beforebegin", jsonResponse.template.head);

			const oldTemplateStyles = document.querySelectorAll("link[rel='stylesheet'][slick-type='template']");
			await Slick.loadStyles(jsonResponse.template.styles, "template");

			const bodyChildren = Array.from(document.body.children);
			bodyChildren.slice(0, bodyChildren.indexOf(Slick.importmap)).forEach((e) => e.remove());
			Slick.importmap.insertAdjacentHTML("beforebegin", jsonResponse.template.body);

			oldTemplateStyles.forEach((s) => s.remove());
			Array.from(document.querySelectorAll("script[slick-type='template']")).forEach((s) => s.remove());

			await Slick.loadScripts(jsonResponse.template.scripts, "template");
			Slick.addEventListeners("a");
		}

		headChildren.slice(headChildren.indexOf(Slick.favicon) + 1).forEach((e) => e.remove());
		Slick.favicon.insertAdjacentHTML("afterend", jsonResponse.page.head);

		const oldPageStyles = document.querySelectorAll("link[rel='stylesheet'][slick-type='page']");
		await Slick.loadStyles(jsonResponse.page.styles, "page");

		const app = document.querySelector("#app");
		if (app != null) app.innerHTML = jsonResponse.page.body;

		oldPageStyles.forEach((s) => s.remove());
		Array.from(document.querySelectorAll("script[slick-type='page']")).forEach((s) => s.remove());

		await Slick.loadScripts(jsonResponse.page.scripts, "page");
		Slick.addEventListeners("#app a");

		if (globalThis.location.hash == "") globalThis.scrollTo(0, 0);
		else document.getElementById(globalThis.location.hash.substring(1))?.scrollIntoView({ behavior: "smooth" });
	}

	// deno-lint-ignore ban-types
	public static addOnloadListener(fnc: Function) {
		Slick.onloadListeners.push(fnc);
	}
}

export abstract class SlickCookies {
	public static get(cname: string): string {
		const cookies = decodeURIComponent(document.cookie).split("; ");
		for (const cookie of cookies) {
			if (cookie.startsWith(\`\${cname}=\`)) {
				return cookie.substring(cname.length + 1);
			}
		}
		return "";
	}

	public static set(cname: string, cvalue: string, exdays: number = 14) {
		const date = new Date();
		date.setTime(date.getTime() + exdays * 24 * 60 * 60 * 1000);
		document.cookie = \`\${cname}=\${cvalue}; expires=\${date.toUTCString()}; path=/; secure; SameSite=Strict;\`;
	}

	public static delete(cname: string) {
		document.cookie = \`\${cname}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;\`;
	}
}`;

export const Client = esbuild.transformSync(client, {
	loader: "ts",
	format: "esm",
	minify: true,
}).code;
