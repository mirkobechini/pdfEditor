"use client";

// Stato di apertura dei dialog/modal dell'editor desktop, estratto da
// useEditorState (file lunghi, refactor/long-files-t6-desktophooks).
// Centralizza tutti gli stati "XOpen" + deleteConfirm + printPreview cosi'
// useEditorState resta sotto le 400 righe e si concentra su logica/docs.

import React from "react";

export interface EditorDialogs {
  metadataOpen: boolean;
  setMetadataOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deleteConfirm: string | null;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<string | null>>;
  removePagesOpen: boolean;
  setRemovePagesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  reorderOpen: boolean;
  setReorderOpen: React.Dispatch<React.SetStateAction<boolean>>;
  splitOpen: boolean;
  setSplitOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mergeOpen: boolean;
  setMergeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  compressOpen: boolean;
  setCompressOpen: React.Dispatch<React.SetStateAction<boolean>>;
  importExportOpen: boolean;
  setImportExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  signOpen: boolean;
  setSignOpen: React.Dispatch<React.SetStateAction<boolean>>;
  ocrOpen: boolean;
  setOcrOpen: React.Dispatch<React.SetStateAction<boolean>>;
  printOptionsOpen: boolean;
  setPrintOptionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  printPreview: { dataUrl: string; isLandscape: boolean } | null;
  setPrintPreview: React.Dispatch<
    React.SetStateAction<{ dataUrl: string; isLandscape: boolean } | null>
  >;
  annotateOpen: boolean;
  setAnnotateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shareOpen: boolean;
  setShareOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lockOpen: boolean;
  setLockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  replaceTextOpen: boolean;
  setReplaceTextOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useEditorDialogs(): EditorDialogs {
  const [metadataOpen, setMetadataOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [removePagesOpen, setRemovePagesOpen] = React.useState(false);
  const [reorderOpen, setReorderOpen] = React.useState(false);
  const [splitOpen, setSplitOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [compressOpen, setCompressOpen] = React.useState(false);
  const [importExportOpen, setImportExportOpen] = React.useState(false);
  const [signOpen, setSignOpen] = React.useState(false);
  const [ocrOpen, setOcrOpen] = React.useState(false);
  const [printOptionsOpen, setPrintOptionsOpen] = React.useState(false);
  const [printPreview, setPrintPreview] = React.useState<{
    dataUrl: string;
    isLandscape: boolean;
  } | null>(null);
  const [annotateOpen, setAnnotateOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [lockOpen, setLockOpen] = React.useState(false);
  const [replaceTextOpen, setReplaceTextOpen] = React.useState(false);

  return {
    metadataOpen,
    setMetadataOpen,
    deleteConfirm,
    setDeleteConfirm,
    removePagesOpen,
    setRemovePagesOpen,
    reorderOpen,
    setReorderOpen,
    splitOpen,
    setSplitOpen,
    mergeOpen,
    setMergeOpen,
    compressOpen,
    setCompressOpen,
    importExportOpen,
    setImportExportOpen,
    signOpen,
    setSignOpen,
    ocrOpen,
    setOcrOpen,
    printOptionsOpen,
    setPrintOptionsOpen,
    printPreview,
    setPrintPreview,
    annotateOpen,
    setAnnotateOpen,
    shareOpen,
    setShareOpen,
    lockOpen,
    setLockOpen,
    replaceTextOpen,
    setReplaceTextOpen,
  };
}