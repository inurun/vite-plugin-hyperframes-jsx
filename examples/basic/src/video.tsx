import { Clip, getClipTiming } from "@inurun/vite-plugin-hyperframes-jsx/runtime";

/** Seconds the two scenes overlap while the second one slides in. */
const TRANSITION = 2 / 3;

function Scene(props: { text: string; background: string; enter?: boolean; exit?: boolean }) {
  // Runs once, while the tree mounts: the clip's absolute timing, in seconds.
  const { start, duration } = getClipTiming();
  const slideOut = (el: HTMLDivElement) =>
    // Web Animations run on the composition clock, so the delay is absolute.
    el.animate([{ transform: "translateX(0%)" }, { transform: "translateX(-100%)" }], {
      delay: (start + duration - TRANSITION) * 1000,
      duration: TRANSITION * 1000,
      easing: "linear",
      fill: "both",
    });
  return (
    <div
      className={props.enter ? "scene slide-in" : "scene"}
      style={{ background: props.background, "--transition": `${TRANSITION}s` }}
      ref={props.exit ? slideOut : undefined}
    >
      <h1 className="title">{props.text}</h1>
    </div>
  );
}

export function Video() {
  return (
    <>
      <Clip start={0} duration={3}>
        <Scene text="Hello" background="#1d4ed8" exit />
      </Clip>
      <Clip start={3 - TRANSITION} duration={3}>
        <Scene text="World" background="#be123c" enter />
      </Clip>
    </>
  );
}
