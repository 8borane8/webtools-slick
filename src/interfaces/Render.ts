import type * as expressapi from "@webtools/expressapi";
import type { JSX } from "preact/jsx-runtime";

export type Render = (req: expressapi.HttpRequest, res: expressapi.HttpResponse) => Promise<JSX.Element> | JSX.Element;
