import {
  Excalidraw,
  TTDDialogTrigger,
  CaptureUpdateAction,
  convertToExcalidrawElements,
  MainMenu,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import { trackEvent } from "@excalidraw/excalidraw/analytics";
import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@excalidraw/excalidraw/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@excalidraw/excalidraw/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirm";
import { openConfirmModal } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirmState";
import { ShareableLinkDialog } from "@excalidraw/excalidraw/components/ShareableLinkDialog";
import Trans from "@excalidraw/excalidraw/components/Trans";
import {
  APP_NAME,
  EVENT,
  THEME,
  VERSION_TIMEOUT,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isRunningInIframe,
} from "@excalidraw/common";
import polyfill from "@excalidraw/excalidraw/polyfill";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";

import { useCallbackRefState } from "@excalidraw/excalidraw/hooks/useCallbackRefState";
import { t, useI18n } from "@excalidraw/excalidraw/i18n";

import { GithubIcon, exportToPlus, loginIcon, eyeIcon } from "@excalidraw/excalidraw/components/icons";

import { isElementLink } from "@excalidraw/element";

import { restore, restoreAppState } from "@excalidraw/excalidraw/data/restore";
import { newElementWith } from "@excalidraw/element";


import { useHandleLibrary } from "@excalidraw/excalidraw/data/library";


import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
import type {
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
  Theme as ExcalidrawTheme,
} from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  UIAppState,
  PointerDownState,
} from "@excalidraw/excalidraw/types";

import type { ResolvablePromise } from "@excalidraw/common/utils";

import { GamifyBoardIcon } from "./components/GamifyBoardIcon";

import CustomStats from "./CustomStats";
import {
  Provider,
  useAtom,
  useAtomValue,
  useSetAtom,
  appJotaiStore,
} from "./app-jotai";
import {
  isExcalidrawPlusSignedUser,
} from "./app_constants";

import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import {
  exportToExcalidrawPlus,
} from "./components/ExportToExcalidrawPlus";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  getCollaborationLinkData,
  loadScene,
} from "./data";

import {
  importFromLocalStorage,
} from "./data/localStorage";

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
import AuthPanel from "./components/AuthPanel";
import "./components/Modal.scss";

import "./index.scss";

import { getBoard, createBoard } from "./src/api"; 
import {
  authStatusAtom,
  logoutActionAtom,
} from "./state/authAtoms"; 
import { BoardListDialog } from "./components/BoardListDialog";

import { actionLoadScene } from "@excalidraw/excalidraw/actions";
import { Card } from "@excalidraw/excalidraw/components/Card";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { saveAs } from "@excalidraw/excalidraw/components/icons";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { ExcalidrawBinding, yjsToExcalidraw } from "@ndy-onl/y-excalidraw";

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

const isIntersecting = (
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number },
) => {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
};

const checkGameState = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  elements: readonly any[] | null,
) => {
  if (!excalidrawAPI || !elements) {
    return;
  }

  const cards = elements.filter((el) => el.customData?.isCard);
  let needsUpdate = false;

  const updatedElements = elements.map((el) => {
    if (el.type === "counter") {
      const countsType = el.customData?.countsType;
      if (countsType) {
        const zone = elements.find(
          (zoneEl) =>
            zoneEl.customData?.isZone &&
            (zoneEl.customData.acceptedCardTypes || "")
              .split(",")
              .includes(countsType),
        );
        if (zone) {
          const cardsInZone = cards.filter(
            (card) =>
              card.customData?.cardType === countsType &&
              isIntersecting(card, zone as any),
          );
          if (el.customData.value !== cardsInZone.length) {
            needsUpdate = true;
            return {
              ...el,
              customData: { ...el.customData, value: cardsInZone.length },
            };
          }
        }
      }
      return el;
    }

    if (!el.customData?.isZone) {
      return el;
    }

    const acceptedTypes = (el.customData.acceptedCardTypes || "")
      .split(",")
      .filter(Boolean);
    if (acceptedTypes.length === 0) {
      return el;
    }

    const cardsInZone = cards.filter((card) => isIntersecting(card, el as any));

    const isCorrect =
      cardsInZone.length > 0 &&
      cardsInZone.every((card) =>
        acceptedTypes.includes(card.customData?.cardType),
      );
    const newBackgroundColor = isCorrect ? "#aaffaa" : "#ffaaaa";

    if (el.backgroundColor !== newBackgroundColor) {
      needsUpdate = true;
      return { ...el, backgroundColor: newBackgroundColor };
    }
    return el;
  });

  if (needsUpdate) {
    excalidrawAPI.updateScene({ elements: updatedElements });
  }
};

polyfill();

window.EXCALIDRAW_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

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

