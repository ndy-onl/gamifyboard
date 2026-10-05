import re

with open('packages/element/src/renderElement.ts', 'r') as f:
    content = f.read()

old_rect = """      if (element.customData?.isTimer && element.customData?.timeText) {
        const text = element.customData.timeText;
        const fontSize = element.height * 0.4;
        context.font = getFontString({
          fontSize,
          fontFamily: 1, // Default font family
        });
        context.fillStyle = element.strokeColor;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, element.width / 2, element.height / 2);
      }"""

new_rect = """      if (element.customData?.isTimer) {
        let text = element.customData?.timeText;
        if (!text) {
          const duration = element.customData?.timerDuration || 300;
          const mins = Math.floor(duration / 60).toString().padStart(2, '0');
          const secs = (duration % 60).toString().padStart(2, '0');
          text = `${mins}:${secs}`;
        }
        const fontSize = element.height * 0.4;
        context.font = getFontString({
          fontSize,
          fontFamily: 1, // Default font family
        });
        context.fillStyle = element.strokeColor;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, element.width / 2, element.height / 2);
      }"""

content = content.replace(old_rect, new_rect)

with open('packages/element/src/renderElement.ts', 'w') as f:
    f.write(content)
