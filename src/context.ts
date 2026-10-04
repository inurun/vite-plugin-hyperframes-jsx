import type { HfNode } from "./jsx-runtime";
import { getContextStack } from "./mount";

export type Context<T> = {
  $$default: T;
  Provider: (props: { value: T; children?: HfNode }) => HfNode;
  Consumer: (props: { children: (value: T) => HfNode }) => HfNode;
};

/** Providers push onto a per-context stack while their subtree mounts. */
export function createContext<T>(defaultValue: T): Context<T> {
  const context = { $$default: defaultValue } as Context<T>;
  context.Provider = Object.assign(
    () => {
      throw new Error("Context.Provider is mounted by the runtime.");
    },
    { $$hfProvider: context },
  );
  context.Consumer = ({ children }) => children(useContext(context));
  return context;
}

export function useContext<T>(context: Context<T>): T {
  const stack = getContextStack(context);
  return stack.length > 0 ? (stack[stack.length - 1] as T) : context.$$default;
}
