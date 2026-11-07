import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global error overlay for errors occurring outside React tree (plain DOM)
function showGlobalErrorOverlay(title: string, message: string, stack?: string) {
  if (typeof document === 'undefined') return;

  // If overlay already exists, do not recreate
  if (document.getElementById('global-error-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'global-error-overlay';
  overlay.setAttribute(
    'style',
    'position:fixed;inset:0;background-color:#07070A;color:#ffffff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:24px 16px;overflow-y:auto;z-index:9999999;box-sizing:border-box;'
  );

  const container = document.createElement('div');
  container.setAttribute('style', 'max-width:640px;margin:0 auto;width:100%;');

  const heading = document.createElement('div');
  heading.setAttribute(
    'style',
    'color:#ff3b30;font-size:18px;font-weight:bold;margin-bottom:12px;letter-spacing:0.5px;'
  );
  heading.textContent = title;

  const msgEl = document.createElement('div');
  msgEl.setAttribute(
    'style',
    'font-size:14px;line-height:1.4;margin-bottom:16px;word-break:break-word;color:#ff9500;'
  );
  msgEl.textContent = message;

  container.appendChild(heading);
  container.appendChild(msgEl);

  if (stack) {
    const stackLines = stack
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join('\n');
    if (stackLines) {
      const stackLabel = document.createElement('div');
      stackLabel.setAttribute(
        'style',
        'font-size:11px;color:#8e8e93;text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;'
      );
      stackLabel.textContent = 'Stack Trace (first 8 lines):';
      const pre = document.createElement('pre');
      pre.setAttribute(
        'style',
        'background-color:#16161d;padding:12px;border-radius:6px;font-size:11px;line-height:1.4;overflow-x:auto;white-space:pre-wrap;color:#e5e5ea;margin:0 0 16px 0;border:1px solid #2c2c36;'
      );
      pre.textContent = stackLines;
      container.appendChild(stackLabel);
      container.appendChild(pre);
    }
  }

  const uaLabel = document.createElement('div');
  uaLabel.setAttribute(
    'style',
    'font-size:11px;color:#8e8e93;text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;'
  );
  uaLabel.textContent = 'User Agent:';
  const uaEl = document.createElement('div');
  uaEl.setAttribute(
    'style',
    'background-color:#16161d;padding:10px 12px;border-radius:6px;font-size:11px;line-height:1.3;word-break:break-all;color:#aeaeb2;margin-bottom:24px;border:1px solid #2c2c36;'
  );
  uaEl.textContent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown User-Agent';
  container.appendChild(uaLabel);
  container.appendChild(uaEl);

  const btn = document.createElement('button');
  btn.setAttribute(
    'style',
    'background-color:#ff6d00;color:#ffffff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;'
  );
  btn.textContent = 'Reload';
  btn.onclick = () => window.location.reload();
  container.appendChild(btn);

  overlay.appendChild(container);
  document.body.appendChild(overlay);
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const err = event.error;
    showGlobalErrorOverlay(
      'Uncaught Window Error',
      event.message || String(err || 'Unknown error'),
      err?.stack
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
    const stack = reason instanceof Error ? reason.stack : undefined;
    showGlobalErrorOverlay('Unhandled Promise Rejection', msg, stack);
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
