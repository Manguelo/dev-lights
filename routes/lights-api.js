import Router from "@koa/router";
import { Subject, switchMap } from "rxjs";
import { LightsService } from "../services/lights-service.js";
import { Cancellation } from "../utils/cancellation.js";
import { withCancellation } from "../utils/rxjs-util.js";
import { isFail } from "../utils/color-util.js";

// Service to contact Govee API
let lightsSerivce = new LightsService();

// Router
export const lightsApi = new Router();

// Queue to handle multiple requests to our devices
const devices = ["2D:7F:D1:33:34:36:59:25", "D6:D4:C8:33:34:36:68:36"];
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
  .post("/v1/govee", async (ctx) => {
    // Slack challenge
    if (ctx.request.body["challenge"]) {
      return ctx.ok(ctx.request.body["challenge"]);
    }

    const message = JSON.stringify(ctx.request.body)?.toLowerCase();

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
    // Govee
    // await alertGovee(message, false, ct);

    // LIFX
    await alertLifx(message, ct);

    // Set Govee idle
    // await alertGovee(message, true, ct);

    // Update logs
    if (isFail(message)) {
      await lightsSerivce.updateGitHubErrors(ct);
    }
  } catch (ex) {
    if (ex instanceof Cancellation) {
      console.log("cancelling request...");
    } else {
      console.error(ex);
    }
  }
}

/**
 * Sets the color for a specified message.
 * `shouldSetIdle` will set the lights to their default color
 * as long as the message `isPass`.
 *
 * @param {*} message
 * @param {*} shouldSetIdle
 * @param {*} ct
 */
async function alertGovee(message, shouldSetIdle, ct) {
  await Promise.all(
    devices.map(async (id) => {
      await lightsSerivce.setColorGovee(message, id, shouldSetIdle, ct);
    })
  );
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
    await ct.race(new Promise((r) => setTimeout(r, 13000))), // Set timeout to 15s if govee lights are enabled
    await lightsSerivce.setColorLifx(message, ct),
  ]);
}

/**
 * Flashes all govee devices once.
 *
 * @param {*} ct
 */
// async function flash(ct) {
//   await Promise.all(
//     devices.map(async (id) => {
//       await lightsSerivce.toggleDeviceGovee(false, id, ct);
//       await ct.race(new Promise((r) => setTimeout(r, 1500)));
//       await lightsSerivce.toggleDeviceGovee(true, id, ct);
//       await ct.race(new Promise((r) => setTimeout(r, 1500)));
//     })
//   );
// }
