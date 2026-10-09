import {
  Fill,
  Frame,
  linear,
  slide,
  ClipSeries,
  getVideoConfig,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";

function Title({ text, background }: { text: string; background: string }) {
  // Runs once. Read the config here; compute frame values in updaters.
  const { durationInFrames } = getVideoConfig();
  return (
    <Fill style={{ justifyContent: "center", alignItems: "center", background }}>
      <Frame
        as="h1"
        style={(frame) => ({
          margin: 0,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          fontSize: 120,
          opacity: Math.min(1, frame / 15),
        })}
        text={(frame) => `${text} ${durationInFrames - frame}`}
      />
    </Fill>
  );
}

export function Video() {
  return (
    <ClipSeries>
      <ClipSeries.Clip durationInFrames={90}>
        <Title text="Hello" background="#1d4ed8" />
      </ClipSeries.Clip>
      <ClipSeries.Transition
        timing={linear({ durationInFrames: 20 })}
        presentation={slide({ direction: "from-right" })}
      />
      <ClipSeries.Clip durationInFrames={90}>
        <Title text="World" background="#be123c" />
      </ClipSeries.Clip>
    </ClipSeries>
  );
}
