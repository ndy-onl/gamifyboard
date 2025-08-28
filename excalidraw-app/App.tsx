
import {
  Excalidraw,
  LiveCollaborationTrigger,
  TTDDialogTrigger,
  CaptureUpdateAction,
  reconcileElements,
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
  TITLE_TIMEOUT,
  VERSION_TIMEOUT,
  debounce,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isRunningInIframe,
  isDevEnv,
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
import { loadFromBlob } from "@excalidraw/excalidraw/data/blob";
import { useCallbackRefState } from "@excalidraw/excalidraw/hooks/useCallbackRefState";
import { t } from "@excalidraw/excalidraw/i18n";

import {
  GithubIcon,
  usersIcon,
  exportToPlus,
  share,
} from "@excalidraw/excalidraw/components/icons";

import { isElementLink } from "@excalidraw/element";

import { restore, restoreAppState } from "@excalidraw/excalidraw/data/restore";
import { newElementWith } from "@excalidraw/element";
import { isInitializedImageElement } from "@excalidraw/element";
import clsx from "clsx";
import {
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from "@excalidraw/excalidraw/data/library";

import type { RemoteExcalidrawElement } from "@excalidraw/excalidraw/data/reconcile";
import type { RestoredDataState } from "@excalidraw/excalidraw/data/restore";
import type {
  FileId,
  NonDeletedExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
  ExcalidrawInitialDataState,
  UIAppState,
} from "@excalidraw/excalidraw/types";
import type { ResolutionType } from "@excalidraw/common/utility-types";
import type { ResolvablePromise }  from "@excalidraw/common/utils";

import { GamifyBoardIcon } from "./components/GamifyBoardIcon";

import CustomStats from "./CustomStats";
import {
  Provider,
  useAtom,
  useAtomValue,
  useSetAtom,
  useAtomWithInitialValue,
  appJotaiStore,
} from "./app-jotai";
import {
  FIREBASE_STORAGE_PREFIXES,
  isExcalidrawPlusSignedUser,
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "./app_constants";

import { AppFooter } from "./components/AppFooter";
import { AppMainMenu } from "./components/AppMainMenu";
import { AppWelcomeScreen } from "./components/AppWelcomeScreen";
import {
  ExportToExcalidrawPlus,
  exportToExcalidrawPlus,
} from "./components/ExportToExcalidrawPlus";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  getCollaborationLinkData,
  isCollaborationLink,
  loadScene,
} from "./data";

import { updateStaleImageStatuses } from "./data/FileManager";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
} from "./data/localStorage";

import { loadFilesFromFirebase } from "./data/firebase";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
} from "./data/LocalData";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import CollabError, { collabErrorIndicatorAtom } from "./collab/CollabError";

import { useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";
import { AIComponents } from "./components/AI";
import { ExcalidrawPlusIframeExport } from "./ExcalidrawPlusIframeExport";
import { PropertiesSidebar } from "./components/PropertiesSidebar";
import { GamifyToolbar } from "./components/GamifyToolbar";
import AuthPanel from './components/AuthPanel';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import './components/Modal.scss';

import "./index.scss";



import Auth from './components/Auth';
import BoardList from './components/BoardList';
import { getBoard, getProfile } from './src/api'; // logoutUser wird jetzt von logoutActionAtom behandelt
import { authStatusAtom, loginActionAtom, logoutActionAtom } from "./state/authAtoms"; // Neue Importe
import { BoardListDialog } from "./components/BoardListDialog";
import { actionLoadScene } from "@excalidraw/excalidraw/actions";
import { Card } from "@excalidraw/excalidraw/components/Card";
import { ToolButton } from "@excalidraw/excalidraw/components/ToolButton";
import { saveAs } from "@excalidraw/excalidraw/components/icons";
import { createBoard } from "./src/api";
import { useCollaboration } from "./hooks/useCollaboration";

const SaveToProDialog = ({
  excalidrawAPI,
  elements,
  appState,
  files,
  onSuccess,
  onError,
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

// Adding a listener outside of the component as it may (?) need to be
// subscribed early to catch the event.
//
// Also note that it will fire only if certain heuristics are met (user has
// used the app for some time, etc.)
window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    // prevent Chrome <= 67 from automatically showing the prompt
    event.preventDefault();
    // cache for later use
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

// REC-05: Create a helper to reduce code duplication
const createErrorScene = (errorMessage: string) => {
  return { scene: { appState: { errorMessage } }, isExternalScene: false };
};

const initializeScene = async (opts: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  selectedBoardId: string | null;
  token: string | null;
}): Promise<
  { scene: ExcalidrawInitialDataState | null } & (
    | { isExternalScene: true; id: string | null; key: string | null }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
    const { excalidrawAPI, selectedBoardId, token } = opts;

    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    const jsonBackendMatch = window.location.hash.match(
      /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
    );
    const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

    // Highest priority: Handle collaboration link with an ID.
    if (id) {
      try {
        const response = await getBoard(id, token);
        const board = response.data;
        if (board && board.board_data) {
          const loadedAppState = {
            ...(board.board_data.appState || {}),
            showWelcomeScreen: false,
            openDialog: null,
            isLoading: false,
          };
          const scene = {
            elements: board.board_data.elements || [],
            appState: restoreAppState(loadedAppState, null),
            files: board.board_data.files || {},
            scrollToContent: true,
          };
          if (excalidrawAPI && board.name) {
            excalidrawAPI.updateScene({ appState: { name: board.name } });
          }
          return { scene, isExternalScene: true, id: id, key: null };
        }
        // This case should ideally not be reached if getBoard returns valid data
        return createErrorScene("Board data is invalid.");

      } catch (error: any) {
        console.error("Failed to load board from backend via URL", error);

        // REC-02: Granular error handling
        const status = error.response?.status;
        if (status === 404) {
          return createErrorScene("The board you are looking for does not exist or has been deleted.");
        }
        if (status === 403) {
          return createErrorScene("You do not have permission to view this board.");
        }
        return createErrorScene("Could not load the board. Please check your connection or try again later.");
      }
    }

    // --- Fallback logic for non-collaboration scenes ---

    const localDataState = importFromLocalStorage();
    let scene: RestoredDataState & { scrollToContent?: boolean } = await loadScene(
      null,
      null,
      localDataState,
    );

    let roomLinkData = getCollaborationLinkData(window.location.href);
    const isExternalScene = !!(jsonBackendMatch || externalUrlMatch || roomLinkData);

    if (isExternalScene) {
      if (
        !scene.elements.length ||
        roomLinkData ||
        (await openConfirmModal(shareableLinkConfirmDialog))
      ) {
        if (jsonBackendMatch) {
          scene = await loadScene(
            jsonBackendMatch[1],
            jsonBackendMatch[2],
            localDataState,
          );
        } else if (externalUrlMatch) {
          // REC-03: Security risk - this part needs a separate security audit.
          // For now, we proceed with the existing logic.
          const url = window.decodeURIComponent(externalUrlMatch[1]);
          try {
            const request = await fetch(url);
            const data = await loadFromBlob(await request.blob(), null, null);
            scene = data;
          } catch (error: any) {
            return createErrorScene(t("alerts.invalidSceneUrl"));
          }
        }
        scene.scrollToContent = true;
        if (!roomLinkData) {
          window.history.replaceState({}, APP_NAME, window.location.origin);
        }
        return {
            scene,
            isExternalScene: true,
            id: jsonBackendMatch ? jsonBackendMatch[1] : null,
            key: jsonBackendMatch ? jsonBackendMatch[2] : null
        };
      } else {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    }

    if (!isExternalScene && scene.appState.isLoading) {
      scene = {
        ...scene,
        appState: { ...scene.appState, isLoading: false },
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
  loggedInUiState, // NEU: loggedInUiState akzeptieren
  handleLogout,
  onLoginClick,
  excalidrawAPI,
  isCollaborating,
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
  const isInitializedRef = useRef(false);
  const [isBoardListDialogOpen, setIsBoardListDialogOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const onLoadBoard = async (boardId: string) => {
    if (!excalidrawAPI) {
      console.error("Excalidraw API not available.");
      setErrorMessage("Excalidraw API not available. Cannot load board.");
      return;
    }
    try {
      // 1. End any active collaboration session by resetting the boardId
      setSelectedBoardId(null);

      // 2. Fetch the private board data from the REST API
      const response = await getBoard(boardId);
      const board = response.data;

      if (board && board.board_data) {
        // 3. Restore the scene with the fetched data
        const scene = {
          elements: board.board_data.elements || [],
          appState: restoreAppState(board.board_data.appState || {}, null),
          files: board.board_data.files || {},
          scrollToContent: true,
        };
        excalidrawAPI.updateScene(scene);
        excalidrawAPI.setToast({ message: `Loaded board: ${board.name}` });
      } else {
        throw new Error("Board data is invalid or empty.");
      }
      setIsBoardListDialogOpen(false); // Close the dialog on success
    } catch (error: any) {
      console.error("Failed to load board:", error);
      setErrorMessage(`Error loading board: ${error.message}`);
    }
  };

  const handleLoadFromFile = () => {
    if (!excalidrawAPI) {
      return;
    }
    // we need to close the dialog first, so that the file open dialog is not blocked
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
      // Temporarily remove files from the payload to isolate the issue
      await createBoard(name, { elements, appState /* files */ });
      excalidrawAPI.setToast({ message: "Board saved successfully!" });
    } catch (error: any) {
      excalidrawAPI.setToast({ message: "Failed to save board.", color: "danger" });
      console.error(error);
    }
  };
  const isInitialLoadRef = useRef(true);
  const [selectedElement, setSelectedElement] =
    useState<NonDeletedExcalidrawElement | null>(null);
  const { isLoggedIn, user, accessToken } = useAtomValue(authStatusAtom); // NEU: authStatusAtom verwenden
  const setLogoutAction = useSetAtom(logoutActionAtom); // NEU: setLogoutAction verwenden

  const handleLogout = async () => {
    await setLogoutAction(onLogoutSuccess); // handleLogoutSuccess HIER HINZUFÜGEN
  };
  const [errorMessage, setErrorMessage] = useState("");
  const isCollabDisabled = isRunningInIframe();
  const [loggedInUiState, setLoggedInUiState] = useState(false); // NEU: loggedInUiState definieren

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

  const [langCode, setLangCode] = useAppLangCode();

  // Persistenter Login wird jetzt von authAtomWithStorage automatisch übernommen

  // initial state
  // ---------------------------------------------------------------------------

  const [isInitialized, setIsInitialized] = useState(false);

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [excalidrawAPI, excalidrawRefCallback] =
    useCallbackRefState<ExcalidrawImperativeAPI>();

  const { collaborationStatus, onPointerUpdate } = useCollaboration(
    excalidrawAPI,
    selectedBoardId,
  );

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
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  useEffect(() => {
    // This effect runs once on mount to handle loading from a URL.
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    if (id) {
      setSelectedBoardId(id);
    }
  }, []); // Empty dependency array ensures it runs only once.

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (!excalidrawAPI || isInitialized) {
      return;
    }

    const initialize = async () => {
      // Check if a board is being loaded from URL. If so, do nothing here.
      // The collaboration hook will handle it.
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has("id")) {
        setIsInitialized(true);
        return;
      }

      // If not loading from URL, load from local storage.
      const localDataState = importFromLocalStorage();
      const scene = await loadScene(null, null, localDataState);

      // Ensure isLoading is false after loading from local storage
      if (scene.appState?.isLoading) {
        scene.appState.isLoading = false;
      }

      excalidrawAPI.updateScene(scene);
      setIsInitialized(true);
    };

    initialize();
  }, [excalidrawAPI, isInitialized]);

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
    // old collab logic removed

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (excalidrawAPI) {
          let didChange = false;

          const elements = excalidrawAPI
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
              elements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    // Render the debug scene if the debug canvas is available
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

  const onShareAndCollaborate = async (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    const boardName = appState.name || "Untitled";
    if (elements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      // 1. Create a new board in the backend with the current scene data
      const response = await createBoard(boardName, { elements, appState, files });
      const newBoard = response.data;

      if (!newBoard || !newBoard.id) {
        throw new Error("Failed to create a new board or receive a board ID.");
      }

      // 2. Create the shareable link
      const url = `${window.location.origin}${window.location.pathname}?id=${newBoard.id}`;
      setLatestShareableLink(url);

      // 3. Set the current session to use the new board ID for collaboration
      setSelectedBoardId(newBoard.id);

      // 4. (Optional) Update the URL in the browser bar without reloading
      window.history.pushState({}, "", url);

      // 5. Immediately update the scene to prevent a flicker/blank screen
      excalidrawAPI.updateScene({ elements, appState, files });

    } catch (error: any) {
      console.error("Failed to share and collaborate:", error);
      // Optionally, set an error message to display in the UI
      // setErrorMessage(error.message);
      throw new Error("Failed to create a shareable link. Please try again.");
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
      backgroundColor: selectedElement.backgroundColor, // Behalte die aktuelle Farbe bei, checkGameState kümmert sich darum
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

  

  // onCollabDialogOpen removed

  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
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

  const GamifyBoardProCommand = {
    label: "GamifyBoard-Pro",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: (
      <div style={{ width: 14 }}>
        <GamifyBoardIcon />
      </div>
    ),
    keywords: ["pro", "cloud", "server", "gamifyboard"],
    perform: () => {
      window.open("https://pro.gamifyboard.com/", "_blank");
    },
  };
  const GamifyBoardProAppCommand = {
    label: "Sign up for Pro",
    category: DEFAULT_CATEGORIES.links,
    predicate: true,
    icon: (
      <div style={{ width: 14 }}>
        <GamifyBoardIcon />
      </div>
    ),
    keywords: [
      "gamifyboard",
      "pro",
      "cloud",
      "server",
      "signin",
      "login",
      "signup",
    ],
    perform: () => {
      window.open("https://pro.gamifyboard.com/", "_blank");
    },
  };

  return (
    <div
      style={{ height: "100%" }}
      className="excalidraw-app"
    >
      <Excalidraw
        excalidrawAPI={excalidrawRefCallback}
        onChange={(elements, appState, files) => {
          onChange(elements, appState, files);
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
        }}
        onPointerUpdate={onPointerUpdate}
        onPointerUp={() => {
          // Trigger the check after user interaction
          if (excalidrawAPI) {
            checkGameState(excalidrawAPI, excalidrawAPI.getSceneElements());
          }
        }}
        
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            saveToActiveFile: false,
            export: {
              onExportToBackend: onShareAndCollaborate,
              renderCustomUI: (elements, appState, files) => {
                if (!excalidrawAPI) {
                  return null;
                }
                return (
                  <Provider store={appJotaiStore}>
                    <SaveToProDialog
                      excalidrawAPI={excalidrawAPI}
                      elements={elements}
                      appState={appState}
                      files={files}
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
            loggedInUiState, // NEU: loggedInUiState übergeben
            handleLogout,
            onLoginClick,
            excalidrawAPI,
            isCollaborating: collaborationStatus === 'connected',
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
          <ShareDialog onExportToBackend={onShareAndCollaborate} excalidrawAPI={excalidrawAPI} />
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
          customCommandPaletteItems={[
            {
              label: "GitHub",
              icon: GithubIcon,
              category: DEFAULT_CATEGORIES.links,
              predicate: true,
              keywords: [
                "issues",
                "bugs",
                "requests",
                "report",
                "features",
                "social",
                "community",
              ],
              perform: () => {
                window.open(
                  "https://github.com/ndy-onl/gamifyboard",
                  "_blank",
                  "noopener noreferrer",
                );
              },
            },
            ...(isExcalidrawPlusSignedUser
              ? [
                  {
                    ...GamifyBoardProAppCommand,
                    label: "Sign in / Go to GamifyBoard-Pro",
                  },
                ]
              : [GamifyBoardProCommand, GamifyBoardProAppCommand]),

            {
              label: t("overwriteConfirm.action.excalidrawPlus.button"),
              category: DEFAULT_CATEGORIES.export,
              icon: exportToPlus,
              predicate: true,
              keywords: ["pro", "export", "save", "backup"],
              perform: () => {
                if (excalidrawAPI) {
                  exportToExcalidrawPlus(
                    excalidrawAPI.getSceneElements(),
                    excalidrawAPI.getAppState(),
                    excalidrawAPI.getFiles(),
                    excalidrawAPI.getName(),
                  );
                }
              },
            },
            {
              ...CommandPalette.defaultItems.toggleTheme,
              perform: () => {
                setAppTheme(
                  editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
                );
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
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

  const [wrapperKey, setWrapperKey] = useState(0); // NEW: State to force ExcalidrawWrapper re-render

  const handleLoginSuccess = useCallback(() => { // In ExcalidrawApp-Scope definiert
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
          key={wrapperKey} // NEW: Apply key to force re-render
          setExcalidrawAPI={setExcalidrawAPI}
          onExcalidrawAPISet={setExcalidrawAPI}
          onLoginClick={() => setAuthPanelView("login")}
          authPanelView={authPanelView}
          setAuthPanelView={setAuthPanelView}
          onLoginSuccess={handleLoginSuccess} // Keep this
          onLogoutSuccess={handleLogoutSuccessInApp} // NEW: Pass logout success handler
        />
      </Provider>
    </TopErrorBoundary>
  );
});

export default ExcalidrawApp;