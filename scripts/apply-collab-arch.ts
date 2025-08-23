import { Project } from "ts-morph";

async function applyCollaborationArchitecture() {
  const project = new Project();
  project.addSourceFileAtPath("src/ExcalidrawBinding.ts");

  const bindingFile = project.getSourceFileOrThrow("src/ExcalidrawBinding.ts");

  // 1. Add necessary imports
  bindingFile.addImportDeclaration({
    moduleSpecifier: "@excalidraw/excalidraw",
    namedImports: ["convertToExcalidrawElements", "reconcileElements"],
  });

  bindingFile.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: "@excalidraw/excalidraw/types/element/types",
    namedImports: ["RemoteExcalidrawElement", "NonDeletedExcalidrawElement", "ExcalidrawElement"],
  });
  
  bindingFile.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: "@excalidraw/excalidraw/types/types",
    namedImports: ["AppState"],
  });

  // 2. Find and update the _onYjsChange method
  const onYjsChangeMethod = bindingFile.getClassOrThrow("ExcalidrawBinding")
    .getMethodOrThrow("_onYjsChange");

  onYjsChangeMethod.setBodyText(`if (transaction.origin === this) {
      return;
    }

    const plainObjects = this.yElements.toArray().map((yMap) => yMap.toJSON());
    const nonDeletedObjects = plainObjects.filter(
      (el) => !el.isDeleted,
    ) as Partial<NonDeletedExcalidrawElement>[];

    const hydratedElements = convertToExcalidrawElements(nonDeletedObjects);
    const remoteElements = hydratedElements as readonly RemoteExcalidrawElement[];

    const localElements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const appState = this.excalidrawAPI.getAppState();

    const reconciledElements = reconcileElements(
      remoteElements,
      localElements,
      appState,
    );

    this.excalidrawAPI.updateScene({ elements: reconciledElements });`);

  await project.save();
  console.log("Collaboration architecture applied successfully with correct type handling.");
}

applyCollaborationArchitecture().catch(console.error);
