import { defineMount, mountHost } from "../mount";
import { registerPending } from "../scope";

type ImgProps = { src: string; [attr: string]: unknown };

export const Img = defineMount<ImgProps>((props, ctx) => {
  const img = mountHost("img", props, ctx) as HTMLImageElement;
  registerPending(img.decode().catch(() => undefined));
});
