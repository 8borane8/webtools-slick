import * as Slick from "@webtools/slick";

export default {
    name: "app",

    styles: [
        "/styles/reset.css",
        "/styles/app.css",
    ],
    scripts: [],

    head: <></>,
    body: (req) => (
        <>
            <h1>{Date.now()} - {req.url}</h1>
            <div id="app"></div>
        </>
    ),

    onrequest: null,
} satisfies Slick.Template;
