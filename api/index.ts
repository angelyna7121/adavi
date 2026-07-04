import app, { ready } from "../server/index";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  await ready;
  return app(req, res);
}
