import re

with open('excalidraw-app/App.tsx', 'r') as f:
    content = f.read()

# 1. triggerAction
old_trigger = """    if (action === "startTimer") {
      const duration = targetElement.customData?.timerDuration || 300;
      const newSceneElements = sceneElements.map(el => 
        el.id === targetElement.id ? { ...el, customData: { ...el.customData, endTime: Date.now() + duration * 1000, hasFrozen: false }, version: (el.version || 0) + 1 } : el
      );
      excalidrawAPI.updateScene({ elements: newSceneElements as any });
    } else if (action === "teleport") {"""

new_trigger = """    if (action === "startTimer" || action === "resetTimer") {
      const targetTimerName = targetElement.customData?.targetTimerName;
      if (!targetTimerName) return;

      let newSceneElements = [...sceneElements];
      let found = false;

      newSceneElements = newSceneElements.map(el => {
        if (el.customData?.isTimerDisplay && el.customData?.timerName === targetTimerName) {
           found = true;
           if (action === "startTimer") {
              const duration = el.customData.timerDuration || 300;
              return { ...el, customData: { ...el.customData, endTime: Date.now() + duration * 1000, hasFrozen: false }, version: (el.version || 0) + 1 };
           } else {
              // reset
              return { ...el, customData: { ...el.customData, endTime: null, hasFrozen: false, timeText: "" }, version: (el.version || 0) + 1 };
           }
        }
        return el;
      });

      if (action === "resetTimer" && found) {
         // Also unlock all cards!
         newSceneElements = newSceneElements.map(el => {
           if (el.customData?.isCard) {
              return { ...el, locked: false, version: (el.version || 0) + 1 };
           }
           return el;
         });
      }

      if (found) {
        excalidrawAPI.updateScene({ elements: newSceneElements as any });
      } else {
        excalidrawAPI.setToast({ message: "Timer '" + targetTimerName + "' nicht gefunden!", color: "danger" });
      }
    } else if (action === "teleport") {"""

content = content.replace(old_trigger, new_trigger)

# 2. handleAction mapping
old_handle = """    if (action === "startTimer") {
      triggerAction("startTimer", element);
    } else if (action === "resetTimer") {
      handleUpdateElement({ endTime: null, hasFrozen: false });
      let newSceneElements = [...sceneElements];
      newSceneElements = newSceneElements.map(el => {
        if (el.customData?.isCard) {
          return { ...el, locked: false, version: (el.version || 0) + 1 };
        }
        return el;
      });
      excalidrawAPI.updateScene({ elements: newSceneElements as any });
    } else if (action === "teleport") {"""

new_handle = """    if (action === "startTimer" || action === "resetTimer") {
      triggerAction(action, element);
    } else if (action === "teleport") {"""

content = content.replace(old_handle, new_handle)

# 3. onPointerDown
old_pointer = """             if (hitElement.customData.isTeleporter) {
                triggerAction("teleport", hitElement as NonDeletedExcalidrawElement);
             } else if (hitElement.customData.isTimer) {
                triggerAction("startTimer", hitElement as NonDeletedExcalidrawElement);
             }"""

new_pointer = """             if (hitElement.customData.isTeleporter) {
                triggerAction("teleport", hitElement as NonDeletedExcalidrawElement);
             } else if (hitElement.customData.isTimerButton) {
                triggerAction(hitElement.customData.timerAction === "reset" ? "resetTimer" : "startTimer", hitElement as NonDeletedExcalidrawElement);
             }"""

content = content.replace(old_pointer, new_pointer)

# 4. setInterval
old_tick = """        if (el.customData?.isTimer && el.customData?.endTime) {"""
new_tick = """        if (el.customData?.isTimerDisplay && el.customData?.endTime) {"""

content = content.replace(old_tick, new_tick)

with open('excalidraw-app/App.tsx', 'w') as f:
    f.write(content)

