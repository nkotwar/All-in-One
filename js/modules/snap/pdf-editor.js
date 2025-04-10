// Enhanced PDF Editor with iFrames - Complete Working Version
let pdfDocs = [];
let iframeWrappers = [];

// Initialize PDF editor
function initPDFEditor(files) {
  // Hide image editor elements
  const existingEditor = document.getElementById("pdf-editor-container");
  if (existingEditor) {
    existingEditor.remove();
  }
  document.getElementById("crop-container").style.display = "none";
  document.getElementById("controls").style.display = "none";
  document.getElementById("sliders-container").style.display = "none";

  // Expand the left column to full width
  document.querySelector(".left-column").style.maxWidth = "100%";
  document.querySelector(".right-column").style.display = "none";

  // Create PDF editor container
  const pdfEditorContainer = document.createElement("div");
  pdfEditorContainer.id = "pdf-editor-container";
  pdfEditorContainer.className = "pdf-editor-container";
  document.querySelector(".left-column").appendChild(pdfEditorContainer);

  // Create PDF viewer container
  const pdfViewerContainer = document.createElement("div");
  pdfViewerContainer.id = "pdf-viewer-container";
  pdfViewerContainer.className = "pdf-viewer-container";
  pdfEditorContainer.appendChild(pdfViewerContainer);

  // Create toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "pdf-toolbar";
  // Update the toolbar HTML in initPDFEditor()
  toolbar.innerHTML = `
  <div class="pdf-toolbar-actions">
    <button id="pdf-merge-all-btn" class="toolbar-btn" disabled>
      <i class="material-icons">merge</i>
      <span>Merge All</span>
    </button>
    <button id="pdf-download-all-btn" class="toolbar-btn" disabled>
      <i class="material-icons">download</i>
      <span>Download All</span>
    </button>
    <button id="pdf-zip-all-btn" class="toolbar-btn" disabled>
      <i class="material-icons">folder_zip</i>
      <span>Download ZIP</span>
    </button>
    <button id="pdf-add-more-btn" class="toolbar-btn">
      <i class="material-icons">add</i>
      <span>Add PDFs</span>
    </button>
    <button id="pdf-clear-all-btn" class="toolbar-btn danger" disabled>
      <i class="material-icons">delete_sweep</i>
      <span>Clear All</span>
    </button>
  </div>
`;
  pdfEditorContainer.appendChild(toolbar);

  // Create progress container
  const progressContainer = document.createElement("div");
  progressContainer.id = "pdf-progress-container";
  progressContainer.className = "pdf-progress-container";
  progressContainer.innerHTML = `
    <div class="pdf-progress-content">
      <h3>Processing PDF</h3>
      <div class="pdf-progress-bar">
        <div class="pdf-progress-fill"></div>
      </div>
      <p id="pdf-progress-text">0%</p>
    </div>
  `;
  document.body.appendChild(progressContainer);

  // Add event listeners
  setupPDFEditorEvents();

  // Load the PDF files
  loadMultiplePDFs(files);
}

