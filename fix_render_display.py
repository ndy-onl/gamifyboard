import re

with open('packages/element/src/renderElement.ts', 'r') as f:
    content = f.read()

content = content.replace("element.customData?.isTimer", "element.customData?.isTimerDisplay")

with open('packages/element/src/renderElement.ts', 'w') as f:
    f.write(content)

