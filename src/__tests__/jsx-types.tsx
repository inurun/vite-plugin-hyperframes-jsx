// Type tests: checked by `tsc`, never run.
import { Clip, createContext, type HfNode } from "../runtime";

function Title({ text }: { text: string }) {
  return <h1>{text}</h1>;
}

const Theme = createContext("light");

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
  <div ref={(el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 })} />,
  <Clip start={1.5} duration={3} className="scene" style={{ background: "#111", "--gap": 4 }}>
    <Title text="Hello" />
    <Clip start={1}>nested</Clip>
  </Clip>,
  <Theme.Provider value="dark">
    <Title text="themed" />
  </Theme.Provider>,
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
  // @ts-expect-error: start is in seconds, not a string
  <Clip start="1s" />,
  // @ts-expect-error: frame-based props are gone
  <Clip durationInFrames={30} />,
  // @ts-expect-error: unknown tag
  <dvi />,
];
