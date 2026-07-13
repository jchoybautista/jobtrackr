"use client";

import dynamic from "next/dynamic";

// react-pdf's import chain (via downloadCv) must stay client-only — load the
// library with ssr:false so it never enters the server bundle.
const Lib = dynamic(() => import("./CvLibraryPage").then((m) => m.CvLibraryPage), {
  ssr: false,
  loading: () => (
    <div className="p-8" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded-full bg-sunken" />
    </div>
  ),
});

export const CvLibraryClient = () => <Lib />;
