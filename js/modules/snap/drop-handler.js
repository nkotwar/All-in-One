// Combined drop-handler.js with paste functionality
function setupFileHandlers() {
    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("file-input");

    // If required elements are not present (e.g., unified FileHub mode), no-op
    if (!dropArea || !fileInput) {
      return;
    }
  
    // Helper function
    function isPDF(file) {
      return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    }
  
    // Handle drop event
    dropArea.addEventListener("drop", function(e) {
      e.preventDefault();
      dropArea.classList.remove("dragover");
  
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
  
      const hasPDF = files.some(isPDF);
      const hasImage = files.some((file) => file.type.startsWith("image/"));
  
      if (hasPDF) {
        const pdfFiles = files.filter(isPDF);
        if (window.switchToPDFMode) {
          window.switchToPDFMode(pdfFiles);
        }
      } else if (hasImage) {
        if (window.switchToImageMode) {
          window.switchToImageMode(files.find((file) => file.type.startsWith("image/")));
        }
      }
    });
  
    // Handle drag events
    dropArea.addEventListener("dragover", function(e) {
      e.preventDefault();
      dropArea.classList.add("dragover");
    });
  
    dropArea.addEventListener("dragleave", function() {
      dropArea.classList.remove("dragover");
    });
  
    // Handle click to open file dialog
    dropArea.addEventListener("click", function() {
      fileInput.setAttribute("accept", ".pdf, image/*");
      fileInput.setAttribute("multiple", "multiple");
      fileInput.click();
    });
  
    // Handle file selection
    fileInput.addEventListener("change", function(e) {
      const files = Array.from(e.target.files).slice(0, 10);
      const hasPDF = files.some(isPDF);
      const hasImage = files.some(file => file.type.startsWith("image/"));
  
      if (hasPDF && hasImage) {
        alert("Please select either a single image or one/more PDFs — not both.");
        fileInput.value = "";
        return;
      }
  
      if (hasImage && files.length > 1) {
        alert("Please select only one image.");
        fileInput.value = "";
        return;
      }
      
      if (files.length === 0) return;
  
      if (hasPDF) {
        if (window.switchToPDFMode) {
          window.switchToPDFMode(files.filter(isPDF));
        }
      } else if (hasImage) {
        if (window.switchToImageMode) {
          window.switchToImageMode(files.find(file => file.type.startsWith("image/")));
        }
      }
    });
  
    // Handle paste event
  // If unified FileHub is present, let it handle pastes
  if (document.getElementById('fileHubDropzone')) return;
  document.addEventListener("paste", function(event) {
      const clipboardItems = event.clipboardData.items;
      
      for (const item of clipboardItems) {
        if (item.type.startsWith("image")) {
          const blob = item.getAsFile();
          
          // Check current mode and handle appropriately
          if (window.currentMode === 'image' && window.loadImage) {
            window.loadImage(blob);
          } else if (window.switchToImageMode) {
            window.switchToImageMode(blob);
          }
          break;
        }
      }
    });
  }
  
  // Initialize when DOM is loaded
  document.addEventListener("DOMContentLoaded", setupFileHandlers);