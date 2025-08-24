import {
  Excalidraw,
  LiveCollaborationTrigger,
  TTDDialogTrigger,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import { trackEvent } from "@excalidraw/excalidraw/analytics";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  CommandPalette,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@excalidraw/excalidraw/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import { ShareableLinkDialog } from "@excalidraw/excalidraw/components/ShareableLinkDialog";
import Trans from "@excalidraw/excalidraw/components/Trans";
import {
  EVENT,
  THEME,
  VERSION_TIMEOUT,
  getFrame,
  getVersion,
  isDevEnv,
  isTestEnv,
  isRunningInIframe,
  preventUnload,
  resolvablePromise,
} from "@excalidraw/common";
import polyfill from "@excalidraw/excalidraw/polyfill";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useCallbackRefState } from "@excalidraw/excalidraw/hooks/useCallbackRefState";
import { t } from "@excalidraw/excalidraw/i18n";

import {
  saveAs,
} from "@excalidraw/excalidraw/components/icons";

import { isElementLink } from "@excalidraw/element";

import { restore } from "@excalidraw/excalidraw/data/restore";
import { newElementWith } from "@excalidraw/element";
import { useHandleLibrary } from "@excalidraw/excalidraw/data/library";

import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
import type {
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ResolvablePromise } from "@excalidraw/common/utils";

import {
  Provider,
  appJotaiStore,
  useAtom,
  useAtomValue,
  useSetAtom,
} from "./app-jotai";

import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import {
  ExportToExcalidrawPlus,
} from "./components/ExportToExcalidrawPlus";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  loadScene,
} from "./data";

import { importFromLocalStorage } from "./data/localStorage";

import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
} from "./data/LocalData";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import CollabError, { collabErrorIndicatorAtom, ErrorIndicator } from "./collab/CollabError";

import { useHandleAppTheme } from "./useHandleAppTheme";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
} from "./components/DebugCanvas";
import { AIComponents } from "./components/AI";
import { ExcalidrawPlusIframeExport } from "./ExcalidrawPlusIframeExport";
import { PropertiesSidebar } from "./components/PropertiesSidebar";
import { GamifyToolbar } from "./components/GamifyToolbar";
import AuthPanel from './components/AuthPanel';
import './components/Modal.scss';


import "./index.scss";

import { getBoard, createBoard } from './src/api';
import { authStatusAtom, logoutActionAtom } from "./state/authAtoms";
import { BoardListDialog } from "./components/BoardListDialog";
import { actionLoadScene } from "@excalidraw/excalidraw/actions";
import { Card } from "@excalidraw/excalidraw/components/Card";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { yjsToExcalidraw } from "@ndy-onl/y-excalidraw";
import {
  applyElementOperations,
  getDeltaOperationsForElements,
} from "@ndy-onl/y-excalidraw/dist/diff";

const SaveToProDialog = ({
  excalidrawAPI,
  onSuccess,
  onError,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  onSuccess: () => void;
  onError: (error: Error) => void;
}) => {
  const [boardName, setBoardName] = useState(excalidrawAPI.getName());

  const onSave = async () => {
    if (!excalidrawAPI) {
      onError(new Error("Excalidraw API not available"));
      return;
    }
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      await createBoard(boardName, { elements, appState, files });
      onSuccess();
    } catch (error: any) {
      onError(error);
    }
  };

  return (
    <Card color="pink">
      <div className="Card-icon">{saveAs}</div>
      <h2>Save to GamifyBoard Pro</h2>
      <div className="Card-details">
        Save your board to the GamifyBoard cloud to collaborate and share.
      </div>
      <input
        type="text"
        value={boardName}
        onChange={(e) => setBoardName(e.target.value)}
        placeholder="Board name"
      />
      <ToolButton
        className="Card-button"
        type="button"
        title="Save to GamifyBoard Pro"
        aria-label="Save to GamifyBoard Pro"
        showAriaLabel={true}
        onClick={onSave}
      >
        Save
      </ToolButton>
    </Card>
  );
};

const checkGameState = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  elements: readonly any[] | null,
) => {
  // ... (checkGameState implementation remains the same)
};

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

let pwaEvent: BeforeInstallPromptEvent | null = null;

window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    event.preventDefault();
    pwaEvent = event;
  },
);

