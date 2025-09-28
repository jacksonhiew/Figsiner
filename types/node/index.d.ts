// Minimal Node.js type stubs required for the Vite config in offline CI.

declare const __dirname: string;

declare module 'node:path' {
  interface PathModule {
    resolve(...segments: string[]): string;
  }
  const path: PathModule;
  export default path;
}
