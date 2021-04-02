import * as colors from "tailwindcss/colors";
import {
  screens,
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  lineHeight,
} from "tailwindcss/defaultTheme";
import fs from "fs";

type TtoT<T = any> = (_: T) => T;

const rem2em: TtoT<String> = (rem) => rem.replace("rem", "em");
const mapEntries = (obj: Object, k_func: TtoT<String>, v_func: TtoT) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k_func(k), v_func(v)])
  );

const config = {
  purge: ["./index.html", "./src/**/*.vue"],
  plugins: [require("tailwindcss-pseudo-elements")],
  darkMode: "class",
  theme: {
    screens: { xs: "320px", ...screens },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...colors,
    },
    spacing: (() => {
      const { 0: _, px, ..._spacing } = spacing;
      return {
        ...spacing,
        ...mapEntries(_spacing, (k) => `${k}_em`, rem2em),
      };
    })(),
    fontFamily: {
      ...fontFamily,
      mono: ['"JetBrains Mono"', ...fontFamily.mono],
      playfair_serif: ['"Playfair Display"', ...fontFamily.serif],
    },
    borderRadius: (() => {
      const { none, full, ..._borderRadius } = borderRadius;
      return {
        ...spacing,
        ...mapEntries(_borderRadius, (k) => `${k}_em`, rem2em),
      };
    })(),
    fontSize: {
      ...fontSize,
      ...mapEntries(
        fontSize,
        (k) => `${k}_em`,
        (v) => {
          const [size, { lineHeight }] = v;
          return [rem2em(size), { lineHeight: rem2em(lineHeight) }];
        }
      ),
    },
    lineHeight: (() => {
      const {
        none,
        tight,
        snug,
        normal,
        relaxed,
        loose,
        ..._lineHeight
      } = lineHeight;
      return {
        ...spacing,
        ...mapEntries(_lineHeight, (k) => `${k}_em`, rem2em),
      };
    })(),
  },
};

fs.writeFileSync("tailwind.config.json", JSON.stringify(config));

export = config;
