import Router from "@koa/router";
import { LightsService } from "../services/lights-service.js";

let lightsSerivce = new LightsService();

export const lightsApi = new Router();

lightsApi
  .get("/v1/__health", async (ctx) => {
    const key = process.env.GOVEE_API_KEY;
    if (!key) {
      return ctx.badRequest({ message: "Missing govee key." });
    }
    return ctx.ok(
      `We gucci brah! Govee key found: ${key.substring(key.length - 4)}`
    );
  })
  .post("/v1/govee", async (ctx) => {
    // Slack challenge
    if (ctx.request.body["challenge"]) {
      return ctx.ok(ctx.request.body["challenge"]);
    }

    // If we don't have an event, let's exit out we don't care
    if (
      !ctx.request.body?.event ||
      ctx.request.body?.event?.subtype !== "bot_message"
    ) {
      return ctx.ok();
    }

    const message = JSON.stringify(ctx.request.body)?.toLowerCase();

    // The meat and potatoes
    await lightsSerivce.setColor(message, "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.setColor(message, "D6:D4:C8:33:34:36:68:36");
    await new Promise((r) => setTimeout(r, 1500));
    await lightsSerivce.setColor("default", "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.setColor("default", "D6:D4:C8:33:34:36:68:36");

    return ctx.ok("status updated.");
  });
