export type CLIStartOptions = {
  port: number;
  host: string;
  projectRoot?: string;
  watchFolders?: string[];
  assetPlugins?: string[];
  sourceExts?: string[];
  maxWorkers?: number;
  resetCache?: boolean;
  customLogReporterPath?: string;
  https?: boolean;
  key?: string;
  cert?: string;
  config?: string;
  interactive: boolean;
  id?: string;
};

export type PageDescription = {
  id: string,
  description: string,
  title: string,
  faviconUrl: string,
  devtoolsFrontendUrl: string,
  type: string,
  webSocketDebuggerUrl: string,
};
