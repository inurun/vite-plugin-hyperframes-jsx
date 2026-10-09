import { applyStyle, type StyleObject } from "../dom";
import { jsx, type HfNode, type JSX } from "../jsx-runtime";
import { defineMount, mount, mountHost, type CustomMount } from "../mount";
import { registerUpdater } from "../scope";

/** Frame-dependent attributes by DOM name; `undefined` removes the attribute. */
export type FrameAttrs = Record<string, string | number | undefined>;

/** A tag, or a component that forwards `ref` to its element (e.g. `Img`). */
export type FrameTarget = keyof JSX.IntrinsicElements | ((props: any) => HfNode);

type TargetProps<T> = T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : T extends (props: infer P) => HfNode
    ? P
    : never;

export type FrameProps<T extends FrameTarget = "div"> = Omit<TargetProps<T>, "style" | "as"> & {
  /** The element to render (default `div`). */
  as?: T;
  style?: StyleObject | ((frame: number) => StyleObject | undefined);
  text?: (frame: number) => string;
  /** Frame-dependent attributes, set by DOM name (e.g. an SVG path `d`). */
  attrs?: (frame: number) => FrameAttrs;
};

type InternalFrameProps = {
  as?: string | ((props: never) => HfNode);
  style?: FrameProps["style"];
  text?: FrameProps["text"];
  attrs?: FrameProps["attrs"];
  [prop: string]: unknown;
};

/** Element whose style / text / attributes are pure functions of the scope-local frame. */
export const Frame: (<T extends FrameTarget = "div">(props: FrameProps<T>) => HfNode) &
  CustomMount<any> = defineMount<InternalFrameProps>(
  ({ as, style, text, attrs, ...props }, ctx) => {
    let el: HTMLElement | null = null;
    if (typeof as === "function") {
      mount(jsx(as, { ...props, ref: (node: HTMLElement) => (el = node) }), ctx);
    } else {
      el = mountHost(as ?? "div", props, ctx) as HTMLElement;
    }
    if (!el) {
      throw new Error("<Frame as={Component}> requires the component to forward `ref`.");
    }
    const target: HTMLElement = el;
    let previous: StyleObject | undefined;
    let previousText: string | undefined;
    let previousAttrs: FrameAttrs = {};
    registerUpdater((frame) => {
      const next = typeof style === "function" ? style(frame) : style;
      applyStyle(target, next, previous);
      previous = next;
      if (text) {
        const nextText = text(frame);
        if (nextText !== previousText) {
          target.textContent = nextText;
          previousText = nextText;
        }
      }
      if (attrs) {
        const nextAttrs = attrs(frame);
        for (const name of Object.keys(previousAttrs)) {
          if (nextAttrs[name] === undefined) {
            target.removeAttribute(name);
          }
        }
        for (const [name, value] of Object.entries(nextAttrs)) {
          if (value !== undefined && value !== previousAttrs[name]) {
            target.setAttribute(name, String(value));
          }
        }
        previousAttrs = nextAttrs;
      }
    });
  },
);
