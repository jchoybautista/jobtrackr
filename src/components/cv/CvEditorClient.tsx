"use client";

import dynamic from "next/dynamic";

// Keep the editor client-only so the CV content forms never enter the server
// bundle — mirrors CvLibraryClient / ProfileEditorClient.
const Editor = dynamic(() => import("./CvEditorPage").then((m) => m.CvEditorPage), {
  ssr: false,
  loading: () => (
    <div className="p-8" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded-full bg-sunken" />
    </div>
  ),
});

export const CvEditorClient = ({ id }: { id: string }) => <Editor id={id} />;
