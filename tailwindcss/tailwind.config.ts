import * as colors from "tailwindcss/colors";
import {
  screens,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  lineHeight,
  minHeight,
} from "tailwindcss/defaultTheme";
import { pickBy } from "lodash";

type TtoT<T = any> = (_: T) => T;

const key2em: TtoT<string> = (key) => `${key}/em`;
const rem2em: TtoT<string> = (rem) => rem.replace("rem", "em");
const isRem = (v: string) => v.endsWith("rem");

const mapEntries = (obj: Object, k_func: TtoT, v_func: TtoT) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k_func(k), v_func(v)])
  );

const config = {
  purge: ["./index.html", "./src/**/*.vue"],
  plugins: [
    require("tailwindcss-pseudo-elements"),
    require("tailwindcss-children"),
  ],
  darkMode: "class",
  theme: {
    screens: { xs: "320px", ...screens },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...colors,
    },
    spacing: {
      ...spacing,
      ...mapEntries(pickBy(spacing, isRem), key2em, rem2em),
    },
    fontFamily: {
      ...fontFamily,
      mono: ['"JetBrains Mono"', ...fontFamily.mono],
      "playfair-serif": ['"Playfair Display"', ...fontFamily.serif],
    },
    borderRadius: {
      ...borderRadius,
      ...mapEntries(pickBy(borderRadius, isRem), key2em, rem2em),
    },
    fontSize: {
      ...fontSize,
      ...mapEntries(
        pickBy(fontSize, ([size]) => isRem(size)),
        key2em,
        (v) => {
          const [size, { lineHeight }] = v;
          return [rem2em(size), { lineHeight: rem2em(lineHeight) }];
        }
      ),
    },
    lineHeight: {
      ...lineHeight,
      ...mapEntries(pickBy(lineHeight, isRem), key2em, rem2em),
    },
    minHeight: { ...minHeight, "screen-min": "min(100vw, 100vh)" },
  },
};

export = config;
