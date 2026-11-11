import { useState, useCallback } from 'react';
import { AuditConfirmationModalProps } from '../components/common/AuditConfirmationModal';

export interface AuditActionContext {
  title: string;
  actionSummary: string;
  entityName?: string;
  entityId?: string;
  actionType?: string;
  isDestructive?: boolean;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: (reason: string) => void | Promise<void>;
}

export interface UseAuditActionResult {
  isOpen: boolean;
  requestAuditAction: (context: AuditActionContext) => void;
  closeAuditModal: () => void;
  modalProps: AuditConfirmationModalProps;
}

/**
 * useAuditAction
 * Enterprise hook to enforce mandatory reason confirmation for sensitive ERP actions.
 */
export function useAuditAction(): UseAuditActionResult {
  const [activeContext, setActiveContext] = useState<AuditActionContext | null>(null);

  const requestAuditAction = useCallback((context: AuditActionContext) => {
    setActiveContext(context);
  }, []);

  const closeAuditModal = useCallback(() => {
    setActiveContext(null);
  }, []);

  const handleConfirm = useCallback(
    async (reason: string) => {
      if (!activeContext) return;

      const logPayload = {
        timestamp: new Date().toISOString(),
        entityName: activeContext.entityName || 'UnspecifiedEntity',
        entityId: activeContext.entityId || 'UnspecifiedId',
        actionType: activeContext.actionType || 'STATUS_CHANGE',
        reason,
        actionSummary: activeContext.actionSummary,
      };

      // 1. Console log for immediate observability & backend integration readiness
      console.log('🛡️ [AuditActionLog - Verified Enterprise Change]:', logPayload);

      try {
        await activeContext.onConfirm(reason);
      } finally {
        setActiveContext(null);
      }
    },
    [activeContext]
  );

  const modalProps: AuditConfirmationModalProps = {
    isOpen: Boolean(activeContext),
    title: activeContext?.title || 'تایید تغییرات حساس',
    actionSummary: activeContext?.actionSummary || '',
    entityName: activeContext?.entityName,
    entityId: activeContext?.entityId,
    actionType: activeContext?.actionType,
    isDestructive: activeContext?.isDestructive || false,
    confirmButtonText: activeContext?.confirmButtonText,
    cancelButtonText: activeContext?.cancelButtonText,
    onConfirm: handleConfirm,
    onCancel: closeAuditModal,
  };

  return {
    isOpen: Boolean(activeContext),
    requestAuditAction,
    closeAuditModal,
    modalProps,
  };
}
