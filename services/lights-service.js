import axios from "axios";
import { Octokit } from "octokit";
import {
  getColorForMessage,
  getHexColorForMessage,
  getSceneForMessage,
  shouldDisplayPendingAction,
} from "../utils/color-util.js";

const lifxClient = axios.create({
  baseURL: "https://api.lifx.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.LIFX_API_KEY}`,
  },
});

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

export class LightsService {
  /**
   * Sets the static light color for a message.
   * If a message is considered pending an action, the move effect with be applied.
   *
   * @param {*} message
   * @param {*} ct
   */
  async setColorLifx(message, ct) {
    ct.throwIfCancelled();

    const sceneName = getSceneForMessage(message);

    let scenes = await lifxClient.get("/scenes");
    let scene = scenes.data.find((v) => v.name == sceneName);

    await lifxClient.put(`/scenes/scene_id:${scene.uuid}/activate`);

    if (shouldDisplayPendingAction(message)) {
      await this.moveEffectLifx(ct);
    }
  }

  /**
   * Applies the breathe effect for 5 cyles.
   *
   * @param {*} message
   * @param {*} ct
   * @returns
   */
  async breatheEffectLifx(message, ct) {
    ct.throwIfCancelled();

    const color = getHexColorForMessage(message, false);

    if (!color) {
      return;
    }

    await lifxClient.post("/lights/all/effects/breathe", {
      period: 3,
      cycles: 3,
      color: color,
      from_color: "#111111",
      power_on: true,
      persist: false,
      selector: "all",
    });
  }

  /**
   * Applies the move effect infinitely with a period of 10 seconds.
   *
   * @param {*} message
   * @param {*} ct
   */
  async moveEffectLifx(ct) {
    ct.throwIfCancelled();

    await lifxClient.post("/lights/all/effects/move", {
      period: 10,
      selector: "all",
    });
  }

  /**
   * Disables all effects.
   *
   * @param {*} ct
   */
  async disableEffects(ct) {
    ct.throwIfCancelled();

    await lifxClient.post("/lights/all/effects/off", {
      selector: "all",
    });
  }
}
