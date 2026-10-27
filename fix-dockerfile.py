with open("Dockerfile", "r") as f:
    content = f.read()

content = content.replace(
    "VITE_APP_GIT_SHA=$SOURCE_COMMIT VITE_APP_ENABLE_TRACKING=false",
    "cd .. && node ./patch-y-excalidraw.sh && cd excalidraw-app && \\\n    VITE_APP_GIT_SHA=$SOURCE_COMMIT VITE_APP_ENABLE_TRACKING=false"
)

with open("Dockerfile", "w") as f:
    f.write(content)
