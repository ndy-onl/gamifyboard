import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

old_logic = """          if (
            appState.selectedElementIds &&
            Object.keys(appState.selectedElementIds).length > 0
          ) {
            const selectedIds = Object.keys(appState.selectedElementIds);
            const els = elements.filter((el) => selectedIds.includes(el.id));
            setSelectedElements(els as NonDeletedExcalidrawElement[]);
          } else {
            setSelectedElements([]);
          }"""

new_logic = """          if (
            appState.selectedElementIds &&
            Object.keys(appState.selectedElementIds).length > 0
          ) {
            const selectedIds = Object.keys(appState.selectedElementIds);
            const currentSelectedIds = selectedElements.map(el => el.id);
            if (
              selectedIds.length !== currentSelectedIds.length ||
              !selectedIds.every(id => currentSelectedIds.includes(id)) ||
              // Also check if version changed (e.g., customData was updated)
              !selectedElements.every(el => {
                const newEl = elements.find(e => e.id === el.id);
                return newEl && newEl.version === el.version;
              })
            ) {
              const els = elements.filter((el) => selectedIds.includes(el.id));
              setSelectedElements(els as NonDeletedExcalidrawElement[]);
            }
          } else if (selectedElements.length > 0) {
            setSelectedElements([]);
          }"""

content = content.replace(old_logic, new_logic)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
