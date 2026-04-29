import { FolderHeart } from "lucide-react";
import { DockModule } from "@/lib/dock-registry";
import FavoritesPanel from "./favorites";

export const dockModules: DockModule[] = [
  {
    id: "favorites",
    icon: FolderHeart,
    title: "收藏夹",
    panel: FavoritesPanel,
    defaultSize: { width: 570, height: 600 },
  },
];
