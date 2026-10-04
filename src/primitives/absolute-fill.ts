import type { StyleObject } from "../dom";
import { jsx, type HfNode } from "../jsx-runtime";

export const ABSOLUTE_FILL: StyleObject = {
  position: "absolute",
  top: "0px",
  left: "0px",
  right: "0px",
  bottom: "0px",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
};

export function AbsoluteFill({
  style,
  ...props
}: {
  style?: StyleObject;
  className?: string;
  children?: HfNode;
  [attr: string]: unknown;
}) {
  return jsx("div", { ...props, style: { ...ABSOLUTE_FILL, ...style } });
}
