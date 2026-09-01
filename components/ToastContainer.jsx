import { Toast } from './Toast';

/**
 * ToastContainer Component - Displays all active toasts
 * 
 * Usage (in app/page.js):
 *   const toast = useToast();
 *   return (
 *     <>
 *       <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
 *       ... rest of app ...
 *     </>
 *   );
 */
export function ToastContainer({ toasts = [], onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onRemove} />
        </div>
      ))}
    </div>
  );
}
