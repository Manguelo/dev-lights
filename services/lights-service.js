import axios from "axios";
import { Octokit } from "octokit";
import {
  getColorForMessage,
  getHexColorForMessage,
  getSceneForMessage,
  shouldDisplayPendingAction,
} from "../utils/color-util.js";

const goveeClient = axios.create({
  baseURL: "https://developer-api.govee.com/v1",
  headers: {
    "Govee-API-Key": process.env.GOVEE_API_KEY,
  },
});

const lifxClient = axios.create({
  baseURL: "https://api.lifx.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.LIFX_API_KEY}`,
  },
});

const octokit = new Octokit({ auth: process.env.GITHUB_PAT });

export class LightsService {
  /**
   * Sets the color for a `deviceId` based on the apssed `message`.
   *
   * @param {*} message
   * @param {*} deviceId
   * @param {*} shouldSetIdle
   * @param {*} ct
   * @returns
   */
  async setColorGovee(message, deviceId, shouldSetIdle, ct) {
    ct.throwIfCancelled();

    const color = getColorForMessage(message, shouldSetIdle);

    if (!color) {
      return;
    }

    await goveeClient.put("/devices/control", {
      device: deviceId,
      model: "H6072",
      cmd: {
        name: "color",
        value: color,
      },
    });
  }

  /**
   * Turns the passed `deviceId` on/off.
   *
   * @param {*} isOn
   * @param {*} deviceId
   * @param {*} ct
   * @returns
   */
  async toggleDeviceGovee(isOn, deviceId, ct) {
    ct.throwIfCancelled();

    if (typeof isOn !== "boolean") {
      return;
    }

    await goveeClient.put("/devices/control", {
      device: deviceId,
      model: "H6072",
      cmd: {
        name: "turn",
        value: isOn ? "on" : "off",
      },
    });
  }

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
      cycles: 5,
      color: color,
      from_color: "#111111",
      power_on: true,
      persist: false,
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
    });
  }

  /**
   * Disables all effects.
   *
   * @param {*} ct
   */
  async disableEffects(ct) {
    ct.throwIfCancelled();

    await lifxClient.post("/lights/all/effects/off");
  }

  /**
   * Updates a log file on GitHub to display ammount of errors in a single day.
   * The log file will be reset if it is a new day.
   *
   * @param {*} ct
   */
  async updateGitHubErrors(ct) {
    ct.throwIfCancelled();

    let logs = await octokit.rest.repos.getContent({
      owner: "manguelo",
      repo: process.env.LOGS_REPO,
      path: "logs.json",
    });

    let content = JSON.parse(
      Buffer.from(logs.data.content, "base64").toString("ascii")
    );
    let currentTime = new Date(Date.now());
    let lastModified = new Date(Date.parse(content.last_modified));
    var reset = currentTime.getDate() > lastModified.getDate();

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: "Manguelo",
      repo: process.env.LOGS_REPO,
      path: "logs.json",
      message: "Update logs",
      sha: logs.data.sha,
      content: Buffer.from(
        `{"errors": ${
          reset ? 1 : content.errors + 1
        }, "last_modified": "${currentTime.toISOString()}"}`
      ).toString("base64"),
    });
  }
}
