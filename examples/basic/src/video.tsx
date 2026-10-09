import {
  AbsoluteFill,
  Frame,
  linearTiming,
  slide,
  TransitionSeries,
  useVideoConfig,
} from "@inurun/vite-plugin-hyperframes-jsx/runtime";

function Title({ text, background }: { text: string; background: string }) {
  // Runs once. Read the config here; compute frame values in updaters.
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background }}>
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
    </AbsoluteFill>
  );
}

export function Video() {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={90}>
        <Title text="Hello" background="#1d4ed8" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: 20 })}
        presentation={slide({ direction: "from-right" })}
      />
      <TransitionSeries.Sequence durationInFrames={90}>
        <Title text="World" background="#be123c" />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
}
