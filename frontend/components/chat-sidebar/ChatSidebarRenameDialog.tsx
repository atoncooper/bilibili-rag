"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface ChatSidebarRenameDialogProps {
  open: boolean;
  currentTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (title: string) => void;
}

export function ChatSidebarRenameDialog({
  open,
  currentTitle,
  onOpenChange,
  onConfirm,
}: ChatSidebarRenameDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle, open]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === currentTitle) {
      onOpenChange(false);
      return;
    }
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="sidebar-dialog-overlay" />
      <DialogContent className="sidebar-dialog-content" showCloseButton={false}>
        <Card className="sidebar-dialog-card border-0 shadow-none">
          <CardHeader className="sidebar-dialog-card-header">
            <CardTitle className="sidebar-dialog-card-title">重命名对话</CardTitle>
            <CardDescription className="sidebar-dialog-card-desc">
              给这个会话起一个新名字
            </CardDescription>
          </CardHeader>
          <CardContent className="sidebar-dialog-card-content">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onOpenChange(false);
              }}
              placeholder="输入会话名称"
              className="sidebar-dialog-input"
            />
          </CardContent>
          <CardFooter className="sidebar-dialog-card-footer">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="sidebar-dialog-btn sidebar-dialog-btn-cancel"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim() || title.trim() === currentTitle}
              className="sidebar-dialog-btn sidebar-dialog-btn-confirm"
            >
              确认
            </button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
