import React from "react";
import { useAtom } from "jotai";
import { shareDialogStateAtom } from "./share/ShareDialog";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";

export const TestShareDialog = () => {
  const [shareDialogState, setShareDialogState] = useAtom(shareDialogStateAtom);

  return (
    <div>
      <button onClick={() => setShareDialogState({ isOpen: true, type: "share" })}>
        Open Share Dialog
      </button>
      {shareDialogState.isOpen && (
        <Dialog onCloseRequest={() => setShareDialogState({ isOpen: false })} title="Share Dialog">
          <p>This is a test share dialog.</p>
        </Dialog>
      )}
    </div>
  );
};