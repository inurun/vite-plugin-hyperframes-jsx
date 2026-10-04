import type { StyleObject } from "./dom";

export const Fragment = Symbol.for("hf.fragment");

export type HfElement = {
  $$hf: true;
  type: unknown;
  props: Record<string, unknown>;
  key: unknown;
};

export type HfNode = HfElement | string | number | bigint | boolean | null | undefined | HfNode[];

export function jsx(
  type: unknown,
  props: Record<string, unknown> | null,
  key?: unknown,
): HfElement {
  return { $$hf: true, type, props: props ?? {}, key };
}

export { jsx as jsxs, jsx as jsxDEV };

type Ref<E> = { current: E | null } | ((el: E) => void);

// Loose on purpose: unknown attributes pass through `applyProps` as strings.
type HostProps<E> = {
  className?: string;
  style?: string | StyleObject;
  ref?: Ref<E>;
  children?: HfNode;
  dangerouslySetInnerHTML?: { __html: string };
  [attr: string]: unknown;
};

type HtmlElements = {
  [K in keyof HTMLElementTagNameMap]: HostProps<HTMLElementTagNameMap[K]>;
};

type SvgElements = {
  [K in Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap>]: HostProps<
    SVGElementTagNameMap[K]
  >;
};

export declare namespace JSX {
  type Element = HfElement;
  // Function components may return any node; custom-mount primitives are typed as functions.
  type ElementType = string | ((props: any) => HfNode);
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicAttributes {
    key?: unknown;
  }
  interface IntrinsicElements extends HtmlElements, SvgElements {}
}
