"use client";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "primary" | "warning";
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getConfirmButtonStyles = () => {
    switch (type) {
      case "danger":
        return "bg-error text-on-error hover:opacity-90 active:scale-[0.98]";
      case "warning":
        return "bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98]";
      default:
        return "bg-primary text-on-primary hover:opacity-90 active:scale-[0.98]";
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4 bg-on-background/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-surface border border-outline-variant rounded-2xl shadow-2xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-bold text-headline-sm text-on-surface">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-transform"
            type="button"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            {message}
          </p>

          {/* Actions Footer */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface border border-outline-variant text-on-surface-variant rounded-xl font-label-md text-label-md hover:bg-surface-container active:scale-95 transition-all"
              type="button"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-5 py-2 rounded-xl font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all shadow ${getConfirmButtonStyles()}`}
              type="button"
            >
              <span>{confirmText}</span>
              {type === "danger" && <span className="material-symbols-outlined text-sm">delete</span>}
              {type === "primary" && <span className="material-symbols-outlined text-sm">check_circle</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
