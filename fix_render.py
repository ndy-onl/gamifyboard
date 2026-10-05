import re

with open('packages/element/src/renderElement.ts', 'r') as f:
    content = f.read()

old_rect = """    case "ellipse": {
      context.lineJoin = "round";
      context.lineCap = "round";

      rc.draw(ShapeCache.generateElementShape(element, renderConfig));
      break;
    }"""

new_rect = """    case "ellipse": {
      context.lineJoin = "round";
      context.lineCap = "round";

      rc.draw(ShapeCache.generateElementShape(element, renderConfig));
      
      if (element.customData?.isTimer && element.customData?.timeText) {
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
      }
      
      break;
    }"""

content = content.replace(old_rect, new_rect)

with open('packages/element/src/renderElement.ts', 'w') as f:
    f.write(content)

