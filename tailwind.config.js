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
const colors = __importStar(require("tailwindcss/colors"));
const lodash_1 = require("lodash");
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
        return (key_func, size_func) => {
            key = key_func(key);
            size = size_func(size);
            return [key, size];
        };
    })(0, 0);
    const _mapper = (_k, _v) => spacer((k) => k + _k, (v) => v + _v);
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
        screens: screens(),
        colors: {
            transparent: "transparent",
            current: "currentColor",
            ...colors,
        },
    },
};
module.exports = config;
