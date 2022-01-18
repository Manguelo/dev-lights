import axios from "axios";

const client = axios.create({
  baseURL: "https://developer-api.govee.com/v1",
  headers: {
    "Govee-API-Key": process.env.GOVEE_API_KEY,
  },
});

export class LightsService {
  errorKeywords = [
    "fail",
    "is down",
    "error",
    "less than threshold",
    "greater than threshold",
  ];
  successKeywords = [
    "pass",
    "is up",
    "succe",
    "no longer greater than",
    "no longer less than",
  ];
  pendingKeywords = ["deploy"];

  async setColor(message, device) {
    const color = this.getColorForMessage(message);

    // If we don't have any status exit out
    if (!color) {
      return;
    }

    // The meat and potatoes
    await client.put("/devices/control", {
      device: device,
      model: "H6072",
      cmd: {
        name: "color",
        value: color,
      },
    });
  }

  async toggleDevice(isOn, device) {
    if (typeof isOn !== "boolean") {
      return;
    }

    await client.put("/devices/control", {
      device: device,
      model: "H6072",
      cmd: {
        name: "turn",
        value: isOn ? "on" : "off",
      },
    });
  }

  getColorForMessage(message) {
    const isFail = this.errorKeywords.some((s) => message?.includes(s));
    const isPass = this.successKeywords.some((s) => message?.includes(s));
    const isPending = this.pendingKeywords.some((s) => message?.includes(s));
    const isIdle = message?.includes("default");

    if (!isFail && !isPass && !isPending && !idle) {
      return;
    }

    // Colors
    const fail = {
      r: 255,
      g: 87,
      b: 51,
    };
    const idle = {
      r: 178,
      g: 77,
      b: 250,
    };
    const pass = {
      r: 51,
      g: 255,
      b: 87,
    };
    const pending = {
      r: 51,
      g: 158,
      b: 255,
    };

    return isPass ? pass : isFail ? fail : isPending ? pending : idle;
  }
}
