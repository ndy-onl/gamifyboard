import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

old_tick = """          if (remaining === 0 && !el.customData.hasFrozen) {
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
      }"""

new_tick = """          if (el.customData.timeText !== timeText) {
            el = { ...el, customData: { ...el.customData, timeText }, version: (el.version || 0) + 1 };
            newElements[i] = el as any;
            hasChanges = true;
          }

          if (remaining === 0 && !el.customData.hasFrozen) {
            freezeGame = true;
            el = { ...el, customData: { ...el.customData, hasFrozen: true }, version: (el.version || 0) + 1 };
            newElements[i] = el as any;
            hasChanges = true;
          }
        }
      }"""

content = content.replace(old_tick, new_tick)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