function setupPDFEditorEvents() {
  // These buttons exist from the start
  document.getElementById("pdf-add-more-btn").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "application/pdf";
    input.onchange = async (e) => {
      if (e.target.files.length > 0) {
        await loadMultiplePDFs(Array.from(e.target.files));
      }
    };
    input.click();
  });

  // These will be enabled when PDFs are loaded
  const setupButtonWhenReady = (id, handler) => {
    const checkButton = () => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", handler);
        return true;
      }
      return false;
    };

    if (!checkButton()) {
      const observer = new MutationObserver(() => {
        if (checkButton()) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  setupButtonWhenReady("pdf-merge-all-btn", handleMergeAllPDFs);
  setupButtonWhenReady("pdf-download-all-btn", handleDownloadAllPDFs);
  setupButtonWhenReady("pdf-zip-all-btn", handleDownloadAsZip);
  setupButtonWhenReady("pdf-clear-all-btn", handleClearAllPDFs);
}
function handleClearAllPDFs() {
  if (pdfDocs.length === 0) return;

  // Create confirmation dialog
  const overlay = document.createElement("div");
  overlay.className = "confirmation-overlay";

  overlay.innerHTML = `
      <div class="confirmation-dialog">
        <h3>Clear All PDFs?</h3>
        <p>This will remove all ${pdfDocs.length} PDF(s) from the editor.</p>
        <div class="dialog-actions">
          <button id="cancel-clear" class="dialog-btn">Cancel</button>
          <button id="confirm-clear" class="dialog-btn danger">Clear All</button>
        </div>
      </div>
    `;

  document.body.appendChild(overlay);

  document.getElementById("cancel-clear").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  document.getElementById("confirm-clear").addEventListener("click", () => {
    pdfDocs = [];
    refreshPDFIframes();
    updateToolbarButtonsState();
    document.body.removeChild(overlay);
  });
}
function updateToolbarButtonsState() {
  const hasPDFs = pdfDocs.length > 0;
  const mergeBtn = document.getElementById("pdf-merge-all-btn");
  const downloadBtn = document.getElementById("pdf-download-all-btn");
  const zipBtn = document.getElementById("pdf-zip-all-btn");
  const clearBtn = document.getElementById("pdf-clear-all-btn");

  if (mergeBtn) mergeBtn.disabled = !hasPDFs || pdfDocs.length < 2;
  if (downloadBtn) downloadBtn.disabled = !hasPDFs;
  if (zipBtn) zipBtn.disabled = !hasPDFs;
  if (clearBtn) clearBtn.disabled = !hasPDFs;
}

async function loadMultiplePDFs(files) {
  showProgress(`Loading ${files.length} PDF(s)...`);

  try {
    const newPdfDocs = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const tempPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true, // 🔧 Added this option to handle encrypted PDFs
        });

        return {
          file,
          name: file.name,
          blob: file,
          url: URL.createObjectURL(file),
          pageCount: tempPdfDoc.getPageCount(),
          id: Date.now() + Math.random().toString(36).substr(2, 9), // Unique ID for each PDF
        };
      })
    );

    pdfDocs.push(...newPdfDocs);
    updateToolbarButtonsState();

    // Create iframes for new PDFs
    newPdfDocs.forEach((pdfDoc, index) => {
      createPDFIframe(pdfDoc, pdfDocs.length - files.length + index);
    });

    updateMergeButtonsState();
    hideProgress();
  } catch (error) {
    hideProgress();
    alert("Failed to load PDFs: " + error.message);
    console.error(error);
  }
}

