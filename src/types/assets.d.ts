// Metro bundles SVG files as image assets; expo-image renders them.
declare module '*.svg' {
  const source: number;
  export default source;
}
