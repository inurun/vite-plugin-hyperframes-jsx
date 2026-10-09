import { HTML_NS, SVG_NS, type StyleObject } from "../dom";
import type { HfNode } from "../jsx-runtime";
import { defineMount, mount, mountHost, type MountContext } from "../mount";
import { createScope, getBuildState, withScope } from "../scope";
import { FILL } from "./fill";

export type ClipProps = {
  /** Start frame relative to the parent (default 0). */
  from?: number;
  /** Visible length in frames (default: until the parent ends). */
  durationInFrames?: number;
  /** `fill` (default) wraps children in a `Fill` div; `none` adds no box. */
  layout?: "none" | "fill";
  className?: string;
  style?: StyleObject;
  children?: HfNode;
};

/** @internal */
export function mountScoped(props: ClipProps, ctx: MountContext, loop: number | null) {
  const parent = getBuildState().scope;
  const from = props.from ?? 0;
  if (!Number.isFinite(from)) {
    throw new RangeError(`<Clip> from must be a finite number, got ${from}.`);
  }
  if (Number.isNaN(props.durationInFrames) || (props.durationInFrames ?? 0) < 0) {
    throw new RangeError(
      `<Clip> durationInFrames must not be negative, got ${props.durationInFrames}.`,
    );
  }
  const duration = Math.max(
    0,
    Math.min(parent.durationInFrames - from, props.durationInFrames ?? Infinity),
  );
  const isSvg = ctx.ns === SVG_NS;
  const layoutNone = props.layout === "none";
  const wrapper = mountHost(
    isSvg ? "g" : "div",
    layoutNone
      ? { style: isSvg ? undefined : { display: "contents" } }
      : { className: props.className, style: { ...FILL, ...props.style } },
    ctx,
  ) as HTMLElement;
  const scope = createScope(parent.from + from, duration, wrapper, wrapper.style.display);
  scope.loop = loop;
  withScope(scope, () => {
    // Children of a Loop see the loop length as their duration.
    scope.durationInFrames = loop ?? duration;
    mount(props.children, { parent: wrapper, ns: isSvg ? SVG_NS : HTML_NS });
    scope.durationInFrames = duration;
  });
}

/** Shows its children from `from` for `durationInFrames`; children see frames from 0. */
export const Clip = defineMount<ClipProps>((props, ctx) => mountScoped(props, ctx, null));
