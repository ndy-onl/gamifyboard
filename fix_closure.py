import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

old = """            if (stateElement && stateElement.customData?.isEditMode !== undefined) {
               if (stateElement.customData.isEditMode !== isEditMode) {
                  setIsEditMode(stateElement.customData.isEditMode);
               }
            }"""

new = """            if (stateElement && stateElement.customData?.isEditMode !== undefined) {
               setIsEditMode(prev => {
                  if (prev !== stateElement.customData.isEditMode) return stateElement.customData.isEditMode;
                  return prev;
               });
            }"""

content = content.replace(old, new)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)
