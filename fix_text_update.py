import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

new_timer_effect = """
  // GAMIFY: Global Timer Tick
  useEffect(() => {
    if (!excalidrawAPI) return;
    const interval = setInterval(() => {
      const elements = excalidrawAPI.getSceneElements();
      let hasChanges = false;
      let freezeGame = false;
      
      let newElements = [...elements];
      
      for (let i = 0; i < newElements.length; i++) {
        let el = newElements[i];
        if (el.customData?.isTimer && el.customData?.endTime) {
          const remaining = Math.max(0, Math.ceil((el.customData.endTime - Date.now()) / 1000));
          const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
          const secs = (remaining % 60).toString().padStart(2, '0');
          const timeText = `${mins}:${secs}`;
          
          if (remaining === 0 && !el.customData.hasFrozen) {
            freezeGame = true;
            el = { ...el, customData: { ...el.customData, hasFrozen: true }, version: (el.version || 0) + 1 };
            newElements[i] = el as any;
            hasChanges = true;
          }

          // Update bound text
          if (el.boundElements) {
             for (const bound of el.boundElements) {
               if (bound.type === "text") {
                 const textIndex = newElements.findIndex(e => e.id === bound.id);
                 if (textIndex !== -1) {
                    const textEl = newElements[textIndex];
                    if (textEl.text !== timeText) {
                       newElements[textIndex] = {
                         ...textEl,
                         text: timeText,
                         originalText: timeText,
                         version: (textEl.version || 0) + 1
                       } as any;
                       hasChanges = true;
                    }
                 }
               }
             }
          }
        }
      }

      if (freezeGame) {
        excalidrawAPI.setToast({ message: "Zeit abgelaufen! Karten sind eingefroren." });
        newElements = newElements.map(el => {
          if (el.customData?.isCard) {
            return { ...el, locked: true, version: (el.version || 0) + 1 };
          }
          return el;
        }) as any;
        excalidrawAPI.updateScene({ elements: newElements });
      } else if (hasChanges) {
        excalidrawAPI.updateScene({ elements: newElements });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [excalidrawAPI]);
"""

content = re.sub(r'// GAMIFY: Global Timer Tick.*?return \(\) => clearInterval\(interval\);\n  }, \[excalidrawAPI\]\);', new_timer_effect.strip(), content, flags=re.DOTALL)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
