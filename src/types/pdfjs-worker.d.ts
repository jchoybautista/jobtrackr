// Ambient declaration for Turbopack/webpack's `?url` import suffix, used to
// resolve the pdfjs-dist worker file to a loadable URL string. pdfjs-dist
// ships no types for this synthetic specifier.
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const workerUrl: string;
  export default workerUrl;
}
