import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

timer_effect = """
  // GAMIFY: Global Timer Tick
  useEffect(() => {
    if (!excalidrawAPI) return;
    const interval = setInterval(() => {
      const elements = excalidrawAPI.getSceneElements();
      let hasChanges = false;
      let freezeGame = false;
      
      const newElements = elements.map(el => {
        if (el.customData?.isTimer && el.customData?.endTime) {
          const remaining = Math.max(0, Math.ceil((el.customData.endTime - Date.now()) / 1000));
          const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
          const secs = (remaining % 60).toString().padStart(2, '0');
          const timeText = `${mins}:${secs}`;
          
          if (remaining === 0 && !el.customData.hasFrozen) {
            freezeGame = true;
            el = { ...el, customData: { ...el.customData, hasFrozen: true }, version: (el.version || 0) + 1 };
            hasChanges = true;
          }

          // find bound text element
          if (el.boundElements) {
             for (const bound of el.boundElements) {
               if (bound.type === "text") {
                 const textEl = elements.find(e => e.id === bound.id);
                 if (textEl && textEl.text !== timeText) {
                    // Updating text requires more than just text property in Excalidraw, but for MVP this might work if we just dispatch updateScene
                    // Actually, Excalidraw doesn't auto-resize if we just change text via updateScene without re-measuring. But fixed width is ok.
                 }
               }
             }
          }
        }
        return el;
      });

      if (freezeGame) {
        excalidrawAPI.setToast({ message: "Zeit abgelaufen! Karten sind eingefroren." });
        const frozenElements = newElements.map(el => {
          if (el.customData?.isCard) {
            return { ...el, locked: true, version: (el.version || 0) + 1 };
          }
          return el;
        });
        excalidrawAPI.updateScene({ elements: frozenElements });
      } else if (hasChanges) {
        excalidrawAPI.updateScene({ elements: newElements });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [excalidrawAPI]);
"""

# Insert before 'const isCloudExportWindow ='
content = content.replace("const isCloudExportWindow =", timer_effect + "\n  const isCloudExportWindow =")

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
