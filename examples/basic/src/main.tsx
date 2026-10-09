import { mountComposition, registerClock } from "@inurun/vite-plugin-hyperframes-jsx/runtime";
import { Video } from "./video";

const COMPOSITION_ID = "main";

const stage = document.querySelector<HTMLElement>(`[data-composition-id="${COMPOSITION_ID}"]`)!;
const fps = Number(stage.dataset["fps"]);
const config = {
  fps,
  width: Number(stage.dataset["width"]),
  height: Number(stage.dataset["height"]),
  durationInFrames: Math.round(Number(stage.dataset["duration"]) * fps),
};

const composition = await mountComposition(<Video />, stage, config);
registerClock(COMPOSITION_ID, composition);
