import type { HfNode } from "../jsx-runtime";
import { defineMount, mount } from "../mount";
import { createScope, getBuildState, withScope } from "../scope";

export type TimeShiftProps = {
  /** Frames to shift by: a number, or a function of the scope-local frame. */
  by: number | ((frame: number) => number);
  children?: HfNode;
};

/**
 * Evaluates the subtree at `frame - by` (fractional allowed, e.g. motion-blur samples).
 * `by` may depend on the scope-local frame (e.g. `Freeze`: `frame => frame - frozen`).
 */
export const TimeShift = defineMount<TimeShiftProps>(({ by, children }, ctx) => {
  if (typeof by === "number" && !Number.isFinite(by)) {
    throw new RangeError(`<TimeShift> by must be a finite number, got ${by}.`);
  }
  const parent = getBuildState().scope;
  const scope = createScope(parent.from, parent.durationInFrames, null, "");
  scope.timeOffset = by;
  withScope(scope, () => mount(children, ctx));
});