let isSelfEmbedding = false;
if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const initializeScene = async (opts: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  selectedBoardId: string | null;
  token: string | null;
}): Promise<
  { scene: ExcalidrawInitialDataState | null } & (
    | { isExternalScene: true; id?: string; key?: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  
  const localDataState = importFromLocalStorage();

  let scene: RestoredDataState & {
    scrollToContent?: boolean;
  } = await loadScene(null, null, localDataState);

  const boardIdToLoad = id || opts.selectedBoardId;
  if (boardIdToLoad) {
    return { 
      scene: {
        ...scene,
        elements: [],
        appState: { ...scene.appState, showWelcomeScreen: false },
      }, 
      isExternalScene: true 
    };
  }

  return { scene, isExternalScene: false };
};

const renderTopRightUI = ({ 
  isMobile,
  collabError,
  isCollabDisabled,
  setShareDialogState,
  isLoggedIn,
  loggedInUiState,
  handleLogout,
  onLoginClick,
  excalidrawAPI,
}: {
  isMobile: boolean;
  collabError: ErrorIndicator;
  isCollabDisabled: boolean;
  setShareDialogState: (state: { isOpen: boolean; type: "share" | "collaborationOnly" }) => void;
  isLoggedIn: boolean;
  loggedInUiState: boolean;
  handleLogout: () => void;
  onLoginClick: () => void;
  excalidrawAPI: ExcalidrawImperativeAPI;
}) => {
  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {collabError.message && <CollabError collabError={collabError} />}
      <button
        className="excalidraw-button collab-button"
        onClick={() => setShareDialogState({ isOpen: true, type: "share" })}
        style={{ padding: "8px 16px" }}
      >
        Share
      </button>
      <div style={{ display: "flex", gap: "10px" }}>
        {isLoggedIn || loggedInUiState ? (
          <button className="excalidraw-button collab-button" onClick={handleLogout} style={{ padding: "8px 16px", width: "54px" }}>
            Logout
          </button>
        ) : (
          <button className="excalidraw-button collab-button" onClick={onLoginClick} style={{ padding: "8px 16px", width: "54px" }}>
            Login
          </button>
        )}
      </div>
      {excalidrawAPI && <GamifyToolbar excalidrawAPI={excalidrawAPI} />}
    </div>
  );
};

