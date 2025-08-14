import React, { useState } from "react";
import { useAtom } from "jotai";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { authAtom } from "../state/auth";
import { createBoard, getBoards, getBoard } from "../src/api"; // Import getBoard

interface GamifyUserMenuProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  onLoginClick: () => void;
  authPanelView: "login" | "register" | null;
  setAuthPanelView: (view: "login" | "register" | null) => void;
}

export const GamifyUserMenu: React.FC<GamifyUserMenuProps> = ({
  excalidrawAPI,
  onLoginClick,
  authPanelView,
  setAuthPanelView,
}) => {
  const [auth, setAuth] = useAtom(authAtom);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [boards, setBoards] = useState<any[]>([]); // State to store fetched boards

  const handleLogout = () => {
    setAuth({ user: null, accessToken: null });
    // TODO: Add a call to the /auth/logout endpoint
  };

  const handleSaveBoard = async () => {
    if (!excalidrawAPI || !auth.accessToken) {
      console.error(
        "Cannot save board: Excalidraw API not available or user not logged in.",
      );
      return;
    }

    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      // For simplicity, using a generic name. In a real app, you'd prompt for a name.
      const boardName = `My Board ${new Date().toLocaleString()}`;

      // Assuming board_data can store elements, appState, and files
      const boardData = { elements, appState, files };

      await createBoard(boardName, boardData);
      console.log("Board saved successfully!");
      // Optionally, close the menu or show a success message
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Failed to save board:", error);
      // Handle error, e.g., show an error message to the user
    }
  };

  const handleLoadBoard = async () => {
    if (!auth.accessToken) {
      console.error("Cannot load boards: User not logged in.");
      return;
    }
    try {
      const response = await getBoards();
      console.log("Loaded boards:", response.data);
      setBoards(response.data); // Store fetched boards in state
      // TODO: Display boards to the user and allow selection
      // setIsMenuOpen(false); // Keep menu open to display boards
    } catch (error) {
      console.error("Failed to load boards:", error);
    }
  };

  const handleSelectBoard = async (boardId: string) => {
    if (!excalidrawAPI || !auth.accessToken) {
      console.error(
        "Cannot load board: Excalidraw API not available or user not logged in.",
      );
      return;
    }
    try {
      const response = await getBoard(boardId);
      const boardData = response.data.data; // Assuming board data is in response.data.data

      if (boardData && boardData.elements && boardData.appState) {
        // Ensure collaborators is an object to prevent forEach error
        const loadedAppState = {
          ...boardData.appState,
          collaborators: new Map(
            Object.entries(boardData.appState.collaborators || {}),
          ),
        };

        excalidrawAPI.updateScene({
          elements: boardData.elements,
          appState: loadedAppState,
          files: boardData.files || {},
        });
        console.log(`Board "${response.data.name}" loaded successfully!`);
      } else {
        console.error("Invalid board data received:", boardData);
      }
      setIsMenuOpen(false); // Close menu after loading
      setBoards([]); // Clear boards from state
    } catch (error) {
      console.error("Failed to load selected board:", error);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {auth.accessToken ? (
        <>
          <button
            className="excalidraw-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            Gamify
          </button>
          {isMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "10px",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <button className="excalidraw-button" onClick={handleSaveBoard}>
                Save Board
              </button>
              <button className="excalidraw-button" onClick={handleLoadBoard}>
                Load Board
              </button>
              {boards.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #eee",
                    paddingTop: "5px",
                    marginTop: "5px",
                  }}
                >
                  <h4>Your Boards:</h4>
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      className="excalidraw-button"
                      onClick={() => handleSelectBoard(board.id)}
                      style={{ textAlign: "left" }}
                    >
                      {board.name}
                    </button>
                  ))}
                </div>
              )}
              <button className="excalidraw-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </>
      ) : (
        <button className="excalidraw-button" onClick={onLoginClick}>
          Login
        </button>
      )}
    </div>
  );
};
