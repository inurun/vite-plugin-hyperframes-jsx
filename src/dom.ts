export const SVG_NS = "http://www.w3.org/2000/svg";
export const HTML_NS = "http://www.w3.org/1999/xhtml";

// React's unitless CSS properties: numbers are emitted without "px".
const UNITLESS = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "gridArea",
  "gridRow",
  "gridRowEnd",
  "gridRowSpan",
  "gridRowStart",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnSpan",
  "gridColumnStart",
  "fontWeight",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
  "fillOpacity",
  "floodOpacity",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
]);

// SVG attributes React passes through in camelCase.
const SVG_CAMEL_ATTRS = new Set([
  "viewBox",
  "preserveAspectRatio",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "maskUnits",
  "maskContentUnits",
  "clipPathUnits",
  "stdDeviation",
  "baseFrequency",
  "numOctaves",
  "kernelMatrix",
  "tableValues",
  "filterUnits",
  "primitiveUnits",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust",
  "spreadMethod",
  "diffuseConstant",
  "specularConstant",
  "specularExponent",
  "surfaceScale",
  "edgeMode",
  "keyPoints",
  "keyTimes",
  "keySplines",
  "calcMode",
  "attributeName",
  "repeatCount",
  "xChannelSelector",
  "yChannelSelector",
]);

const SKIP_PROPS = new Set(["children", "key", "ref", "dangerouslySetInnerHTML", "style"]);

function toKebab(key: string) {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function cssName(key: string) {
  if (key.startsWith("--")) {
    return key;
  }
  if (/^(Webkit|Moz|ms)[A-Z]/.test(key)) {
    return `-${toKebab(key).replace(/^-/, "")}`;
  }
  return toKebab(key);
}

function cssValue(key: string, value: unknown) {
  if (typeof value === "number" && value !== 0 && !UNITLESS.has(key) && !key.startsWith("--")) {
    return `${value}px`;
  }
  return String(value);
}

export type StyleObject = Record<string, unknown>;

/** Applies a React-style style object, removing keys that disappeared since `previous`. */
export function applyStyle(
  el: HTMLElement | SVGElement,
  next: StyleObject | undefined,
  previous?: StyleObject,
) {
  const style = el.style;
  if (previous) {
    for (const key of Object.keys(previous)) {
      if (!next || next[key] == null || next[key] === false) {
        style.removeProperty(cssName(key));
      }
    }
  }
  if (!next) {
    return;
  }
  for (const [key, value] of Object.entries(next)) {
    if (value == null || value === false) {
      continue;
    }
    if (previous && previous[key] === value) {
      continue;
    }
    style.setProperty(cssName(key), cssValue(key, value));
  }
}

export function applyProps(el: Element, props: Record<string, unknown>, isSvg: boolean) {
  for (const [key, value] of Object.entries(props)) {
    if (SKIP_PROPS.has(key) || value == null || value === false) {
      continue;
    }
    if (/^on[A-Z]/.test(key) || typeof value === "function") {
      continue;
    }
    let name: string;
    if (key === "className") {
      name = "class";
    } else if (key === "htmlFor") {
      name = "for";
    } else if (key.startsWith("data-") || key.startsWith("aria-")) {
      name = key;
    } else if (isSvg) {
      name = key === "xlinkHref" ? "href" : SVG_CAMEL_ATTRS.has(key) ? key : toKebab(key);
    } else {
      name = key.toLowerCase();
    }
    el.setAttribute(name, value === true ? "" : String(value));
  }
  const style = props["style"];
  if (typeof style === "string") {
    // As authored (e.g. parsed HTML).
    el.setAttribute("style", style);
  } else if (style) {
    applyStyle(el as HTMLElement, style as StyleObject);
  }
  const inner = props["dangerouslySetInnerHTML"] as { __html?: string } | undefined;
  if (inner?.__html != null) {
    el.innerHTML = inner.__html;
  }
}