function createPDFIframe(pdfDoc, index) {
  const pdfViewerContainer = document.getElementById("pdf-viewer-container");

  // Create wrapper div with data-id for more reliable tracking
  const wrapper = document.createElement("div");
  wrapper.className = "pdf-iframe-wrapper";
  wrapper.dataset.index = index;
  wrapper.dataset.pdfId = pdfDoc.id;

  // Add title bar with editable name
  const titleBar = document.createElement("div");
  titleBar.className = "pdf-title";
  titleBar.innerHTML = `
    <span class="pdf-filename" title="${pdfDoc.name}">${pdfDoc.name}</span>
    <span>${pdfDoc.pageCount} pg</span>
    <span>${
      pdfDoc.file.size > 1024 * 1024
        ? (pdfDoc.file.size / (1024 * 1024)).toFixed(1) + "MB"
        : (pdfDoc.file.size / 1024).toFixed(1) + "KB"
    }</span>
  `;
  wrapper.appendChild(titleBar);

  // Create iframe container
  const iframeContainer = document.createElement("div");
  iframeContainer.style.flexGrow = "1";
  iframeContainer.style.position = "relative";

  const iframe = document.createElement("iframe");
  iframe.className = "pdf-iframe";
  iframe.src = pdfDoc.url;
  iframeContainer.appendChild(iframe);
  wrapper.appendChild(iframeContainer);

  // Add action buttons
  const actions = document.createElement("div");
  actions.className = "pdf-iframe-actions";
  actions.innerHTML = `
    <button class="download-btn" title="Download">
      <i class="material-icons">download</i>
    </button>
    <button class="split-btn" title="Split PDF" ${
      pdfDoc.pageCount < 2 ? "disabled" : ""
    }>
      <i class="material-icons">content_cut</i>
    </button>
    <button class="merge-btn" title="Merge with next" ${
      index >= pdfDocs.length - 1 ? "disabled" : ""
    }>
      <i class="material-icons">merge</i>
    </button>
    <button class="delete-btn" title="Delete">
      <i class="material-icons">delete</i>
    </button>
  `;
  wrapper.appendChild(actions);

  // Add double-click event listener for filename editing
  const filenameElement = titleBar.querySelector('.pdf-filename');
  filenameElement.addEventListener('dblclick', () => {
    enableFilenameEditing(filenameElement, pdfDoc);
  });

  // Add event listeners
  actions.querySelector(".download-btn").addEventListener("click", () => {
    downloadPDF(pdfDoc);
  });

  actions.querySelector(".split-btn").addEventListener("click", () => {
    document.querySelectorAll(".split-controls").forEach((el) => el.remove());
    addSplitMarkers(wrapper, index);
  });

  actions.querySelector(".merge-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const currentIndex = parseInt(wrapper.dataset.index);
    if (currentIndex < pdfDocs.length - 1) {
      mergeAdjacentPDFs(currentIndex, currentIndex + 1);
    }
  });

  actions.querySelector(".delete-btn").addEventListener("click", () => {
    deletePDFIframe(index);
  });

  // Add to DOM and array
  pdfViewerContainer.appendChild(wrapper);
  iframeWrappers[index] = wrapper;

  // Update button states
  updateButtonStates(wrapper, index);

  return wrapper;
}

function enableFilenameEditing(element, pdfDoc) {
  // Save original name in case user cancels
  const originalName = pdfDoc.name;
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalName;
  input.className = 'pdf-filename-edit';
  
  // Replace span with input
  element.replaceWith(input);
  input.focus();
  
  // Select the filename without extension for easier editing
  const lastDotIndex = input.value.lastIndexOf('.');
  if (lastDotIndex > 0) {
    input.setSelectionRange(0, lastDotIndex);
  } else {
    input.select();
  }
  
  // Handle saving the new name
  const saveName = () => {
    let newName = input.value.trim();
    
    // Ensure the filename ends with .pdf
    if (!newName.toLowerCase().endsWith('.pdf')) {
      newName += '.pdf';
    }
    
    // Validate the filename
    if (newName && newName !== originalName) {
      pdfDoc.name = newName;
      pdfDoc.file = new File([pdfDoc.blob], newName, { type: "application/pdf" });
    }
    
    // Replace input with span
    const newSpan = document.createElement('span');
    newSpan.className = 'pdf-filename';
    newSpan.textContent = pdfDoc.name;
    newSpan.title = pdfDoc.name;
    input.replaceWith(newSpan);
    
    // Add event listener to the new span
    newSpan.addEventListener('dblclick', () => {
      enableFilenameEditing(newSpan, pdfDoc);
    });
  };
  
  // Handle key events
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveName();
    } else if (e.key === 'Escape') {
      // Restore original name
      const newSpan = document.createElement('span');
      newSpan.className = 'pdf-filename';
      newSpan.textContent = originalName;
      newSpan.title = originalName;
      input.replaceWith(newSpan);
      
      // Add event listener to the new span
      newSpan.addEventListener('dblclick', () => {
        enableFilenameEditing(newSpan, pdfDoc);
      });
    }
  });
  
  // Handle blur (clicking outside)
  input.addEventListener('blur', saveName);
}

