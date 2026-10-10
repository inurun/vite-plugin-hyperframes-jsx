import { Clip } from "@inurun/vite-plugin-hyperframes-jsx/runtime";

export function Video() {
  return (
    <Clip start={0} duration={2} data-testid="video">
      hello
    </Clip>
  );
}
