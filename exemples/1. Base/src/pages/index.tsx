import type * as Slick from "@webtools/slick";

export default {
	url: "/",
	template: "app",

	title: "Index",
	favicon: "/favicon.ico",

	styles: [
		"/styles/app/index.css",
	],
	scripts: [],

	head: <></>,
	body: (
		<>
			<p>Index</p>
		</>
	),

	onrequest: null,
} satisfies Slick.Page;