function updateButtonStates(wrapper, index) {
  const pdfDoc = pdfDocs[index];
  const splitBtn = wrapper.querySelector(".split-btn");
  const mergeBtn = wrapper.querySelector(".merge-btn");

  // Update split button state
  if (splitBtn) {
    splitBtn.disabled = pdfDoc.pageCount < 2;
    splitBtn.style.opacity = splitBtn.disabled ? "0.5" : "1";
    splitBtn.style.cursor = splitBtn.disabled ? "not-allowed" : "pointer";
  }

  // Update merge button state
  if (mergeBtn) {
    mergeBtn.disabled = index >= pdfDocs.length - 1;
    mergeBtn.style.opacity = mergeBtn.disabled ? "0.5" : "1";
    mergeBtn.style.cursor = mergeBtn.disabled ? "not-allowed" : "pointer";
  }
}

function updateMergeButtonsState() {
  document.querySelectorAll(".pdf-iframe-wrapper").forEach((wrapper, index) => {
    updateButtonStates(wrapper, index);
  });
}

function addSplitMarkers(wrapper, pdfIndex) {
  const pdfDoc = pdfDocs[pdfIndex];
  if (!pdfDoc || pdfDoc.pageCount < 2) return;

  // Create split controls container
  const splitControls = document.createElement("div");
  splitControls.className = "split-controls";
  splitControls.innerHTML = `
      <div class="split-header">Split PDF: ${pdfDoc.name}</div>
      <div class="split-slider-container">
        <div class="split-slider-track"></div>
        <div class="split-slider-handle"></div>
      </div>
      <div class="split-preview">
        <div class="split-section">
          <div class="split-pages" id="first-range-${pdfIndex}">1-${Math.floor(
    pdfDoc.pageCount / 2
  )}</div>
        </div>
        <div class="split-section">
          <div class="split-pages" id="second-range-${pdfIndex}">${
    Math.floor(pdfDoc.pageCount / 2) + 1
  }-${pdfDoc.pageCount}</div>
        </div>
      </div>
      <div class="split-actions">
        <button class="split-cancel-btn">Cancel</button>
        <button class="split-confirm-btn">Split Here</button>
      </div>
    `;

  wrapper.appendChild(splitControls);

  // Get DOM elements
  const sliderContainer = splitControls.querySelector(
    ".split-slider-container"
  );
  const sliderHandle = splitControls.querySelector(".split-slider-handle");
  const firstRange = splitControls.querySelector(`#first-range-${pdfIndex}`);
  const secondRange = splitControls.querySelector(`#second-range-${pdfIndex}`);

  // Initialize currentSplitPage with the middle position
  let currentSplitPage = Math.max(
    1,
    Math.min(pdfDoc.pageCount - 1, Math.floor(1 + 0.5 * (pdfDoc.pageCount - 2)))
  );

  // Initialize interact.js slider
  interact(sliderHandle).draggable({
    modifiers: [
      interact.modifiers.restrict({
        restriction: sliderContainer,
        elementRect: { left: 0, right: 1, top: 0, bottom: 1 },
        endOnly: true,
      }),
    ],
    listeners: {
      move(event) {
        const sliderRect = sliderContainer.getBoundingClientRect();
        let position = (event.clientX - sliderRect.left) / sliderRect.width;
        position = Math.max(0, Math.min(1, position));

        sliderHandle.style.left = `${position * 100}%`;

        // Calculate the exact split position without rounding
        const exactSplitPage = 1 + position * (pdfDoc.pageCount - 1);

        // Only update the currentSplitPage when we're very close to a whole number
        // This prevents the snapping effect while still ensuring we land on whole pages
        const roundedSplitPage = Math.round(exactSplitPage);
        if (Math.abs(exactSplitPage - roundedSplitPage) < 0.1) {
          currentSplitPage = Math.max(
            1,
            Math.min(pdfDoc.pageCount - 1, roundedSplitPage)
          );
        }

        // Update display with the exact position
        firstRange.textContent = `1-${Math.floor(exactSplitPage)}`;
        secondRange.textContent = `${Math.floor(exactSplitPage) + 1}-${
          pdfDoc.pageCount
        }`;
      },
      end(event) {
        // When dragging ends, snap to the nearest whole page
        const sliderRect = sliderContainer.getBoundingClientRect();
        const position = (event.clientX - sliderRect.left) / sliderRect.width;
        const exactSplitPage = 1 + position * (pdfDoc.pageCount - 1);
        currentSplitPage = Math.max(
          1,
          Math.min(pdfDoc.pageCount - 1, Math.round(exactSplitPage))
        );

        // Update handle position to match the snapped page
        const snappedPosition = (currentSplitPage - 1) / (pdfDoc.pageCount - 1);
        sliderHandle.style.left = `${snappedPosition * 100}%`;

        // Update display
        firstRange.textContent = `1-${currentSplitPage}`;
        secondRange.textContent = `${currentSplitPage + 1}-${pdfDoc.pageCount}`;
      },
    },
  });

  // Set initial position
  const initialPosition = (currentSplitPage - 1) / (pdfDoc.pageCount - 1);
  sliderHandle.style.left = `${initialPosition * 100}%`;

  // Event listeners
  splitControls
    .querySelector(".split-cancel-btn")
    .addEventListener("click", () => {
      wrapper.removeChild(splitControls);
    });

  splitControls
    .querySelector(".split-confirm-btn")
    .addEventListener("click", () => {
      wrapper.removeChild(splitControls);
      showSplitDialog(pdfIndex, currentSplitPage);
    });
}

