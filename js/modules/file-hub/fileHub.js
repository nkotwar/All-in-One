// Unified File Hub: routes files to the right module (snap/pdf, text-parser, etc.)
// Contract:
// - Persistent dropzone with id=fileHubDropzone and input=fileHubInput
// - Shows exactly one module view at a time inside #fileHubModules
// - Keeps the Add Files zone always visible
// - Extensible via handler registry below

(function () {
  const hub = {
    // Registry: order matters for detection precedence
    handlers: [
      // PDF handler (uses snap/pdf-editor)
      {
        id: 'pdf',
        canHandle: (file) => isType(file, 'application/pdf') || hasExt(file, '.pdf'),
        enter: () => activateModule('snap'),
        handle: (files) => {
          ensureSnapHooks(() => {
            window.switchToPDFMode?.(files);
          });
        },
      },
      // Image handler (uses snap/image cropper)
      {
        id: 'image',
        canHandle: (file) => file?.type?.startsWith('image/') || hasImageExt(file),
        enter: () => activateModule('snap'),
        handle: (files) => {
          const img = first(files, (f) => f.type?.startsWith('image/') || hasImageExt(f));
          ensureSnapHooks(() => {
            window.switchToImageMode?.(img);
          });
        },
      },
      // Text-like handler (routes to text-parser)
      {
        id: 'text',
        canHandle: (file) => isTextLike(file),
        enter: () => activateModule('text'),
        handle: async (files) => {
          const firstText = first(files, isTextLike);
          // Surface the selected file into textParser's upload UI without removing Add Files zone
          await ensureTextParserReady();
          feedTextParserFile(firstText);
        },
      },
      // Gzip handler (text gzip)
      {
        id: 'gzip',
        canHandle: (file) => hasExt(file, '.gz'),
        enter: () => activateModule('text'),
        handle: async (files) => {
          await ensureTextParserReady();
          feedTextParserFile(files[0]);
        },
      },
      // Zip: if contains .txt/.csv/.log/.rpt, route to text; otherwise ignore for now
      {
        id: 'zip',
        canHandle: (file) => hasExt(file, '.zip') || isType(file, 'application/zip'),
        enter: () => activateModule('text'),
        handle: async (files) => {
          await ensureTextParserReady();
          // Let textParser own zip handling if/when added. For now, inform user.
          toast('ZIP detected. Please extract text files locally and add them here.');
        },
      },
    ],
  };

  // Wire up the persistent dropzone
  document.addEventListener('DOMContentLoaded', () => {
    const dz = document.getElementById('fileHubDropzone');
    const input = document.getElementById('fileHubInput');
    if (!dz || !input) return;

    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) route(files);
    });
    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) route(files);
      input.value = '';
    });

    // Paste support (images)
    document.addEventListener('paste', (event) => {
      const items = event.clipboardData?.items || [];
      for (const it of items) {
        if (it.type?.startsWith('image')) {
          const blob = it.getAsFile();
          if (blob) route([blob]);
          break;
        }
      }
    });
  });

  // Router logic
  function route(files) {
    // One primary category per batch. Priority: PDF > Image > Text/Gzip > Zip
    for (const id of ['pdf', 'image', 'text', 'gzip', 'zip']) {
      const h = hub.handlers.find((x) => x.id === id);
      if (h && files.some((f) => h.canHandle(f))) {
        h.enter?.();
        h.handle?.(files);
        return;
      }
    }
    toast('Unsupported file type.');
  }

  // Module activation: show exactly one module surface beneath the dropzone
  function activateModule(kind) {
    const host = document.getElementById('fileHubModules');
    if (!host) return;
    const sections = host.querySelectorAll('[data-module]');
    sections.forEach((s) => (s.style.display = 'none'));
    if (kind === 'snap') {
      document.getElementById('snapModule')?.setAttribute('style', '');
      // Ensure the internal drop target expected by snap exists in DOM
      ensureSnapDropSurface();
    } else if (kind === 'text') {
      document.getElementById('textParserModule')?.setAttribute('style', '');
      ensureTextParserDropSurface();
    }
  }

  // Utilities
  function isType(file, mime) {
    return (file?.type || '').toLowerCase() === mime;
  }
  function hasExt(file, ext) {
    const name = (file?.name || '').toLowerCase();
    return name.endsWith(ext);
  }
  function hasImageExt(file) {
    const n = (file?.name || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(n);
  }
  function isTextLike(file) {
    const t = (file?.type || '').toLowerCase();
    const n = (file?.name || '').toLowerCase();
    return (
      t.startsWith('text/') ||
      ['.txt', '.csv', '.log', '.rpt', '.dat', '.tsv'].some((e) => n.endsWith(e))
    );
  }
  function first(arr, pred) { return arr.find(pred); }

  function ensureSnapHooks(cb) {
    // snap scripts expose window.switchToPDFMode/window.switchToImageMode
    if (typeof window.switchToPDFMode === 'function' || typeof window.switchToImageMode === 'function') {
      cb();
      return;
    }
    // Wait for scripts to finish
    const iv = setInterval(() => {
      if (typeof window.switchToPDFMode === 'function' || typeof window.switchToImageMode === 'function') {
        clearInterval(iv);
        cb();
      }
    }, 50);
    setTimeout(() => clearInterval(iv), 3000);
  }

  function ensureTextParserReady() {
    return new Promise((resolve) => {
      if (window.textParserInstance) return resolve();
      const iv = setInterval(() => {
        if (window.textParserInstance) {
          clearInterval(iv);
          resolve();
        }
      }, 50);
      setTimeout(() => { clearInterval(iv); resolve(); }, 3000);
    });
  }

  function feedTextParserFile(file) {
    // Prefer calling its processFile directly if available
    try {
      if (window.textParserInstance?.processFile) {
        window.textParserInstance.processFile(file);
        return;
      }
    } catch {}
    // Fallback: set file input value and dispatch change
    const input = document.getElementById('fileInput');
    if (input) {
      // Cannot programmatically set FileList; rely on processFile path instead
      toast('Text module is ready. Click Parse after selecting options.');
    }
  }

  function ensureSnapDropSurface() {
    // snap’s drop-handler expects #drop-area and #file-input; provide a hidden shim to keep it happy.
    if (!document.getElementById('drop-area')) {
      const shim = document.createElement('div');
      shim.id = 'drop-area';
      shim.style.display = 'none';
      const fi = document.createElement('input');
      fi.type = 'file';
      fi.id = 'file-input';
      fi.style.display = 'none';
      shim.appendChild(fi);
      document.body.appendChild(shim);
    }
  }

  function ensureTextParserDropSurface() {
    // textParser binds to #uploadZone/#fileInput within its module; they exist in DOM in this page.
    // Nothing to do, but keep for symmetry.
  }

  function toast(msg) {
    try {
      if (window.ToastSystem?.show) return window.ToastSystem.show(msg);
    } catch {}
    console.log('[FileHub]', msg);
  }
})();
