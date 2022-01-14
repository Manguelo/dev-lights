import axios from "axios";

const client = axios.create({
  baseURL: "https://developer-api.govee.com/v1",
  headers: {
    "Govee-API-Key": process.env.GOVEE_API_KEY,
  },
});

export class LightsService {
  async setColor(message, device) {
    // If we don't have any status exit out
    if (
      !message?.includes("fail") &&
      !message?.includes("deploy") &&
      !message?.includes("succe")
    ) {
      return;
    }

    // Colors
    const failure = {
      r: 255,
      g: 87,
      b: 51,
    };
    const success = {
      r: 51,
      g: 255,
      b: 87,
    };
    const deploying = {
      r: 51,
      g: 158,
      b: 255,
    };

    // The meat and potatoes
    await client.put("/devices/control", {
      device: device,
      model: "H6072",
      cmd: {
        name: "color",
        value: message.includes("fail")
          ? failure
          : message.includes("succe")
          ? success
          : deploying,
      },
    });
  }
}
