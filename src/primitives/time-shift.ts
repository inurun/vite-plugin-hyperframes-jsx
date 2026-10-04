import type { HfNode } from "../jsx-runtime";
import { defineMount, mount } from "../mount";
import { createScope, getBuildState, withScope } from "../scope";

/**
 * Evaluates the subtree at `frame - by` (fractional allowed, e.g. motion-blur samples).
 * `by` may depend on the scope-local frame (e.g. `Freeze`: `frame => frame - frozen`).
 */
export const TimeShift = defineMount<{
  by: number | ((frame: number) => number);
  children?: HfNode;
}>(({ by, children }, ctx) => {
  const parent = getBuildState().scope;
  const scope = createScope(parent.from, parent.durationInFrames, null, "");
  scope.timeOffset = by;
  withScope(scope, () => mount(children, ctx));
});
