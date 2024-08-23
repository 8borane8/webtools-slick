export abstract class Slick {
    // deno-lint-ignore ban-types
    private static readonly onloadListeners: Array<Function> = [];

    static {
        globalThis.addEventListener("popstate", async (event: PopStateEvent) => {
            event.preventDefault();

            await Slick.redirect(Slick.getPathFromUrl(new URL(globalThis.location.href)));
        });

        document.addEventListener("DOMContentLoaded", () => Slick.addEventListeners("a"));
    }

    private static getPathFromUrl(url: URL): string {
        return url.pathname + url.hash + url.search;
    }

    private static addEventListeners(selector: string): void {
        for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>(selector))) {
            link.addEventListener("click", async (event) => {
                if (!["", "_self"].includes(link.getAttribute("target") || "")) {
                    return;
                }

                const url = new URL(link.href);
                if (window.location.host != url.host) {
                    return;
                }

                event.preventDefault();
                await Slick.redirect(Slick.getPathFromUrl(url));
            });
        }

        Slick.onloadListeners.forEach((fnc) => fnc());
    }

    public static async redirect(url: string, reload: boolean = false): Promise<void> {
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
            if (cookie.startsWith(`${cname}=`)) {
                return cookie.substring(cname.length + 1);
            }
        }
        return "";
    }

    public static set(cname: string, cvalue: string, exdays: number = 14) {
        const date = new Date();
        date.setTime(date.getTime() + exdays * 24 * 60 * 60 * 1000);
        document.cookie = `${cname}=${cvalue}; expires=${date.toUTCString()}; path=/; secure; SameSite=None;`;
    }

    public static delete(cname: string) {
        document.cookie = `${cname}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/; secure; SameSite=None;`;
    }
}
