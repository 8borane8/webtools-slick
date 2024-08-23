import type * as expressapi from "@webtools/expressapi";
import * as esbuild from "esbuild";
import * as fs from "@std/fs";

import type { CachedFile } from "../interfaces/CachedFile.ts";

export class FileManager {
	private readonly cachedFiles: Map<string, CachedFile> = new Map();

	constructor(private readonly workspace: string) {}

	public async load() {
		for (const walkEntry of fs.walkSync(`${this.workspace}/scripts`, { includeDirs: false })) {
			const ext = walkEntry.name.split(".").at(-1);
			if (ext != "js" && ext != "ts") {
				continue;
			}

			const output = await esbuild.transform(Deno.readTextFileSync(walkEntry.path), {
				loader: ext,
				format: "esm",
				minify: true,
			});

			this.cachedFiles.set(walkEntry.path.slice(this.workspace.length).replaceAll("\\", "/"), {
				content: output.code,
				mimeType: "application/javascript",
				timestamp: Date.now(),
			});
		}
	}

	public serveFile(req: expressapi.HttpRequest, res: expressapi.HttpResponse) {
		if (this.cachedFiles.has(req.url)) {
			const cachedFile = this.cachedFiles.get(req.url);

			res.setHeader("Content-Type", cachedFile?.mimeType || "");
			res.setHeader("Content-Length", (cachedFile?.content || "").length.toString());
			return res.send(cachedFile?.content || "");
		}

		return res.sendFile(this.workspace + req.url);
	}
}
