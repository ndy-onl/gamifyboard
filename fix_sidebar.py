import re

with open('excalidraw-app/components/PropertiesSidebar.tsx', 'r') as f:
    content = f.read()

# Replace the handleElementTypeChange logic
old_handle = """  const handleElementTypeChange = (type: string) => {
    if (type === "counter") {
      onUpdate({ isCounter: true, isCard: false, isZone: false, isTimer: false, isTeleporter: false });
    } else if (type === "card") {
      onUpdate({ isCounter: false, isCard: true, isZone: false, isTimer: false, isTeleporter: false });
    } else if (type === "zone") {
      onUpdate({ isCounter: false, isCard: false, isZone: true, isTimer: false, isTeleporter: false });
    } else if (type === "timer") {
      onUpdate({ isCounter: false, isCard: false, isZone: false, isTimer: true, isTeleporter: false });
    } else if (type === "teleporter") {
      onUpdate({ isCounter: false, isCard: false, isZone: false, isTimer: false, isTeleporter: true });
    } else {
      onUpdate({ isCounter: false, isCard: false, isZone: false, isTimer: false, isTeleporter: false });
    }
  };

  const elementType = customData.isCounter
    ? "counter"
    : customData.isCard
    ? "card"
    : customData.isZone
    ? "zone"
    : customData.isTimer
    ? "timer"
    : customData.isTeleporter
    ? "teleporter"
    : "none";"""

new_handle = """  const handleElementTypeChange = (type: string) => {
    const base = { isCounter: false, isCard: false, isZone: false, isTimerDisplay: false, isTimerButton: false, isTeleporter: false };
    if (type === "counter") onUpdate({ ...base, isCounter: true });
    else if (type === "card") onUpdate({ ...base, isCard: true });
    else if (type === "zone") onUpdate({ ...base, isZone: true });
    else if (type === "timerDisplay") onUpdate({ ...base, isTimerDisplay: true });
    else if (type === "timerButton") onUpdate({ ...base, isTimerButton: true, timerAction: "start" });
    else if (type === "teleporter") onUpdate({ ...base, isTeleporter: true });
    else onUpdate({ ...base });
  };

  const elementType = customData.isCounter ? "counter"
    : customData.isCard ? "card"
    : customData.isZone ? "zone"
    : customData.isTimerDisplay ? "timerDisplay"
    : customData.isTimerButton ? "timerButton"
    : customData.isTeleporter ? "teleporter"
    : "none";"""

content = content.replace(old_handle, new_handle)

# Replace the UI options
old_options = """        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="timer"
              checked={elementType === "timer"}
              onChange={() => handleElementTypeChange("timer")}
            />
            Timer (Countdown)
          </label>
        </div>"""

new_options = """        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="timerDisplay"
              checked={elementType === "timerDisplay"}
              onChange={() => handleElementTypeChange("timerDisplay")}
            />
            Timer Anzeige
          </label>
        </div>
        <div>
          <label>
            <input
              type="radio"
              name="elementType"
              value="timerButton"
              checked={elementType === "timerButton"}
              onChange={() => handleElementTypeChange("timerButton")}
            />
            Timer Button (Start/Reset)
          </label>
        </div>"""

content = content.replace(old_options, new_options)

# Replace the timer settings UI
old_settings = """      {elementType === "timer" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Dauer (Sekunden):
          </label>
          <input
            type="number"
            placeholder="z.B. 300"
            defaultValue={customData.timerDuration || 300}
            onChange={(e) => onUpdate({ timerDuration: parseInt(e.target.value, 10) || 0 })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button onClick={() => onAction && onAction("startTimer")} style={{ padding: "5px 10px", cursor: "pointer", background: "#aaffaa" }}>
              Start Timer
            </button>
            <button onClick={() => onAction && onAction("resetTimer")} style={{ padding: "5px 10px", cursor: "pointer", background: "#ffaaaa" }}>
              Reset Freeze
            </button>
          </div>
        </div>
      )}"""

new_settings = """      {elementType === "timerDisplay" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Timer Name (z.B. "Level1"):
          </label>
          <input
            type="text"
            placeholder="Level1"
            defaultValue={customData.timerName || ""}
            onChange={(e) => onUpdate({ timerName: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "10px" }}>
            Dauer (Sekunden):
          </label>
          <input
            type="number"
            placeholder="z.B. 300"
            defaultValue={customData.timerDuration || 300}
            onChange={(e) => onUpdate({ timerDuration: parseInt(e.target.value, 10) || 0 })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
        </div>
      )}

      {elementType === "timerButton" && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>
            Ziel-Timer Name (z.B. "Level1"):
          </label>
          <input
            type="text"
            placeholder="Level1"
            defaultValue={customData.targetTimerName || ""}
            onChange={(e) => onUpdate({ targetTimerName: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.5rem", marginTop: "10px" }}>
            Aktion:
          </label>
          <select
            defaultValue={customData.timerAction || "start"}
            onChange={(e) => onUpdate({ timerAction: e.target.value })}
            style={{ width: "200px", marginBottom: "0.5rem" }}
          >
            <option value="start">Start</option>
            <option value="reset">Reset</option>
          </select>
        </div>
      )}"""

content = content.replace(old_settings, new_settings)

with open('excalidraw-app/components/PropertiesSidebar.tsx', 'w') as f:
    f.write(content)

