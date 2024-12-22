import * as esbuild from "esbuild";

abstract class Slick {
	private static template: string;
	private static initialized: boolean = false;

	private static title: HTMLTitleElement;
	private static favicon: HTMLLinkElement;
	private static importmap: HTMLScriptElement;

	// deno-lint-ignore ban-types
	private static readonly onloadListeners: Array<Function> = [];

	public static initialize(template: string): void {
		if (Slick.initialized) return;

		Slick.template = template;
		Slick.initialized = true;

		Slick.title = document.querySelector("title")!;
		Slick.favicon = document.querySelector("link[rel='icon shortcut']")!;
		Slick.importmap = document.querySelector("script[type='importmap']")!;

		globalThis.addEventListener("popstate", async (event) => {
			event.preventDefault();
			await Slick.redirect(Slick.getPathFromUrl(new URL(globalThis.location.href)));
		});

		globalThis.addEventListener("DOMContentLoaded", () => Slick.addEventListeners("a"));
	}

	private static getPathFromUrl(url: URL): string {
		return url.pathname + url.search + url.hash;
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
					script.setAttribute("src", `${src}?cacheBust=${Date.now()}`);
					script.setAttribute("slick-type", type);
					script.setAttribute("type", "module");

					script.onload = () => resolve();
					document.body.appendChild(script);
				});
			}),
		);
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
		globalThis.history.pushState({}, "", response.redirected ? response.url : url);

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

		document.querySelector("#app")!.innerHTML = jsonResponse.page.body;

		oldPageStyles.forEach((s) => s.remove());
		Array.from(document.querySelectorAll("script[slick-type='page']")).forEach((s) => s.remove());

		await Slick.loadScripts(jsonResponse.page.scripts, "page");
		Slick.addEventListeners("#app a");

		if (globalThis.location.hash == "") globalThis.scrollTo(0, 0);
		else document.querySelector(globalThis.location.hash)?.scrollIntoView({ behavior: "smooth" });

		Slick.onloadListeners.forEach((fnc) => fnc());
	}

	// deno-lint-ignore ban-types
	public static addOnloadListener(fnc: Function) {
		Slick.onloadListeners.push(fnc);
	}
}

abstract class SlickCookies {
	public static get(cname: string): string {
		const cookies = document.cookie.split("; ").map((cookie) => cookie.split("="));
		return cookies.find(([name]) => name == cname)?.[1] || "";
	}

	public static set(cname: string, cvalue: string, exdays: number = 14) {
		const date = new Date();
		date.setTime(date.getTime() + exdays * 24 * 60 * 60 * 1000);
		document.cookie = `${cname}=${cvalue}; expires=${date.toUTCString()}; path=/; secure; SameSite=Lax;`;
	}

	public static delete(cname: string) {
		document.cookie = `${cname}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;`;
	}
}

const rawCode = [Slick, SlickCookies].map((fnc) => `export ${fnc.toString()}`).join("");
export const Client = esbuild.transformSync(rawCode, {
	loader: "ts",
	format: "esm",
	minify: true,
	target: "es2017",
}).code;
