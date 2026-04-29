"use client";

import { useState } from "react";
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
  CardFooter,
} from "@/components/ui/card";

interface ChatSidebarDeleteDialogProps {
  open: boolean;
  sessionTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function ChatSidebarDeleteDialog({
  open,
  sessionTitle,
  onOpenChange,
  onConfirm,
}: ChatSidebarDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay className="sidebar-dialog-overlay" />
      <DialogContent className="sidebar-dialog-content" showCloseButton={false}>
        <Card className="sidebar-dialog-card border-0 shadow-none">
          <CardHeader className="sidebar-dialog-card-header">
            <CardTitle className="sidebar-dialog-card-title">删除对话</CardTitle>
            <CardDescription className="sidebar-dialog-card-desc">
              确定要删除对话「{sessionTitle || "未命名对话"}」吗？此操作不可恢复。
            </CardDescription>
          </CardHeader>
          <CardFooter className="sidebar-dialog-card-footer">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="sidebar-dialog-btn sidebar-dialog-btn-cancel"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="sidebar-dialog-btn sidebar-dialog-btn-danger"
            >
              {isDeleting ? "删除中..." : "删除"}
            </button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