const shareableLinkConfirmDialog = {
  title: t("overwriteConfirm.modal.shareableLink.title"),
  description: () => (
    <Trans
      i18nKey="overwriteConfirm.modal.shareableLink.description"
      bold={(text) => <strong>{text}</strong>}
      br={() => <br />}
    />
  ),
  actionLabel: t("overwriteConfirm.modal.shareableLink.button"),
  color: "danger",
} as const;

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
  isCollaborating,
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
          <button
            className="excalidraw-button collab-button"
            onClick={handleLogout}
            style={{ padding: "8px 16px", width: "54px" }}
          >
            Logout
          </button>
        ) : (
          <button
            className="excalidraw-button collab-button"
            onClick={onLoginClick}
            style={{ padding: "8px 16px", width: "54px" }}
          >
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
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  

  const excalidrawContainerRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    if (excalidrawAPI && selectedBoardId) {
      const ydoc = new Y.Doc();
      const provider = new WebsocketProvider(
        import.meta.env.VITE_APP_SOCKET_URL || "ws://localhost:3001",
        selectedBoardId,
        ydoc,
      );
      const binding = new ExcalidrawBinding(
        excalidrawAPI,
        provider.awareness,
        ydoc.getArray("elements"),
      );

      return () => {
        binding.destroy();
        provider.destroy();
      };
    }
  }, [excalidrawAPI, selectedBoardId]);

  const onLoadBoard = (boardId: string) => {
    setSelectedBoardId(boardId);
    setIsBoardListDialogOpen(false);
  };

  const handleLoadFromFile = () => {
    if (!excalidrawAPI) {
      return;
    }
    setIsBoardListDialogOpen(false);
    // TODO: Find the correct way to execute this action
    // excalidrawAPI.importLibraryFromFS();
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
      excalidrawAPI.setToast({
        message: "Failed to save board.",
      });
      console.error(error);
    }
  };
  const isInitialLoadRef = useRef(true);
  const [selectedElement, setSelectedElement] =
    useState<NonDeletedExcalidrawElement | null>(null);
  const { isLoggedIn, user, accessToken } = useAtomValue(authStatusAtom);
  const setLogoutAction = useSetAtom(logoutActionAtom);

  const handleLogout = async () => {
    await setLogoutAction();
    onLogoutSuccess();
  };
  const [errorMessage, setErrorMessage] = useState("");
  const isCollabDisabled = isRunningInIframe();
  const [loggedInUiState, setLoggedInUiState] = useState(false);

  const authPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        authPanelRef.current &&
        !authPanelRef.current.contains(event.target as Node)
      ) {
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

  const [langCode, setLangCode] = useAppLangCode();

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise && !yElements) {
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
    if (!excalidrawAPI || yElements) {
      return;
    }

    const localDataState = importFromLocalStorage();
    loadScene(null, null, localDataState).then(async (data) => {
      if (isInitialLoadRef.current) {
        initialStatePromiseRef.current.promise.resolve(data as ExcalidrawInitialDataState);
        isInitialLoadRef.current = false;
      } else if (data) {
        excalidrawAPI.updateScene({
          ...data,
          ...restore(data, null, null, { repairBindings: true }),
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
      }
    });
  }, [excalidrawAPI, yElements]);

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
      } else {
        console.warn(
          "preventing unload disabled (VITE_APP_DISABLE_PREVENT_UNLOAD)",
        );
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [excalidrawAPI]);

  const onChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
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
                const newElement = newElementWith(element, {
                  status: "saved",
                });
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

    if (debugCanvasRef.current && excalidrawAPI) {
      debugRenderer(
        debugCanvasRef.current,
        appState,
        window.devicePixelRatio,
        () => forceRefresh((prev) => !prev),
      );
    }
  };

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(
    null,
  );

  const onExportToBackendCallback: any = async (
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
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
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
    <div style={{ height: "100%" }} className="excalidraw-app" ref={excalidrawContainerRef}>
      <Excalidraw
        excalidrawAPI={excalidrawRefCallback}
        onChange={onChange}
        
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            saveToActiveFile: false,
            export: {
              onExportToBackend: onExportToBackendCallback,
              renderCustomUI: (elements, appState, files) => {
                if (!excalidrawAPI) {
                  return <></>;
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
          onCollabDialogOpen={() => setShareDialogState({ isOpen: true, type: "collaborationOnly" })}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
          refresh={() => forceRefresh((prev) => !prev)}
          onOpenBoardListDialog={() => setIsBoardListDialogOpen(true)}
          onSaveToCloud={handleSaveToCloud}
        />
        <AppWelcomeScreen 
          isCollabEnabled={!isCollabDisabled}
          onCollabDialogOpen={() => setShareDialogState({ isOpen: true, type: "collaborationOnly" })}
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
        {shareDialogState.isOpen && excalidrawAPI && (
          <ShareDialog
            onExportToBackend={onExportToBackendCallback}
            excalidrawAPI={excalidrawAPI}
          />
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

const ExcalidrawApp = forwardRef<AppRef, { onLoginClick: () => void }>(
  (_props, ref) => {
    const [excalidrawAPI, _setExcalidrawAPI] =
      useState<ExcalidrawImperativeAPI | null>(null);

    const [authPanelView, setAuthPanelView] = useState<
      "login" | "register" | null
    >(null);

    const [wrapperKey, setWrapperKey] = useState(0);

    const handleLoginSuccess = useCallback(() => {
      setWrapperKey((prev) => prev + 1);
    }, []);

    const handleLogoutSuccessInApp = useCallback(() => {
      setWrapperKey((prev) => prev + 1);
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
  },
);

export default ExcalidrawApp;