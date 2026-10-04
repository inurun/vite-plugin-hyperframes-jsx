import { defineMount } from "../mount";
import { mountScoped, type SequenceProps } from "./sequence";

type LoopProps = Omit<SequenceProps, "from" | "durationInFrames"> & {
  durationInFrames: number;
  times?: number;
};

export const Loop = defineMount<LoopProps>((props, ctx) => {
  const times = props.times ?? Infinity;
  mountScoped(
    { ...props, from: 0, durationInFrames: props.durationInFrames * times },
    ctx,
    props.durationInFrames,
  );
});
