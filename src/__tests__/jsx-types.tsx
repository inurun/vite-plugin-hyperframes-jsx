// Type tests: checked by `tsc`, never run.
import { Fill, Frame, Img, Loop, Clip, linear, slide, ClipSeries, type HfNode } from "../runtime";

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
  <Fill style={{ justifyContent: "center", "--gap": 4 }}>
    <Title text="Hello" />
  </Fill>,
  <Frame as="h1" style={(frame) => ({ opacity: frame / 10 })} text={(frame) => String(frame)} />,
  <Frame as="path" attrs={(frame) => ({ d: `M0 ${frame}` })} strokeWidth={2} />,
  <Frame as={Img} src="a.png" style={{ width: 10 }} />,
  <Clip from={10} durationInFrames={20} layout="none" />,
  <Loop durationInFrames={10} times={2} />,
  <ClipSeries>
    <ClipSeries.Clip durationInFrames={30}>a</ClipSeries.Clip>
    <ClipSeries.Transition
      timing={linear({ durationInFrames: 10 })}
      presentation={slide({ direction: "from-right" })}
    />
    <ClipSeries.Clip durationInFrames={30}>b</ClipSeries.Clip>
  </ClipSeries>,
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
