import React from "react";
import { t } from "@excalidraw/excalidraw/i18n";
import { MainMenu } from "@excalidraw/excalidraw/index";
import { loginIcon, eyeIcon } from "@excalidraw/excalidraw/components/icons";

import { isDevEnv } from "@excalidraw/common";

import type { Theme } from "@excalidraw/element/types";

import { LanguageList } from "../app-language/LanguageList";
import { isExcalidrawPlusSignedUser } from "../app_constants";

import { GamifyBoardIcon } from "./GamifyBoardIcon";

import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
  onOpenBoardListDialog: () => void;
  onSaveToCloud: () => void;
}> = React.memo((props) => {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.Item onSelect={props.onOpenBoardListDialog}>
        Open from Cloud...
      </MainMenu.Item>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.Item onSelect={props.onSaveToCloud}>
        Save to Cloud
      </MainMenu.Item>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled && (
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={props.isCollaborating}
          onSelect={() => props.onCollabDialogOpen()}
        />
      )}
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.ItemLink
        icon={
          <GamifyBoardIcon
            theme={props.theme === "system" ? undefined : props.theme}
          />
        }
        href="https://pro.GamifyBoard.com"
        className=""
      >
        GamifyBoard-Pro
      </MainMenu.ItemLink>
      <MainMenu.DefaultItems.Socials />
      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onClick={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});
