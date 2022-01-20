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

    ctx.res.writeHead(200, { "Content-Type": "application/json" });
    ctx.res.end(JSON.stringify({ all_good: "ok" }));

    // The meat and potatoes
    await lightsSerivce.setColor(message, "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.setColor(message, "D6:D4:C8:33:34:36:68:36");
    await new Promise((r) => setTimeout(r, 1500));

    // Let's flash them!
    await lightsSerivce.toggleDevice(false, "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.toggleDevice(false, "D6:D4:C8:33:34:36:68:36");
    await new Promise((r) => setTimeout(r, 1500));
    await lightsSerivce.toggleDevice(true, "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.toggleDevice(true, "D6:D4:C8:33:34:36:68:36");
    await new Promise((r) => setTimeout(r, 1500));
    await lightsSerivce.toggleDevice(false, "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.toggleDevice(false, "D6:D4:C8:33:34:36:68:36");
    await new Promise((r) => setTimeout(r, 1500));
    await lightsSerivce.toggleDevice(true, "2D:7F:D1:33:34:36:59:25");
    await lightsSerivce.toggleDevice(true, "D6:D4:C8:33:34:36:68:36");
    await new Promise((r) => setTimeout(r, 1500));

    // Set them to idle
    await lightsSerivce.setColor(message, "D6:D4:C8:33:34:36:68:36", true);
    await lightsSerivce.setColor(message, "2D:7F:D1:33:34:36:59:25", true);
  });
