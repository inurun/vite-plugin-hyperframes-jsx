import type { HfNode } from "./jsx-runtime";
import { getContextStack } from "./mount";

export type Context<T> = {
  $$default: T;
  Provider: (props: { value: T; children?: HfNode }) => HfNode;
};

/**
 * A value passed down the tree while it mounts, as React context. Providers push onto a
 * per-context stack while their subtree mounts; read it with `readContext` in a component body.
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const context = { $$default: defaultValue } as Context<T>;
  context.Provider = Object.assign(
    () => {
      throw new Error("Context.Provider is mounted by the runtime.");
    },
    { $$hfProvider: context },
  );
  return context;
}

/** The value of the nearest enclosing `Provider`, or the context default. */
export function readContext<T>(context: Context<T>): T {
  const stack = getContextStack(context);
  return stack.length > 0 ? (stack[stack.length - 1] as T) : context.$$default;
}
