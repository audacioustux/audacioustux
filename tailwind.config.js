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
const defaultTheme_1 = require("tailwindcss/defaultTheme");
const fs_1 = __importDefault(require("fs"));
const rem2em = (rem) => rem.replace("rem", "em");
const mapEntries = (obj, k_func, v_func) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k_func(k), v_func(v)]));
const config = {
    purge: ["./index.html", "./src/**/*.vue"],
    plugins: [require("tailwindcss-pseudo-elements")],
    darkMode: "class",
    theme: {
        screens: { xs: "320px", ...defaultTheme_1.screens },
        colors: {
            transparent: "transparent",
            current: "currentColor",
            ...colors,
        },
        spacing: (() => {
            const { 0: _, px, ..._spacing } = defaultTheme_1.spacing;
            return {
                ...defaultTheme_1.spacing,
                ...mapEntries(_spacing, (k) => `${k}_em`, rem2em),
            };
        })(),
        fontFamily: {
            ...defaultTheme_1.fontFamily,
            mono: ['"JetBrains Mono"', ...defaultTheme_1.fontFamily.mono],
            playfair_serif: ['"Playfair Display"', ...defaultTheme_1.fontFamily.serif],
        },
        borderRadius: (() => {
            const { none, full, ..._borderRadius } = defaultTheme_1.borderRadius;
            return {
                ...defaultTheme_1.spacing,
                ...mapEntries(_borderRadius, (k) => `${k}_em`, rem2em),
            };
        })(),
        fontSize: {
            ...defaultTheme_1.fontSize,
            ...mapEntries(defaultTheme_1.fontSize, (k) => `${k}_em`, (v) => {
                const [size, { lineHeight }] = v;
                return [rem2em(size), { lineHeight: rem2em(lineHeight) }];
            }),
        },
        lineHeight: (() => {
            const { none, tight, snug, normal, relaxed, loose, ..._lineHeight } = defaultTheme_1.lineHeight;
            return {
                ...defaultTheme_1.spacing,
                ...mapEntries(_lineHeight, (k) => `${k}_em`, rem2em),
            };
        })(),
    },
};
fs_1.default.writeFileSync("tailwind.config.json", JSON.stringify(config));
module.exports = config;
