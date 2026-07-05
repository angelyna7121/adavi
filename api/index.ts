import { createRequire } from "module";

const require = createRequire(import.meta.url);
const server = require("../dist/index.cjs") as {
  default: (req: any, res: any) => any;
  ready?: Promise<void>;
};

const app = server.default;
const ready = server.ready ?? Promise.resolve();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  await ready;
  return app(req, res);
}
