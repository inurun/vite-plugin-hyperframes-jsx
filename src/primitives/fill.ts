import type { StyleObject } from "../dom";
import { jsx, type HfNode, type HtmlProps } from "../jsx-runtime";

/** The style of `Fill`: a full-size, absolutely positioned flex column. */
export const FILL: StyleObject = {
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

export type FillProps = Omit<HtmlProps<"div">, "style"> & { style?: StyleObject };

/** A `div` filling its positioned parent; `style` is merged over `FILL`. */
export function Fill({ style, ...props }: FillProps): HfNode {
  return jsx("div", { ...props, style: { ...FILL, ...style } });
}
