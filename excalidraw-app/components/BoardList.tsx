import React, { useState, useEffect } from 'react';
import { getBoards, createBoard, deleteBoard } from '../api';

interface BoardListProps {
  token: string;
  onSelectBoard: (boardId: string) => void;
}

const BoardList: React.FC<BoardListProps> = ({ token, onSelectBoard }) => {
  const [boards, setBoards] = useState<any[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoards();
  }, [token]);

  const fetchBoards = async () => {
    try {
      const response = await getBoards(token);
      setBoards(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch boards');
    }
  };

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createBoard(newBoardName, {}, token);
      setNewBoardName('');
      fetchBoards();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create board');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    setError(null);
    try {
      await deleteBoard(boardId, token);
      fetchBoards();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete board');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Your Boards</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleCreateBoard} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="New Board Name"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          required
          style={{ width: 'calc(100% - 100px)', padding: '8px', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Create Board
        </button>
      </form>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {boards.map((board) => (
          <li key={board.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ cursor: 'pointer', color: '#007bff' }} onClick={() => onSelectBoard(board.id)}>{board.name}</span>
            <button onClick={() => handleDeleteBoard(board.id)} style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BoardList;
