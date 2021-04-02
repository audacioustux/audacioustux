"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const colors = __importStar(require("tailwindcss/colors"));
const lodash_1 = require("lodash");
const defaultTheme_1 = require("tailwindcss/defaultTheme");
const fs_1 = __importDefault(require("fs"));
// incremental key-value generator
const incKVGen = (key, size) => (key_func, size_func) => {
    key = key_func(key);
    size = size_func(size);
    return [key, size];
};
const spacing = () => {
    const _mapper = (_k, _v) => incKVGen(0, 0)((k) => k + _k, (v) => v + _v);
    const _spacing = [
        ...lodash_1.range(8).map(() => _mapper(0.5, 1 / 8)),
        ...lodash_1.range(8).map(() => _mapper(1, 1 / 4)),
        ...lodash_1.range(2).map(() => _mapper(2, 1 / 2)),
        ...lodash_1.range(12).map(() => _mapper(4, 1)),
        ...lodash_1.range(2).map(() => _mapper(8, 2)),
        ...lodash_1.range(1).map(() => _mapper(16, 4)),
    ];
    return {
        0: "0px",
        px: 1,
        ...Object.fromEntries([
            ..._spacing.map(([k, v]) => [
                [k, `${v}rem`],
                [`${k}_em`, `${v}em`],
            ]),
        ].flat()),
    };
};
const config = {
    purge: ["./index.html", "./src/**/*.vue"],
    plugins: [require("tailwindcss-pseudo-elements")],
    darkMode: "class",
    theme: {
        spacing: spacing(),
        screens: { xs: "320px", ...defaultTheme_1.screens },
        colors: {
            transparent: "transparent",
            current: "currentColor",
            ...colors,
        },
        fontFamily: {
            ...defaultTheme_1.fontFamily,
            mono: ['"JetBrains Mono"', ...defaultTheme_1.fontFamily.mono],
            playfair_serif: ['"Playfair Display"', ...defaultTheme_1.fontFamily.serif],
        },
    },
};
fs_1.default.writeFileSync("tailwind.config.json", JSON.stringify(config));
module.exports = config;
