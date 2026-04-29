"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { chatApi, type ChatSession } from "@/lib/api";
import { ChatSidebarHeader } from "./ChatSidebarHeader";
import { ChatSidebarList } from "./ChatSidebarList";
import { ChatSidebarRenameDialog } from "./ChatSidebarRenameDialog";
import { ChatSidebarDeleteDialog } from "./ChatSidebarDeleteDialog";

interface ChatSidebarProps {
  sessionId: string | null;
  activeChatSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => Promise<void>;
}

export function ChatSidebar({
  sessionId,
  activeChatSessionId,
  onSelectSession,
  onCreateSession,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await chatApi.listSessions(sessionId);
      setSessions(res.sessions);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "获取会话列表失败";
      setError(msg);
      console.error("获取会话列表失败", e);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await onCreateSession();
      await fetchSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "创建会话失败";
      setError(msg);
      console.error("创建会话失败", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (title: string) => {
    if (!editingSession) return;
    setError(null);
    try {
      await chatApi.updateSession(editingSession.chat_session_id, { title });
      setSessions((prev) =>
        prev.map((s) =>
          s.chat_session_id === editingSession.chat_session_id
            ? { ...s, title }
            : s
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "重命名失败";
      setError(msg);
      console.error("重命名失败", e);
    } finally {
      setEditingSession(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingSession) return;
    setError(null);
    try {
      await chatApi.deleteSession(deletingSession.chat_session_id);
      setSessions((prev) =>
        prev.filter((s) => s.chat_session_id !== deletingSession.chat_session_id)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "删除会话失败";
      setError(msg);
      console.error("删除会话失败", e);
    } finally {
      setDeletingSession(null);
    }
  };

  return (
    <aside className="sidebar-shell">
      <ChatSidebarHeader
        sessionCount={sessions.length}
        onCreateSession={handleCreate}
        isCreating={isCreating}
      />

      {error && (
        <div className="sidebar-error">
          <AlertCircle className="size-3.5 shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <ChatSidebarList
        sessions={sessions}
        activeId={activeChatSessionId}
        isLoading={isLoading}
        onSelect={onSelectSession}
        onRename={(id) => {
          const s = sessions.find((x) => x.chat_session_id === id);
          if (s) setEditingSession(s);
        }}
        onDelete={(id) => {
          const s = sessions.find((x) => x.chat_session_id === id);
          if (s) setDeletingSession(s);
        }}
        onCreateSession={handleCreate}
        isCreating={isCreating}
      />
      <ChatSidebarRenameDialog
        open={!!editingSession}
        currentTitle={editingSession?.title ?? ""}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null);
        }}
        onConfirm={handleRename}
      />
      <ChatSidebarDeleteDialog
        open={!!deletingSession}
        sessionTitle={deletingSession?.title ?? ""}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
        onConfirm={handleDelete}
      />
    </aside>
  );
}
