import React, { useEffect, useState } from "react";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";
import { getBoards, deleteBoard } from "../src/api";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";

export const BoardListDialog = ({
  onClose,
  onLoadBoard,
  onLoadFromFile,
}: {
  onClose: () => void;
  onLoadBoard: (boardId: string) => void;
  onLoadFromFile: () => void;
}) => {
  const [boards, setBoards] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = async () => {
    try {
      const response = await getBoards();
      setBoards(response.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleDelete = async (boardId: string) => {
    if (window.confirm("Are you sure you want to delete this board?")) {
      try {
        await deleteBoard(boardId);
        // Optimistic UI update: remove the board from the local state
        // without needing to re-fetch the entire list.
        setBoards((prevBoards) => prevBoards.filter((board) => board.id !== boardId));
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  return (
    <Dialog onCloseRequest={onClose} title="Open">
      <div className="ExportDialog-cards">
        
        <div className="Card color-pink">
          <h2>Load from GamifyBoard Pro</h2>
          <div className="board-list">
            {error && <div className="error">{error}</div>}
            {boards.map((board) => (
              <div key={board.id} className="board-list-item">
                <span>{board.name}</span>
                <div className="board-list-item-buttons">
                  <ToolButton
                    type="button"
                    title="Load"
                    aria-label="Load"
                    onClick={() => onLoadBoard(board.id)}
                  >
                    Load
                  </ToolButton>
                  <ToolButton
                    type="button"
                    title="Delete"
                    aria-label="Delete"
                    onClick={() => handleDelete(board.id)}
                  >
                    Delete
                  </ToolButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
};