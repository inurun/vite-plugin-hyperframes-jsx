import { defineMount } from "../mount";
import { mountScoped, type ClipProps } from "./clip";

export type LoopProps = Omit<ClipProps, "from" | "durationInFrames"> & {
  /** Length of one iteration. Children see it as their duration. */
  durationInFrames: number;
  /** Number of iterations (default: until the parent ends). */
  times?: number;
};

/** Repeats its children every `durationInFrames`. */
export const Loop = defineMount<LoopProps>((props, ctx) => {
  const times = props.times ?? Infinity;
  if (!Number.isFinite(props.durationInFrames) || props.durationInFrames <= 0) {
    throw new RangeError(
      `<Loop> durationInFrames must be a positive number, got ${props.durationInFrames}.`,
    );
  }
  if (times !== Infinity && (!Number.isInteger(times) || times <= 0)) {
    throw new RangeError(`<Loop> times must be a positive integer, got ${times}.`);
  }
  mountScoped(
    { ...props, from: 0, durationInFrames: props.durationInFrames * times },
    ctx,
    props.durationInFrames,
  );
});