const ExcalidrawWrapper = ({
  setExcalidrawAPI,
  onExcalidrawAPISet,
  onLoginClick,
  authPanelView,
  setAuthPanelView,
  onLoginSuccess,
  onLogoutSuccess,
}: {
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI) => void;
  onExcalidrawAPISet: (api: ExcalidrawImperativeAPI) => void;
  onLoginClick: () => void;
  authPanelView: "login" | "register" | null;
  setAuthPanelView: (view: "login" | "register" | null) => void;
  onLoginSuccess: () => void;
  onLogoutSuccess: () => void;
}) => {
  const [isBoardListDialogOpen, setIsBoardListDialogOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("id");
  });

  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isApplyingRemoteChangesRef = useRef(false);
  const lastKnownElementsRef = useRef<readonly OrderedExcalidrawElement[]>([]);

  useEffect(() => {
    if (!excalidrawAPI || !selectedBoardId) {
      return;
    }

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      import.meta.env.VITE_APP_SOCKET_URL || "ws://localhost:3001",
      selectedBoardId,
      ydoc,
    );
    const yElements = ydoc.getArray<Y.Map<any>>("elements");
    const awareness = provider.awareness;

    ydocRef.current = ydoc;
    providerRef.current = provider;

    const onRemoteChanges = () => {
      console.log("[YJS] Remote changes received. Applying to Excalidraw.");
      isApplyingRemoteChangesRef.current = true;
      const remoteElements = yjsToExcalidraw(yElements);
      console.log("[YJS] Transformed remote elements:", JSON.stringify(remoteElements, null, 2));
      lastKnownElementsRef.current = remoteElements;
      excalidrawAPI.updateScene({
        elements: remoteElements,
        captureUpdate: false,
      });
      console.log("[YJS] excalidrawAPI.updateScene called.");
      setTimeout(() => {
        isApplyingRemoteChangesRef.current = false;
      }, 0);
    };

    const onAwarenessChange = () => {
      excalidrawAPI.updateScene({ collaborators: awareness.getStates() });
    };

    yElements.observeDeep(onRemoteChanges);
    awareness.on("change", onAwarenessChange);

    onRemoteChanges();

    return () => {
      yElements.unobserveDeep(onRemoteChanges);
      awareness.off("change", onAwarenessChange);
      provider.destroy();
      ydoc.destroy();
    };
  }, [excalidrawAPI, selectedBoardId]);

  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (isApplyingRemoteChangesRef.current) {
      return;
    }

    if (ydocRef.current) {
      const { operations, lastKnownElements } = getDeltaOperationsForElements(
        lastKnownElementsRef.current,
        elements,
      );
      
      lastKnownElementsRef.current = lastKnownElements;

      if (operations && operations.length > 0) {
        Y.transact(
          ydocRef.current,
          () => {
            const yElements = ydocRef.current!.getArray<Y.Map<any>>("elements");
            applyElementOperations(yElements, operations);
          },
          "local",
        );
      }
    }

    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;
          const sceneElements = excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (
                LocalData.fileStorage.shouldUpdateImageElementStatus(element)
              ) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) {
                  didChange = true;
                }
                return newElement;
              }
              return element;
            });

          if (didChange) {
            excalidrawAPI.updateScene({
              elements: sceneElements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    if (
      appState.selectedElementIds &&
      Object.keys(appState.selectedElementIds).length === 1
    ) {
      const selectedId = Object.keys(appState.selectedElementIds)[0];
      const element = elements.find((el) => el.id === selectedId);
      if (element) {
        setSelectedElement(element as NonDeletedExcalidrawElement);
      } else {
        setSelectedElement(null);
      }
    } else {
      setSelectedElement(null);
    }
  };

  const onLoadBoard = (boardId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", boardId);
    window.history.pushState({}, "", url);
    setSelectedBoardId(boardId);
    setIsBoardListDialogOpen(false);
  };

  const handleLoadFromFile = () => {
    if (!excalidrawAPI) {
      return;
    }
    setIsBoardListDialogOpen(false);
    excalidrawAPI.actionManager.executeAction(actionLoadScene);
  };

  const handleSaveToCloud = async () => {
    if (!excalidrawAPI) {
      return;
    }
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      const name = excalidrawAPI.getName() || "Untitled";
      await createBoard(name, { elements, appState, files });
      excalidrawAPI.setToast({ message: "Board saved successfully!" });
    } catch (error: any) {
      excalidrawAPI.setToast({ message: "Failed to save board.", color: "danger" });
      console.error(error);
    }
  };
  const isInitialLoadRef = useRef(true);
  const [selectedElement, setSelectedElement] =
    useState<NonDeletedExcalidrawElement | null>(null);
  const { isLoggedIn, accessToken } = useAtomValue(authStatusAtom);
  const setLogoutAction = useSetAtom(logoutActionAtom);

  const handleLogout = async () => {
    await setLogoutAction(onLogoutSuccess);
  };
  const [errorMessage, setErrorMessage] = useState("");
  const isCollabDisabled = isRunningInIframe();
  const [loggedInUiState, setLoggedInUiState] = useState(false);

  const authPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authPanelRef.current && !authPanelRef.current.contains(event.target as Node)) {
        if (authPanelView) {
          setAuthPanelView(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [authPanelView, setAuthPanelView]);

  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();
  const [langCode] = useAppLangCode();

  const initialStatePromiseRef = useRef<{ 
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  useEffect(() => {
    if (excalidrawAPI) {
      setExcalidrawAPI(excalidrawAPI);
      onExcalidrawAPISet(excalidrawAPI);
      if (isTestEnv()) {
        (window as any).ExcalidrawAPI = excalidrawAPI;
        (window as any).ExcalidrawHandle = {
          excalidrawAPI,
          checkGameState: (elements: readonly any[] | null) =>
            checkGameState(excalidrawAPI, elements),
        };
      }
    }
  }, [excalidrawAPI, setExcalidrawAPI, onExcalidrawAPISet]);

  const [shareDialogState, setShareDialogState] = useAtom(shareDialogStateAtom);
  const collabError = useAtomValue(collabErrorIndicatorAtom);

  useHandleLibrary({
    excalidrawAPI,
    adapter: LibraryIndexedDBAdapter,
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    initializeScene({
      excalidrawAPI,
      selectedBoardId,
      token: accessToken,
    }).then(async (data) => {
      if (isInitialLoadRef.current) {
        initialStatePromiseRef.current.promise.resolve(data.scene);
        isInitialLoadRef.current = false;
      } else {
        if (data.scene) {
          excalidrawAPI.updateScene({
            ...data.scene,
            ...restore(data.scene, null, null, { repairBindings: true }),
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
        }
      }
    });
  }, [excalidrawAPI, selectedBoardId, accessToken]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();

      if (
        excalidrawAPI &&
        LocalData.fileStorage.shouldPreventUnload(
          excalidrawAPI.getSceneElements(),
        )
      ) {
        if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
          preventUnload(event);
        }
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [excalidrawAPI]);

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(
    null,
  );

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (url) {
        setLatestShareableLink(url);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error(error);
        throw new Error(error.message);
      }
    }
  };

  const handleUpdateElement = (updatedData: any) => {
    if (!excalidrawAPI || !selectedElement) {
      return;
    }

    const sceneElements = excalidrawAPI.getSceneElements();
    const elementIndex = sceneElements.findIndex(
      (el) => el.id === selectedElement.id,
    );
    if (elementIndex === -1) {
      return;
    }

    const newCustomData = { ...selectedElement.customData, ...updatedData };

    if (newCustomData.isCounter && selectedElement.type !== "counter") {
      const newElement = {
        ...selectedElement,
        type: "counter" as const,
        customData: { ...newCustomData, value: 0 },
      };
      const newSceneElements = [
        ...sceneElements.slice(0, elementIndex),
        newElement,
        ...sceneElements.slice(elementIndex + 1),
      ];
      excalidrawAPI.updateScene({ elements: newSceneElements });
      setSelectedElement(newElement as NonDeletedExcalidrawElement);
      return;
    }

    const updatedElement = {
      ...selectedElement,
      customData: newCustomData,
      strokeStyle: (newCustomData.isZone ? "dashed" : "solid") as any,
      backgroundColor: selectedElement.backgroundColor,
    };

    const newSceneElements = [
      ...sceneElements.slice(0, elementIndex),
      updatedElement,
      ...sceneElements.slice(elementIndex + 1),
    ];

    excalidrawAPI.updateScene({ elements: newSceneElements });
    setSelectedElement(updatedElement as NonDeletedExcalidrawElement);
  };

  const renderCustomStats = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: UIAppState,
  ) => {
    return (
      <CustomStats
        setToast={(message) => excalidrawAPI!.setToast({ message })}
        appState={appState}
        elements={elements}
      />
    );
  };

  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%" }}
      className="excalidraw-app"
    >
      <Excalidraw
        excalidrawAPI={excalidrawRefCallback}
        onChange={onChange}
        onPointerUp={() => {
          if (excalidrawAPI) {
            checkGameState(excalidrawAPI, excalidrawAPI.getSceneElements());
          }
        }}
        initialData={initialStatePromiseRef.current.promise}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            saveToActiveFile: false,
            export: {
              onExportToBackend,
              renderCustomUI: (elements, appState, files) => {
                if (!excalidrawAPI) {
                  return null;
                }
                return (
                  <Provider store={appJotaiStore}>
                    <SaveToProDialog
                      excalidrawAPI={excalidrawAPI}
                      onSuccess={() => {
                        excalidrawAPI.updateScene({
                          appState: {
                            openDialog: null,
                            toast: { message: "Board saved successfully!" },
                          },
                        });
                      }}
                      onError={(error) => {
                        excalidrawAPI.updateScene({
                          appState: {
                            errorMessage: error.message,
                          },
                        });
                      }}
                    />
                  </Provider>
                );
              },
            },
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        renderTopRightUI={(isMobile) => {
          return renderTopRightUI({
            isMobile,
            collabError,
            isCollabDisabled,
            setShareDialogState,
            isLoggedIn,
            loggedInUiState,
            handleLogout,
            onLoginClick,
            excalidrawAPI: excalidrawAPI!,
          });
        }}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            excalidrawAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        {selectedElement && (
          <PropertiesSidebar
            element={selectedElement}
            onUpdate={handleUpdateElement}
          />
        )}
        {authPanelView && (
          <AuthPanel
            authPanelView={authPanelView}
            setAuthPanelView={setAuthPanelView}
            ref={authPanelRef}
            onLoginSuccess={onLoginSuccess}
          />
        )}
                {isBoardListDialogOpen && (
          <BoardListDialog
            onClose={() => setIsBoardListDialogOpen(false)}
            onLoadBoard={onLoadBoard}
            onLoadFromFile={handleLoadFromFile}
          />
        )}
        <AppMainMenu
          isCollabEnabled={!isCollabDisabled}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
          refresh={() => forceRefresh((prev) => !prev)}
          onOpenBoardListDialog={() => setIsBoardListDialogOpen(true)}
          onSaveToCloud={handleSaveToCloud}
        />
        <AppWelcomeScreen
          isCollabEnabled={!isCollabDisabled}
        />
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
          {excalidrawAPI && (
            <OverwriteConfirmDialog.Action
              title={t("overwriteConfirm.action.excalidrawPlus.title")}
              actionLabel={t("overwriteConfirm.action.excalidrawPlus.button")}
              onClick={() => {
                exportToExcalidrawPlus(
                  excalidrawAPI.getSceneElements(),
                  excalidrawAPI.getAppState(),
                  excalidrawAPI.getFiles(),
                  excalidrawAPI.getName(),
                );
              }}
            >
              {t("overwriteConfirm.action.excalidrawPlus.description")}
            </OverwriteConfirmDialog.Action>
          )}
        </OverwriteConfirmDialog>
        <AppFooter onChange={() => excalidrawAPI?.refresh()} />
        {excalidrawAPI && <AIComponents excalidrawAPI={excalidrawAPI} />}

        <TTDDialogTrigger />
        {shareDialogState.isOpen && (
          <ShareDialog onExportToBackend={onExportToBackend} excalidrawAPI={excalidrawAPI} />
        )}
        
        {latestShareableLink && (
          <ShareableLinkDialog
            link={latestShareableLink}
            onCloseRequest={() => setLatestShareableLink(null)}
            setErrorMessage={setErrorMessage}
          />
        )}
        
        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[]}
        />
        {isVisualDebuggerEnabled() && excalidrawAPI && (
          <DebugCanvas
            appState={excalidrawAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Excalidraw>
    </div>
  );
};

export type AppRef = {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
  checkGameState: (elements: readonly any[]) => void;
};

const ExcalidrawApp = forwardRef<AppRef, { onLoginClick: () => void; }>((_props, ref) => {
  const [excalidrawAPI, _setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  const [authPanelView, setAuthPanelView] = useState<"login" | "register" | null>(null);

  const [wrapperKey, setWrapperKey] = useState(0);

  const handleLoginSuccess = useCallback(() => {
    setWrapperKey(prev => prev + 1);
  }, []);

  const handleLogoutSuccessInApp = useCallback(() => {
    setWrapperKey(prev => prev + 1);
  }, []);

  const setExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    _setExcalidrawAPI(api);
  }, []);

  useImperativeHandle(ref, () => ({
    excalidrawAPI,
    checkGameState: (elements: readonly any[]) =>
      excalidrawAPI && checkGameState(excalidrawAPI, elements),
  }));

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      if (excalidrawAPI) {
        (window as any).ExcalidrawAPI = excalidrawAPI;
        (window as any).ExcalidrawHandle = {
          excalidrawAPI,
          checkGameState: (elements: readonly any[] | null) =>
            checkGameState(excalidrawAPI, elements),
        };
      }
    }
  }, [excalidrawAPI]);

  const isCloudExportWindow =
    window.location.pathname === "/excalidraw-plus-export";
  if (isCloudExportWindow) {
    return <ExcalidrawPlusIframeExport />;
  }

  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <ExcalidrawWrapper
          key={wrapperKey}
          setExcalidrawAPI={setExcalidrawAPI}
          onExcalidrawAPISet={setExcalidrawAPI}
          onLoginClick={() => setAuthPanelView("login")}
          authPanelView={authPanelView}
          setAuthPanelView={setAuthPanelView}
          onLoginSuccess={handleLoginSuccess}
          onLogoutSuccess={handleLogoutSuccessInApp}
        />
      </Provider>
    </TopErrorBoundary>
  );
});

export default ExcalidrawApp;