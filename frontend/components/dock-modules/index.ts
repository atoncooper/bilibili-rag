import { FolderHeart, MessageSquareText, Settings } from "lucide-react";
import { DockModule } from "@/lib/dock-registry";
import FavoritesPanel from "./favorites";
import ChatHistoryPanel from "./chat-history";
import SettingsPanel from "./settings";

export const dockModules: DockModule[] = [
  {
    id: "chat-history",
    icon: MessageSquareText,
    title: "历史会话",
    panel: ChatHistoryPanel,
    defaultSize: { width: 640, height: 520 },
  },
  {
    id: "favorites",
    icon: FolderHeart,
    title: "收藏夹",
    panel: FavoritesPanel,
    defaultSize: { width: 570, height: 600 },
  },
  {
    id: "settings",
    icon: Settings,
    title: "API 设置",
    panel: SettingsPanel,
    defaultSize: { width: 720, height: 620 },
  },
];
