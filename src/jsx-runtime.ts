import type { StyleObject } from "./dom";

export const Fragment = Symbol.for("hf.fragment");

/** What the JSX runtime returns: a description of an element, mounted later. */
export type HfElement = {
  $$hf: true;
  type: unknown;
  props: Record<string, unknown>;
  key: unknown;
};

/** Anything a component may return or take as `children`. */
export type HfNode = HfElement | string | number | bigint | boolean | null | undefined | HfNode[];

export function jsx(
  type: unknown,
  props: Record<string, unknown> | null,
  key?: unknown,
): HfElement {
  return { $$hf: true, type, props: props ?? {}, key };
}

export { jsx as jsxs, jsx as jsxDEV };

type Primitive = string | number | boolean;
type AttributeValue = Primitive | null | undefined;

export type Ref<E> = { current: E | null } | ((element: E) => void);

/** Props every host element accepts. Event handlers are not supported (nothing is interactive). */
export type BaseProps<E> = {
  children?: HfNode;
  ref?: Ref<E>;
  key?: unknown;
  className?: string;
  class?: string;
  style?: string | StyleObject;
  dangerouslySetInnerHTML?: { __html: string };
  [attribute: `data-${string}`]: AttributeValue;
  [attribute: `aria-${string}`]: AttributeValue;
};

