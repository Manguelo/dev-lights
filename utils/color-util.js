// Keywords
const errorKeywords = [
  "fail",
  "is down",
  "error",
  "less than threshold",
  "greater than threshold",
];
const successKeywords = [
  "pass",
  "is up",
  "succe",
  "no longer greater than",
  "no longer less than",
];
const pendingKeywords = ["deploy"];

// Colors
const fail = {
  r: 255,
  g: 0,
  b: 0,
};
const pending = {
  r: 174,
  g: 0,
  b: 255,
};
const pass = {
  r: 51,
  g: 255,
  b: 87,
};
const idle = {
  r: 51,
  g: 158,
  b: 255,
};

export function getSceneForMessage(message) {
  const isFail = errorKeywords.some((s) => message?.includes(s));
  const isPass = successKeywords.some((s) => message?.includes(s));
  const isPending = pendingKeywords.some((s) => message?.includes(s));

  if (!isFail && !isPass && !isPending) {
    return;
  }

  return isPass
    ? "Success"
    : isFail
      ? "Failure"
      : "Deploying";
}

export function getColorForMessage(message, shouldSetIdle) {
  const isFail = errorKeywords.some((s) => message?.includes(s));
  const isPass = successKeywords.some((s) => message?.includes(s));
  const isPending = pendingKeywords.some((s) => message?.includes(s));

  if (!isFail && !isPass && !isPending && !shouldSetIdle) {
    return;
  }

  return shouldSetIdle && isPass
    ? idle
    : isPass
      ? pass
      : isFail
        ? fail
        : pending;
}

export function shouldDisplayPendingAction(message) {
  const isFail = errorKeywords.some((s) => message?.includes(s));
  const isPending = pendingKeywords.some((s) => message?.includes(s));

  return isFail || isPending
}

export function getHexColorForMessage(message, shouldSetIdle) {
  const color = getColorForMessage(message, shouldSetIdle)
  return rgbToHex(color.r, color.g, color.b)
}

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
  const hex = x.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}).join('')