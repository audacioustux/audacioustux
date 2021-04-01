import * as colors from "tailwindcss/colors";
import { range } from "lodash";

const screens = () => {
  const viewports = {
    xs: 320,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  };
  return Object.entries(viewports).map(([k, v]) => [k, `${v}px`]);
};

const spacing = () => {
  let spacer = ((key, size) => {
    return (key_func: any, size_func: any) => {
      key = key_func(key);
      size = size_func(size);
      return [key, size];
    };
  })(0, 0);

  const _mapper = (_k: any, _v: any) =>
    spacer(
      (k: any) => k + _k,
      (v: any) => v + _v
    );
  const _spacing = [
    ...range(8).map(() => _mapper(0.5, 1 / 8)),
    ...range(8).map(() => _mapper(1, 1 / 4)),
    ...range(2).map(() => _mapper(2, 1 / 2)),
    ...range(12).map(() => _mapper(4, 1)),
    ...range(2).map(() => _mapper(8, 2)),
    ...range(1).map(() => _mapper(16, 4)),
  ];

  return {
    0: "0px",
    px: 1,
    ...Object.fromEntries(
      [
        ..._spacing.map(([k, v]) => [
          [k, `${v}rem`],
          [`${k}_em`, `${v}em`],
        ]),
      ].flat()
    ),
  };
};

const config = {
  purge: ["./index.html", "./src/**/*.vue"],
  plugins: [require("tailwindcss-pseudo-elements")],
  darkMode: "class",
  theme: {
    spacing: spacing(),
    screens: screens(),
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...colors,
    },
  },
};

export = config;
