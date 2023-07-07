import type { ChildProcess } from "child_process";
import type { ConfigT } from "metro-config";
import fetch from "node-fetch";
import type opn from "open";
import * as os from "os";
import * as path from "path";
import open from "../vendor/open-8.4.2";
import type { CLIStartOptions, PageDescription } from "./types";

type App = opn.App & {
  __workaroundNotAllowedToLoadLocalResource: boolean;
};

function configureBrowser(
  name: string | readonly string[],
  projectRoot: string
): App {
  const userDataDir = path.join(
    projectRoot,
    "node_modules",
    ".cache",
    "rnx-devtools"
  );
  return {
    name,
    arguments: [
      "--no-default-browser-check",
      "--no-first-run",
      `--user-data-dir=${userDataDir}`,
    ],
    __workaroundNotAllowedToLoadLocalResource: true,
  };
}

async function openUrl(url: string, app: App): Promise<number | null> {
  // Chrome/Edge fails to load DevTools unless it has been opened at least once.
  // Workaround: open devtools://devtools without parameters first
  const targets = app["__workaroundNotAllowedToLoadLocalResource"]
    ? [url.split("?")[0], url]
    : url;
  const process: ChildProcess = await open(targets, { app });
  return await new Promise((resolve) => {
    process.on("exit", (exitCode) => resolve(exitCode));
  });
}

export function buildDevServerUrl(
  options: CLIStartOptions,
  metroConfig: ConfigT
): URL {
  const protocol = options.https ? "https" : "http";
  const host = options.host || os.hostname();
  const port = metroConfig.server.port;
  return new URL(`${protocol}://${host}:${port}`);
}

export function fetchConnectedApps(
  options: CLIStartOptions,
  metroConfig: ConfigT
): Promise<PageDescription> {
  const url = buildDevServerUrl(options, metroConfig);
  url.pathname = "/json/list";
  return fetch(url.href).then((response) => response.json());
}

export async function openDevTools(
  config: { root: string },
  { devtoolsFrontendUrl }: PageDescription
): Promise<void> {
  const browsers = [
    // @ts-expect-error 'chrome' does not exist on type '{}'
    configureBrowser(open.apps.chrome, config.root),
    // @ts-expect-error 'edge' does not exist on type '{}'
    configureBrowser(open.apps.edge, config.root),
  ];

  for (const app of browsers) {
    const exitCode = await openUrl(devtoolsFrontendUrl, app);
    if (exitCode === 0) {
      break;
    }
  }
}
