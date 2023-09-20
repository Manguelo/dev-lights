import Router from "@koa/router";
import { Subject, switchMap } from "rxjs";
import { LightsService } from "../services/lights-service.js";
import {
  Cancellation,
  createCancellationTokenSource,
} from "../utils/cancellation.js";
import { withCancellation } from "../utils/rxjs-util.js";

// Service to contact Lifx API
let lightsSerivce = new LightsService();

// Router
export const lightsApi = new Router();

// Queue to handle multiple requests to our devices
const queue = new Subject();
queue
  .pipe(
    switchMap((message) => withCancellation((ct) => updateLights(message, ct)))
  )
  .subscribe();

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
  .post("/v1/button", async (ctx) => {
    // Slack challenge
    if (ctx.request.body["challenge"]) {
      return ctx.ok(ctx.request.body["challenge"]);
    }

    const message = JSON.stringify(ctx.request.body)?.toLowerCase();

    if (message?.includes("say:")) {
      console.log(message);
      return ctx.ok();
    }

    if (
      (!ctx.request.body?.event ||
        ctx.request.body?.event?.subtype !== "bot_message") &&
      !message?.includes("super_secret_override:")
    ) {
      return ctx.ok();
    }

    queue.next(message);

    return ctx.ok({ message: "Status updated." });
  });

/**
 * Runs the lights animation for all devices.
 *
 * @param {*} message
 * @param {*} ct
 */
async function updateLights(message, ct) {
  try {
    // LIFX
    await alertLifx(message, ct);
  } catch (ex) {
    if (ex instanceof Cancellation) {
      console.log("cancelling request...");
    } else {
      console.error(ex);
    }
  }
}

/**
 * Alerts all LIFX devices.
 *
 * @param {*} message
 * @param {*} ct
 */
async function alertLifx(message, ct) {
  await Promise.all([
    await lightsSerivce.disableEffects(ct),
    await lightsSerivce.breatheEffectLifx(message, ct),
    await ct.race(new Promise((r) => setTimeout(r, 5000))), // Set timeout to 15s if govee lights are enabled
    await lightsSerivce.setColorLifx(message, ct),
  ]);
}
