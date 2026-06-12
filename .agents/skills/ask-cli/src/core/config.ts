import { basename, dirname, fromFileUrl, join } from "jsr:@std/path@1";

export function defaultConfigFile(moduleUrl: URL | string = import.meta.url): string {
  const filePath = fromFileUrl(moduleUrl);
  const moduleDir = dirname(filePath);
  const skillDir = basename(moduleDir) === "src" ? dirname(moduleDir) : moduleDir;
  return join(skillDir, "config.json");
}
