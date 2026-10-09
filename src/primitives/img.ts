import type { HtmlProps } from "../jsx-runtime";
import { defineMount, mountHost } from "../mount";
import { registerPending } from "../scope";

export type ImgProps = HtmlProps<"img"> & { src: string };

/** An `img` whose `decode()` is awaited before `mountComposition` resolves. */
export const Img = defineMount<ImgProps>((props, ctx) => {
  const img = mountHost("img", props, ctx) as HTMLImageElement;
  registerPending(
    img.decode().catch((error: unknown) => {
      // The render goes on without the image; say which one so it is not a silent blank.
      console.warn(`[hyperframes-jsx] Could not decode image "${props.src}".`, error);
    }),
  );
});
