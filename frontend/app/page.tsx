"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import LoginModal from "@/components/LoginModal";
import DemoFlowModal from "@/components/DemoFlowModal";
import DockBar from "@/components/DockBar";
import DockPanelWrapper from "@/components/DockPanelWrapper";
import ChatPanel from "@/components/ChatPanel";
import ASRViewerModal from "@/components/ASRViewerModal";
import { DockContext } from "@/lib/dock-context";
import { dockModules } from "@/components/dock-modules";
import { ChatSidebar } from "@/components/chat-sidebar";
import { UserInfo, authApi, chatApi, VectorPageStatusResponse, WorkspacePage } from "@/lib/api";

export default function Home() {
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [statsKey, setStatsKey] = useState(0);
  const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
  const [workspacePages, setWorkspacePages] = useState<WorkspacePage[]>([]);
  const [externalVectorUpdate, setExternalVectorUpdate] = useState<{
    bvid: string;
    cid: number;
    status: VectorPageStatusResponse;
    version: number;
  } | null>(null);

  // 聊天会话状态（由 Sidebar 和 ChatPanel 共享）
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);

  // Dock 面板状态
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [panelOriginEl, setPanelOriginEl] = useState<HTMLElement | null>(null);

  // ASR 弹窗状态
  const [asrModal, setAsrModal] = useState<{
    isOpen: boolean;
    bvid: string;
    cid: number;
    pageIndex: number;
    pageTitle: string;
  }>({ isOpen: false, bvid: "", cid: 0, pageIndex: 0, pageTitle: "" });

  useEffect(() => {
    const s = localStorage.getItem("bili_session");
    const u = localStorage.getItem("bili_user");
    if (s && u) {
      setSession(s);
      setUser(u);
    }
  }, []);

  // 初始化/恢复聊天会话
  useEffect(() => {
    if (!session) return;
    const init = async () => {
      let cid = localStorage.getItem("bili_chat_session");
      if (!cid) {
        try {
          const res = await chatApi.createSession(session);
          cid = res.chat_session_id;
          localStorage.setItem("bili_chat_session", cid);
        } catch (e) {
          console.error("创建会话失败", e);
          return;
        }
      }
      setActiveChatSessionId(cid);
    };
    init();
  }, [session]);

  const handleCreateSession = async () => {
    if (!session) return;
    try {
      const res = await chatApi.createSession(session);
      const cid = res.chat_session_id;
      localStorage.setItem("bili_chat_session", cid);
      setActiveChatSessionId(cid);
    } catch (e) {
      console.error("创建会话失败", e);
    }
  };

  const handleSelectSession = (cid: string) => {
    localStorage.setItem("bili_chat_session", cid);
    setActiveChatSessionId(cid);
  };

  const onLogin = (sid: string, info: UserInfo) => {
    setSession(sid);
    setUser(info.uname);
    setShowLogin(false);
    localStorage.setItem("bili_session", sid);
    localStorage.setItem("bili_user", info.uname);
  };

  const onLogout = useCallback(() => {
    if (session) authApi.logout(session).catch(() => { });
    setSession(null);
    setUser(null);
    setActiveChatSessionId(null);
    setActivePanelId(null);
    setSelectedFolderIds([]);
    setWorkspacePages([]);
    localStorage.removeItem("bili_session");
    localStorage.removeItem("bili_user");
    localStorage.removeItem("bili_chat_session");
  }, [session]);

  const onOpenASR = useCallback((bvid: string, cid: number, pageTitle: string, pageIndex: number = 0) => {
    setAsrModal({ isOpen: true, bvid, cid, pageIndex, pageTitle });
  }, []);

  const onCloseASR = useCallback(() => {
    setAsrModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleVectorizationDone = useCallback((bvid: string, cid: number, status: VectorPageStatusResponse) => {
    setExternalVectorUpdate({
      bvid,
      cid,
      status,
      version: Date.now(),
    });
  }, []);

  const onBuildDone = useCallback(() => {
    setStatsKey((v) => v + 1);
  }, []);

  const onSelectionChange = useCallback((folderIds: number[]) => {
    setSelectedFolderIds(folderIds);
  }, []);

  const onWorkspacePagesChange = useCallback((pages: WorkspacePage[]) => {
    setWorkspacePages(pages);
  }, []);

  const togglePanel = useCallback((id: string, originEl: HTMLElement | null) => {
    setActivePanelId((prev) => {
      if (prev === id) {
        setPanelOriginEl(null);
        return null;
      }
      setPanelOriginEl(originEl);
      return id;
    });
  }, []);

  const closePanel = useCallback(() => {
    setActivePanelId(null);
    setPanelOriginEl(null);
  }, []);

  // Escape 关闭面板
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activePanelId) {
        closePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePanelId, closePanel]);

  const activeModule = activePanelId
    ? dockModules.find((m) => m.id === activePanelId)
    : null;
  const ActivePanel = activeModule?.panel;

  const dockContextValue = useMemo(
    () => ({
      sessionId: session,
      onBuildDone,
      onSelectionChange,
      onOpenASR,
      externalVectorUpdate,
      workspacePages,
      onWorkspacePagesChange,
    }),
    [session, onBuildDone, onSelectionChange, onOpenASR, externalVectorUpdate, workspacePages, onWorkspacePagesChange]
  );

  return (
    <DockContext.Provider value={dockContextValue}>
      <div className="app-shell">
        <header className="app-topbar">
          <div className="brand">
            <div className="brand-mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
            </div>
            <div>
              <span className="brand-title">BiliMind·收藏夹知识库</span>
              <span className="brand-subtitle">Save • Learn • Ask</span>
            </div>
          </div>

          <div className="topbar-actions">
            {user ? (
              <>
                <span className="user-chip">
                  <span>已登录</span>
                  <strong>{user}</strong>
                </span>
                <button onClick={onLogout} className="btn-icon" title="退出">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="btn btn-primary">
                扫码登录
              </button>
            )}
          </div>
        </header>

        <main className="app-main">
          {!session ? (
            <section className="hero">
              <div className="hero-content">
                <span className="hero-kicker">让你的B站收藏夹不再吃灰</span>
                <h1 className="hero-title">把&quot;收藏&quot;变成真正可用的知识</h1>
                <p className="hero-desc">
                  很多人收藏了大量学习视频，却迟迟没看、没整理、也找不到重点。<br />
                  这里把碎片化内容接入 AI：自动提炼、语义检索、对话式回顾，让收藏真正提升效率。
                </p>

                <div className="hero-actions">
                  <button className="btn btn-primary btn-lg" onClick={() => setShowLogin(true)}>
                    扫码登录开始构建
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowDemo(true)}>
                    体验检索流程
                  </button>
                </div>
              </div>

              <div className="hero-features">
                <div className="pipeline-row">
                  {[
                    { icon: "1", title: "同步", desc: "接入收藏夹" },
                    { icon: "2", title: "提炼", desc: "整理要点" },
                    { icon: "3", title: "检索", desc: "语义查找" },
                    { icon: "4", title: "回顾", desc: "对话复习" },
                  ].map((item, i) => (
                    <div key={i} className="pipeline-card">
                      <span className="pipeline-icon">{item.icon}</span>
                      <div className="pipeline-text">
                        <strong>{item.title}</strong>
                        <span>{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="workspace">
              <ChatSidebar
                sessionId={session}
                activeChatSessionId={activeChatSessionId}
                onSelectSession={handleSelectSession}
                onCreateSession={handleCreateSession}
              />
              <section className="panel panel-chat" style={{ flex: 1, width: "100%" }}>
                <ChatPanel
                  statsKey={statsKey}
                  sessionId={session ?? undefined}
                  chatSessionId={activeChatSessionId}
                  folderIds={selectedFolderIds}
                  workspacePages={workspacePages}
                />
              </section>
            </section>
          )}
        </main>

        {/* Dock 图标栏（已登录时显示） */}
        {session && (
          <DockBar
            modules={dockModules}
            activePanelId={activePanelId}
            onTogglePanel={togglePanel}
          />
        )}

        {/* 动画面板层 */}
        {activeModule && ActivePanel && (
          <DockPanelWrapper
            panelKey={activePanelId ?? "dock-panel"}
            isOpen={!!activePanelId}
            onClose={closePanel}
            title={activeModule.title}
            originEl={panelOriginEl}
            defaultSize={activeModule.defaultSize}
          >
            <ActivePanel isOpen={!!activePanelId} onClose={closePanel} />
          </DockPanelWrapper>
        )}

        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} onSuccess={onLogin} />
        <DemoFlowModal isOpen={showDemo} onClose={() => setShowDemo(false)} />
        {asrModal.isOpen && (
          <ASRViewerModal
            isOpen={asrModal.isOpen}
            onClose={onCloseASR}
            bvid={asrModal.bvid}
            cid={asrModal.cid}
            pageIndex={asrModal.pageIndex}
            pageTitle={asrModal.pageTitle}
            onVectorizationDone={handleVectorizationDone}
          />
        )}
      </div>
    </DockContext.Provider>
  );
}