function showSplitDialog(pdfIndex, splitAfterPage) {
  const pdfDoc = pdfDocs[pdfIndex];

  // Create overlay
  const overlay = document.createElement("div");
  overlay.className = "split-overlay";

  // Create dialog
  const dialog = document.createElement("div");
  dialog.className = "split-dialog";
  dialog.innerHTML = `
    <h3>Confirm Split</h3>
    <p>You're about to split <strong>${
      pdfDoc.name
    }</strong> into two documents:</p>
    <div class="split-preview">
      <div class="split-section">
        <h4>First Document</h4>
        <div class="split-pages">Pages 1-${splitAfterPage}</div>
        <div class="file-name">${pdfDoc.name.replace(
          ".pdf",
          ""
        )}_part1.pdf</div>
      </div>
      <div class="split-section">
        <h4>Second Document</h4>
        <div class="split-pages">Pages ${splitAfterPage + 1}-${
    pdfDoc.pageCount
  }</div>
        <div class="file-name">${pdfDoc.name.replace(
          ".pdf",
          ""
        )}_part2.pdf</div>
      </div>
    </div>
    <div class="split-actions">
      <button id="cancel-split">Cancel</button>
      <button id="confirm-split" class="primary">Confirm Split</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Event listeners
  dialog.querySelector("#cancel-split").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  dialog.querySelector("#confirm-split").addEventListener("click", () => {
    document.body.removeChild(overlay);
    splitPDFAt(pdfIndex, splitAfterPage);
  });
}

async function splitPDFAt(pdfIndex, splitAfterPage) {
  showProgress("Splitting PDF...");

  try {
    const pdfDoc = pdfDocs[pdfIndex];
    const originalPdf = await PDFLib.PDFDocument.load(
      await pdfDoc.blob.arrayBuffer(), {ignoreEncryption: true,});
    const pageCount = originalPdf.getPageCount();

    // Validate split position
    if (splitAfterPage <= 0 || splitAfterPage >= pageCount) {
      hideProgress();
      alert(
        `Invalid split position. Please choose a page between 1 and ${
          pageCount - 1
        }`
      );
      return;
    }

    // Create both parts in parallel
    const [firstPart, secondPart] = await Promise.all([
      createPartialPDF(originalPdf, 0, splitAfterPage),
      createPartialPDF(originalPdf, splitAfterPage, pageCount),
    ]);

    const [firstBytes, secondBytes] = await Promise.all([
      firstPart.save(),
      secondPart.save(),
    ]);

    // Create new PDF objects
    const firstPdf = createPDFObject(
      firstBytes,
      `${pdfDoc.name.replace(".pdf", "")}_part1.pdf`,
      splitAfterPage
    );

    const secondPdf = createPDFObject(
      secondBytes,
      `${pdfDoc.name.replace(".pdf", "")}_part2.pdf`,
      pageCount - splitAfterPage
    );

    // Replace original PDF with the two parts
    pdfDocs.splice(pdfIndex, 1, firstPdf, secondPdf);

    // Refresh iframes
    refreshPDFIframes();

    hideProgress();
  } catch (error) {
    hideProgress();
    alert("Failed to split PDF: " + error.message);
    console.error(error);
  }
}

async function createPartialPDF(originalPdf, startPage, endPage) {
  const newPdf = await PDFLib.PDFDocument.create();
  const pages = await newPdf.copyPages(
    originalPdf,
    Array.from({ length: endPage - startPage }, (_, i) => i + startPage)
  );
  pages.forEach((page) => newPdf.addPage(page));
  return newPdf;
}

function createPDFObject(bytes, name, pageCount) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  return {
    file: new File([blob], name, { type: "application/pdf" }),
    name: name,
    blob: blob,
    url: URL.createObjectURL(blob),
    pageCount: pageCount,
    id: Date.now() + Math.random().toString(36).substr(2, 9), // Unique ID
  };
}

async function mergeAdjacentPDFs(index1, index2) {
  if (
    index1 >= pdfDocs.length ||
    index2 >= pdfDocs.length ||
    index1 === index2
  ) {
    console.error("Invalid indices for merge operation");
    return;
  }

  showProgress("Merging PDFs...");

  try {
    const pdf1 = pdfDocs[index1];
    const pdf2 = pdfDocs[index2];

    // Load both PDFs in parallel
    const [firstPdf, secondPdf] = await Promise.all([
      PDFLib.PDFDocument.load(await pdf1.blob.arrayBuffer(), {ignoreEncryption: true,}),
      PDFLib.PDFDocument.load(await pdf2.blob.arrayBuffer(), {ignoreEncryption: true,}),
    ]);

    const mergedPdf = await PDFLib.PDFDocument.create();

    // Copy pages from both PDFs
    const [firstPages, secondPages] = await Promise.all([
      mergedPdf.copyPages(
        firstPdf,
        Array.from({ length: firstPdf.getPageCount() }, (_, i) => i)
      ),
      mergedPdf.copyPages(
        secondPdf,
        Array.from({ length: secondPdf.getPageCount() }, (_, i) => i)
      ),
    ]);

    firstPages.forEach((page) => mergedPdf.addPage(page));
    secondPages.forEach((page) => mergedPdf.addPage(page));

    // Save merged PDF
    const mergedBytes = await mergedPdf.save();
    const mergedBlob = new Blob([mergedBytes], { type: "application/pdf" });

    // Create new merged PDF object
    const mergedPdfObj = {
      file: new File([mergedBlob], `merged_${pdf1.name}_${pdf2.name}`, {
        type: "application/pdf",
      }),
      name: `merged_${pdf1.name}_${pdf2.name}`,
      blob: mergedBlob,
      url: URL.createObjectURL(mergedBlob),
      pageCount: firstPdf.getPageCount() + secondPdf.getPageCount(),
      id: Date.now() + Math.random().toString(36).substr(2, 9), // New unique ID
    };

    // Replace the two PDFs with the merged one
    pdfDocs.splice(index1, 2, mergedPdfObj);

    // Refresh all iframes
    refreshPDFIframes();

    hideProgress();
  } catch (error) {
    hideProgress();
    alert("Failed to merge PDFs: " + error.message);
    console.error(error);
  }
}

function refreshPDFIframes() {
  const pdfViewerContainer = document.getElementById("pdf-viewer-container");

  // Clear all existing iframes
  pdfViewerContainer.innerHTML = "";
  iframeWrappers = [];

  // Rebuild all iframes with correct indices
  pdfDocs.forEach((pdfDoc, index) => {
    const wrapper = createPDFIframe(pdfDoc, index);
    pdfViewerContainer.appendChild(wrapper);
    iframeWrappers[index] = wrapper;
  });

  updateMergeButtonsState();
  updateToolbarButtonsState();
}

function deletePDFIframe(index) {
  if (index < 0 || index >= pdfDocs.length) return;

  // Remove from array
  pdfDocs.splice(index, 1);

  // Refresh all iframes to ensure proper indexing
  refreshPDFIframes();
  updateToolbarButtonsState();
}

function downloadPDF(pdfDoc) {
  const a = document.createElement("a");
  a.href = pdfDoc.url;
  a.download = pdfDoc.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function handleDownloadAllPDFs() {
  // Create a temporary container for multiple downloads
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  // Add all download links
  pdfDocs.forEach((pdfDoc) => {
    const a = document.createElement("a");
    a.href = pdfDoc.url;
    a.download = pdfDoc.name;
    container.appendChild(a);
    a.click();
  });

  // Remove after a short delay
  setTimeout(() => {
    document.body.removeChild(container);
  }, 1000);
}

async function handleMergeAllPDFs() {
  if (pdfDocs.length < 2) {
    alert("You need at least 2 PDFs to merge");
    return;
  }

  showProgress("Merging all PDFs...");

  try {
    const mergedPdf = await PDFLib.PDFDocument.create();
    let totalPages = 0;

    // Load all PDFs in sequence (better for error handling)
    for (const pdfDoc of pdfDocs) {
      try {
        // Ensure we have the arrayBuffer data
        const arrayBuffer = await pdfDoc.blob.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer, {ignoreEncryption: true,});

        // Copy pages from current PDF
        const pages = await mergedPdf.copyPages(
          pdf,
          Array.from({ length: pdf.getPageCount() }, (_, i) => i)
        );
        pages.forEach((page) => mergedPdf.addPage(page));
        totalPages += pdf.getPageCount();
      } catch (error) {
        console.error(`Failed to process PDF ${pdfDoc.name}:`, error);
        throw new Error(`Failed to process PDF ${pdfDoc.name}`);
      }
    }

    // Save merged PDF
    const mergedBytes = await mergedPdf.save();
    const mergedBlob = new Blob([mergedBytes], { type: "application/pdf" });

    // Create new merged PDF object
    const mergedPdfObj = {
      file: new File([mergedBlob], "merged_all.pdf", {
        type: "application/pdf",
      }),
      name: "merged_all.pdf",
      blob: mergedBlob,
      url: URL.createObjectURL(mergedBlob),
      pageCount: totalPages,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
    };

    // Replace all PDFs with the merged one
    pdfDocs = [mergedPdfObj];

    // Update the UI
    refreshPDFIframes();

    hideProgress();
  } catch (error) {
    hideProgress();
    alert("Failed to merge PDFs: " + error.message);
    console.error(error);
  }
}

async function handleDownloadAsZip() {
  showProgress("Creating ZIP file...");

  try {
    const JSZip = window.JSZip;
    if (!JSZip) throw new Error("JSZip library not loaded");

    const zip = new JSZip();

    // Add each PDF to the zip in parallel
    await Promise.all(
      pdfDocs.map(async (pdfDoc) => {
        const arrayBuffer = await pdfDoc.blob.arrayBuffer();
        zip.file(pdfDoc.name, arrayBuffer);
      })
    );

    // Generate and download the zip file
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);

    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf_collection.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideProgress();
  } catch (error) {
    hideProgress();
    alert("Failed to create ZIP file: " + error.message);
    console.error(error);
  }
}

function showProgress(message) {
  const progressContainer = document.getElementById("pdf-progress-container");
  document.getElementById("pdf-progress-text").textContent = message;
  progressContainer.style.display = "flex";
}

function hideProgress() {
  document.getElementById("pdf-progress-container").style.display = "none";
}

// Export functions
window.initPDFEditor = initPDFEditor;
