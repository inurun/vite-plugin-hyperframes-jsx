import { HTML_NS, SVG_NS, type StyleObject } from "../dom";
import type { HfNode } from "../jsx-runtime";
import { defineMount, mount, mountHost, type MountContext } from "../mount";
import { createScope, getBuildState, withScope } from "../scope";
import { ABSOLUTE_FILL } from "./absolute-fill";

export type SequenceProps = {
  from?: number;
  durationInFrames?: number;
  layout?: "none" | "absolute-fill";
  className?: string;
  style?: StyleObject;
  children?: HfNode;
};

export function mountScoped(props: SequenceProps, ctx: MountContext, loop: number | null) {
  const parent = getBuildState().scope;
  const from = props.from ?? 0;
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
      : { className: props.className, style: { ...ABSOLUTE_FILL, ...props.style } },
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

export const Sequence = defineMount<SequenceProps>((props, ctx) => mountScoped(props, ctx, null));
