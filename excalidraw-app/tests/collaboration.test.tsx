import { renderHook, waitFor } from '@testing-library/react';
    import { vi } from 'vitest';
    import { useCollaboration } from '../hooks/useCollaboration';
    import { GamifyCollaboration } from '../collaboration/GamifyCollaboration';
    import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
    import { useAtomValue } from 'jotai';
    

    // Mocken der GamifyCollaboration Klasse, um Netzwerkaufrufe zu verhindern
    // und die Methoden zu überwachen.
    jest.mock(
      '../collaboration/GamifyCollaboration', () => {
        // Mocken Sie die Klasse selbst als Jest-Funktion
        const MockGamifyCollaboration = vi.fn().mockImplementation(() => {
          // Mocken Sie hier alle Methoden, die im Hook aufgerufen werden
          return {
            onStatusChange: vi.fn(),
            start: vi.fn(),
            close: vi.fn(),
            onPointerUpdate: vi.fn(),
            // Fügen Sie hier weitere Methoden hinzu, die im Hook verwendet werden
            // z.B. setExcalidrawAPI: vi.fn(), falls es eine solche Methode gibt
          };
        });
        return { GamifyCollaboration: MockGamifyCollaboration };
      });

    vi.mock('jotai', async () => { // Added async
      // Behalte die Original-Jotai-Funktionen, falls andere verwendet werden
      const originalModule = await vi.importActual('jotai'); // Changed jest.requireActual to vi.importActual and added await
      return {
        __esModule: true, // Wichtig für ES Modules
        ...originalModule, // Exportiere alle anderen Original-Exporte
        useAtomValue: vi.fn(), // Changed jest.fn() to vi.fn()
      };
    });

    const mockExcalidrawAPI = {
      onPointerUpdate: jest.fn(),
      // Fügen Sie hier weitere benötigte Mock-Methoden der Excalidraw-API hinzu
    } as unknown as ExcalidrawImperativeAPI;

    test('sollte eine Kollaborations-Instanz erstellen und starten, wenn boardId und accessToken bereitgestellt werden', async () => {
      // Arrange
      // Setze den Mock-Wert für useAtomValue
      vi.mocked(useAtomValue).mockReturnValue({
        isLoggedIn: true,
        user: { id: 'test-user', email: 'test@example.com' },
        accessToken: 'mock-access-token', // Ein gültiger Mock-Token
      });

      const initialProps = {
        excalidrawAPI: mockExcalidrawAPI,
        boardId: 'board-123',
      };

      const { result } = renderHook(() => useCollaboration(initialProps.excalidrawAPI, initialProps.boardId));

      // Assert
      // Warten, bis der Effekt ausgeführt wurde und die Instanz erstellt ist.
      await waitFor(() => {
        // Überprüfen, ob der Konstruktor der Klasse aufgerufen wurde.
        console.log("Type of GamifyCollaboration:", typeof GamifyCollaboration);
        console.log("Is GamifyCollaboration a mock function?", jest.isMockFunction(GamifyCollaboration));
        expect(GamifyCollaboration).toHaveBeenCalledTimes(1);
      });

      // Überprüfen, ob die start-Methode auf der Instanz aufgerufen wurde.
      const mockInstance = (GamifyCollaboration as jest.Mock).mock.instances[0];
      expect(mockInstance.start).toHaveBeenCalledWith('board-123');
    });