type IfEquals<X, Y, A, B> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeys<T> = {
  [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

/** Writable DOM properties that are not attributes (or have a different attribute name). */
type NonAttributeProperty =
  | "innerHTML"
  | "outerHTML"
  | "innerText"
  | "outerText"
  | "textContent"
  | "nodeValue"
  | "scrollTop"
  | "scrollLeft"
  | "currentTime"
  | "defaultMuted"
  | "defaultPlaybackRate"
  | "playbackRate"
  | "preservesPitch"
  | "volume"
  | "selectionStart"
  | "selectionEnd"
  | "selectionDirection"
  | "valueAsNumber"
  | "defaultValue"
  | "defaultChecked"
  | "defaultSelected"
  | "indeterminate"
  | "className"
  | "classList";

/** Attributes of an HTML element, named as its DOM properties (`tabIndex`, `htmlFor`...). */
type HtmlAttributes<E> = {
  [K in Exclude<WritableKeys<E>, NonAttributeProperty> as K extends `aria${string}`
    ? never
    : NonNullable<E[K]> extends Primitive
      ? K
      : never]?: AttributeValue;
};

/** Props of the HTML element `<tag>`. */
export type HtmlProps<Tag extends keyof HTMLElementTagNameMap> = BaseProps<
  HTMLElementTagNameMap[Tag]
> &
  HtmlAttributes<HTMLElementTagNameMap[Tag]>;

type SvgAttributeName =
  // Core and geometry
  | "id"
  | "lang"
  | "tabIndex"
  | "x"
  | "y"
  | "x1"
  | "x2"
  | "y1"
  | "y2"
  | "cx"
  | "cy"
  | "r"
  | "rx"
  | "ry"
  | "fx"
  | "fy"
  | "fr"
  | "width"
  | "height"
  | "d"
  | "points"
  | "pathLength"
  | "transform"
  | "transformOrigin"
  | "viewBox"
  | "preserveAspectRatio"
  | "href"
  | "xlinkHref"
  | "xmlns"
  | "version"
  | "target"
  | "requiredExtensions"
  | "systemLanguage"
  // Presentation
  | "alignmentBaseline"
  | "baselineShift"
  | "clip"
  | "clipPath"
  | "clipRule"
  | "color"
  | "colorInterpolation"
  | "colorInterpolationFilters"
  | "cursor"
  | "direction"
  | "display"
  | "dominantBaseline"
  | "fill"
  | "fillOpacity"
  | "fillRule"
  | "filter"
  | "floodColor"
  | "floodOpacity"
  | "fontFamily"
  | "fontSize"
  | "fontSizeAdjust"
  | "fontStretch"
  | "fontStyle"
  | "fontVariant"
  | "fontWeight"
  | "imageRendering"
  | "letterSpacing"
  | "lightingColor"
  | "markerEnd"
  | "markerMid"
  | "markerStart"
  | "mask"
  | "maskType"
  | "opacity"
  | "overflow"
  | "paintOrder"
  | "pointerEvents"
  | "shapeRendering"
  | "stopColor"
  | "stopOpacity"
  | "stroke"
  | "strokeDasharray"
  | "strokeDashoffset"
  | "strokeLinecap"
  | "strokeLinejoin"
  | "strokeMiterlimit"
  | "strokeOpacity"
  | "strokeWidth"
  | "textAnchor"
  | "textDecoration"
  | "textRendering"
  | "unicodeBidi"
  | "vectorEffect"
  | "visibility"
  | "wordSpacing"
  | "writingMode"
  // Text
  | "dx"
  | "dy"
  | "rotate"
  | "textLength"
  | "lengthAdjust"
  | "startOffset"
  | "method"
  | "spacing"
  | "side"
  // Gradients, patterns, clipping, masking, markers
  | "gradientUnits"
  | "gradientTransform"
  | "spreadMethod"
  | "offset"
  | "patternUnits"
  | "patternContentUnits"
  | "patternTransform"
  | "clipPathUnits"
  | "maskUnits"
  | "maskContentUnits"
  | "markerWidth"
  | "markerHeight"
  | "markerUnits"
  | "refX"
  | "refY"
  | "orient"
  // Filters
  | "filterUnits"
  | "primitiveUnits"
  | "in"
  | "in2"
  | "result"
  | "stdDeviation"
  | "mode"
  | "operator"
  | "k1"
  | "k2"
  | "k3"
  | "k4"
  | "type"
  | "values"
  | "tableValues"
  | "slope"
  | "intercept"
  | "amplitude"
  | "exponent"
  | "baseFrequency"
  | "numOctaves"
  | "seed"
  | "stitchTiles"
  | "scale"
  | "xChannelSelector"
  | "yChannelSelector"
  | "kernelMatrix"
  | "kernelUnitLength"
  | "order"
  | "divisor"
  | "bias"
  | "targetX"
  | "targetY"
  | "edgeMode"
  | "preserveAlpha"
  | "radius"
  | "surfaceScale"
  | "diffuseConstant"
  | "specularConstant"
  | "specularExponent"
  | "limitingConeAngle"
  | "azimuth"
  | "elevation"
  | "pointsAtX"
  | "pointsAtY"
  | "pointsAtZ"
  // SMIL animation
  | "attributeName"
  | "begin"
  | "dur"
  | "end"
  | "from"
  | "to"
  | "by"
  | "repeatCount"
  | "repeatDur"
  | "calcMode"
  | "keyTimes"
  | "keySplines"
  | "keyPoints"
  | "additive"
  | "accumulate"
  | "path"
  | "restart";

/** SVG attributes in camelCase; they are written kebab-cased unless SVG keeps them camelCase. */
export type SvgAttributes = { [K in SvgAttributeName]?: AttributeValue };

/** Props of the SVG element `<tag>`. */
export type SvgProps<Tag extends keyof SVGElementTagNameMap> = BaseProps<
  SVGElementTagNameMap[Tag]
> &
  SvgAttributes;

type HtmlElements = {
  [Tag in keyof HTMLElementTagNameMap]: HtmlProps<Tag>;
};

type SvgElements = {
  [Tag in Exclude<keyof SVGElementTagNameMap, keyof HTMLElementTagNameMap>]: SvgProps<Tag>;
};

/** Custom elements accept any attribute. */
type CustomElementProps = BaseProps<HTMLElement> & { [attribute: string]: unknown };

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
  interface IntrinsicElements extends HtmlElements, SvgElements {
    [customElement: `${string}-${string}`]: CustomElementProps;
  }
}
