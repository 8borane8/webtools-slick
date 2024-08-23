import type * as expressapi from "@webtools/expressapi";

export type OnRequest = (req: expressapi.HttpRequest) => Promise<string | void> | string | void;
