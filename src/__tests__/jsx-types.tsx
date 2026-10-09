// Type tests: checked by `tsc`, never run.
import {
  AbsoluteFill,
  Frame,
  Img,
  Loop,
  Sequence,
  linearTiming,
  slide,
  TransitionSeries,
  type HfNode,
} from "../runtime";

function Title({ text }: { text: string }) {
  return <h1>{text}</h1>;
}

export const valid: HfNode[] = [
  <div
    className="a"
    id="x"
    tabIndex={0}
    hidden
    data-x={1}
    aria-label="l"
    style={{ opacity: 0.5 }}
  />,
  <label htmlFor="x" style="color: red" />,
  <img src="a.png" alt="" width={10} />,
  <svg viewBox="0 0 10 10">
    <path d="M0 0" strokeWidth={2} fill="none" />
    <fePointLight pointsAtX={1} />
  </svg>,
  <my-element anything={1} />,
  <AbsoluteFill style={{ justifyContent: "center", "--gap": 4 }}>
    <Title text="Hello" />
  </AbsoluteFill>,
  <Frame as="h1" style={(frame) => ({ opacity: frame / 10 })} text={(frame) => String(frame)} />,
  <Frame as="path" attrs={(frame) => ({ d: `M0 ${frame}` })} strokeWidth={2} />,
  <Frame as={Img} src="a.png" style={{ width: 10 }} />,
  <Sequence from={10} durationInFrames={20} layout="none" />,
  <Loop durationInFrames={10} times={2} />,
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={30}>a</TransitionSeries.Sequence>
    <TransitionSeries.Transition
      timing={linearTiming({ durationInFrames: 10 })}
      presentation={slide({ direction: "from-right" })}
    />
    <TransitionSeries.Sequence durationInFrames={30}>b</TransitionSeries.Sequence>
  </TransitionSeries>,
];

export const invalid: HfNode[] = [
  // @ts-expect-error: unknown attribute
  <div classname="a" />,
  // @ts-expect-error: unknown CSS property
  <div style={{ opactiy: 1 }} />,
  // @ts-expect-error: event handlers are not supported
  <div onClick={() => {}} />,
  // @ts-expect-error: not an img attribute
  <img src="a.png" viewBox="0 0 1 1" />,
  // @ts-expect-error: unknown SVG attribute
  <path dd="M0 0" />,
  // @ts-expect-error: src is not a div attribute
  <Frame src="a.png" />,
  // @ts-expect-error: Img requires src
  <Img />,
  // @ts-expect-error: unknown tag
  <dvi />,
];
