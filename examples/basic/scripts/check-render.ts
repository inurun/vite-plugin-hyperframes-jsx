// Checks a rendered video against the example: frame count, and colors that only match when
// HyperFrames seeks the CSS and Web Animations to the right time (including mid-transition).
import { execFileSync } from "node:child_process";

const file = process.argv[2] ?? "renders/basic.mp4";
const BLUE = [29, 78, 216];
const RED = [190, 18, 60];

function pixel(frame: number, x: number, y: number) {
  const filter = `select=eq(n\\,${frame}),crop=2:2:${x}:${y}`;
  const raw = execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    file,
    "-vf",
    filter,
    "-frames:v",
    "1",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-",
  ]);
  return [...raw.subarray(0, 3)];
}

const frames = execFileSync("ffprobe", [
  "-v",
  "error",
  "-select_streams",
  "v:0",
  "-count_frames",
  "-show_entries",
  "stream=nb_read_frames",
  "-of",
  "csv=p=0",
  file,
])
  .toString()
  .trim();

const checks: [string, boolean][] = [
  [`160 frames (got ${frames})`, frames === "160"],
  ["frame 15 shows the first scene", near(pixel(15, 10, 10), BLUE)],
  ["frame 80 is mid-transition (left: first scene)", near(pixel(80, 10, 10), BLUE)],
  ["frame 80 is mid-transition (right: second scene)", near(pixel(80, 1260, 10), RED)],
  ["frame 150 shows the second scene", near(pixel(150, 10, 10), RED)],
];

function near(actual: number[], expected: number[]) {
  return actual.every((value, index) => Math.abs(value - expected[index]!) <= 12);
}

for (const [name, ok] of checks) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
}
if (checks.some(([, ok]) => !ok)) {
  process.exit(1);
}
