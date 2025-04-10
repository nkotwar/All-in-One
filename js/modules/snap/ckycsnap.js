document.addEventListener("DOMContentLoaded", () => {
  let cropper;
  let isResolutionLocked = false;
  let isNoiseLocked = false;
  let isQualityLocked = false;
  let isSearching = false;
  let stopSearch = false;
  let isColorDepthLocked = false;
  let currentMode = null; // 'image' or 'pdf'

  window.currentMode = currentMode;

  // Initialize blur slider as locked
  let isBlurLocked = true; // Blur starts locked
  document.getElementById("blur-slider").disabled = true; // Disable the slider
  document.getElementById("lock-blur").classList.add("locked"); // Add locked class
  document.getElementById("lock-blur").textContent = "🔑"; // Update button text

  const autoAdjustButton = document.getElementById("auto-adjust-button");
  const buttonIcon = autoAdjustButton.querySelector(".button-icon");
  const buttonText = autoAdjustButton.querySelector(".button-text");
  const loadingSpinner = autoAdjustButton.querySelector(".loading-spinner");

  const blurSlider = document.getElementById("blur-slider");
  const blurValue = document.getElementById("blur-value");
  const colorDepthSlider = document.getElementById("color-depth-slider");
  const colorDepthValue = document.getElementById("color-depth-value");
  const downloadButton = document.getElementById("download-preview-button");

  const upscaleSlider = document.getElementById("upscale-slider");
  const noiseSlider = document.getElementById("noise-slider");
  const qualitySlider = document.getElementById("quality-slider");
  const qualityValue = document.getElementById("quality-value");
  const upscaleValue = document.getElementById("upscale-value");
  const noiseValue = document.getElementById("noise-value");

  // Validate file size input and disable/enable the adjust button
  document.getElementById("file-size").addEventListener("input", function () {
    const fileSizeInput = document.getElementById("file-size");
    const fileSizeError = document.getElementById("file-size-error");
    const adjustButton = document.getElementById("auto-adjust-button");
    const minFileSizeKB = parseFloat(fileSizeInput.min);
    const maxFileSizeKB = parseFloat(fileSizeInput.max);
    const enteredFileSizeKB = parseFloat(fileSizeInput.value);

    if (isNaN(enteredFileSizeKB)) {
      fileSizeError.style.display = "block";
      fileSizeError.textContent = "Please enter a valid number.";
      adjustButton.disabled = true; // Disable the button
      return;
    }

    if (
      enteredFileSizeKB < minFileSizeKB ||
      enteredFileSizeKB > maxFileSizeKB
    ) {
      fileSizeError.style.display = "block";
      fileSizeError.textContent = `Please enter a value between ${minFileSizeKB.toFixed(
        2
      )} KB and ${maxFileSizeKB.toFixed(2)} KB.`;
      adjustButton.disabled = true; // Disable the button
    } else {
      fileSizeError.style.display = "none";
      adjustButton.disabled = false; // Enable the button
    }
  });

  window.switchToImageMode = function (imageFile) {
    currentMode = "image";

    // Completely remove PDF editor container if it exists
    const pdfEditor = document.getElementById("pdf-editor-container");
    if (pdfEditor) {
      pdfEditor.remove();
      iframeWrappers = []; // Clear iframe wrappers array
      pdfDocs = []; // Clear PDF documents array
    }

    // Show image editor elements
    document.getElementById("crop-container").style.display = "block";
    document.getElementById("controls").style.display = "flex";
    document.getElementById("sliders-container").style.display = "grid";

    // Reset left column width
    document.querySelector(".left-column").style.maxWidth = "30%";
    document.querySelector(".right-column").style.display = "flex";

    // Load the image
    loadImage(imageFile);
  };

  window.switchToPDFMode = function (pdfFiles) {
    currentMode = "pdf";

    // Clean up image editor resources
    if (window.cropper) {
      cropper.destroy();
      cropper = null;
    }

    // Hide image editor elements
    document.getElementById("crop-container").style.display = "none";
    document.getElementById("controls").style.display = "none";
    document.getElementById("sliders-container").style.display = "none";

    // Clear any existing image
    const imageElement = document.getElementById("image");
    if (imageElement) {
      imageElement.src = "";
    }

    // Initialize or show PDF editor
    const pdfEditor = document.getElementById("pdf-editor-container");
    if (!pdfEditor) {
      // First time initialization
      initPDFEditor(pdfFiles);
    } else {
      // Only add new PDFs if we're already in PDF mode
      if (currentMode === "pdf") {
        loadMultiplePDFs(pdfFiles);
      } else {
        // If switching from image mode, reinitialize with new PDFs
        initPDFEditor(pdfFiles);
      }
    }
  };

  // Add event listener for the auto-adjust button
  autoAdjustButton.addEventListener("click", async function () {
    const desiredFileSizeKB = parseFloat(
      document.getElementById("file-size").value
    );

    if (isNaN(desiredFileSizeKB) || desiredFileSizeKB <= 0) {
      alert("Please enter a valid file size.");
      return;
    }

    // Disable the button and show loading spinner
    autoAdjustButton.disabled = true;
    buttonIcon.style.display = "none";
    buttonText.textContent = "Adjusting...";
    loadingSpinner.style.display = "inline-block";

    // Run the auto-adjust process
    await autoAdjustSliders(desiredFileSizeKB);

    // Re-enable the button and show success state
    autoAdjustButton.disabled = false;
    buttonIcon.style.display = "inline-block";
    buttonText.textContent = "Auto Adjust for Desired Size";
    loadingSpinner.style.display = "none";

    // Show success feedback
    buttonIcon.textContent = "✅";
    setTimeout(() => {
      buttonIcon.textContent = "🪄"; // Reset icon after 2 seconds
    }, 2000);
  });

  // Update sliders event listeners
  upscaleSlider.addEventListener("input", function () {
    upscaleValue.textContent = `${parseFloat(upscaleSlider.value).toFixed(1)}x`;
    handleSliderChange();
  });

  noiseSlider.addEventListener("input", function () {
    noiseValue.textContent = `${parseFloat(noiseSlider.value).toFixed(2)}%`;
    handleSliderChange();
  });

  blurSlider.addEventListener("input", function () {
    if (!isBlurLocked) {
      // Only update if the slider is unlocked
      blurValue.textContent = `${parseFloat(blurSlider.value).toFixed(2)}px`;
      handleSliderChange();
    }
  });

  colorDepthSlider.addEventListener("input", function () {
    colorDepthValue.textContent = `${parseFloat(colorDepthSlider.value).toFixed(
      2
    )}-bit`;
    handleSliderChange();
  });

  // Event listener for quality slider
  qualitySlider.addEventListener("input", function () {
    qualityValue.textContent = `${Math.round(
      parseFloat(qualitySlider.value) * 100
    ).toFixed(2)}%`; // Update quality display
    handleSliderChange(); // Call the unified function
  });

  function costFunction(currentFileSizeKB, desiredFileSizeKB) {
    return Math.abs(currentFileSizeKB - desiredFileSizeKB);
  }

  function getNeighbor(currentParams) {
    const neighbor = { ...currentParams };

    // Randomly adjust each parameter within bounds, respecting locks
    if (!isResolutionLocked) {
      neighbor.upscaleFactor = Math.min(
        Math.max(neighbor.upscaleFactor + (Math.random() - 0.5) * 0.2, 1),
        5
      );
    }
    if (!isNoiseLocked) {
      neighbor.noiseLevel = Math.min(
        Math.max(neighbor.noiseLevel + (Math.random() - 0.5) * 5, 0),
        100
      );
    }
    if (!isBlurLocked) {
      neighbor.blurLevel = Math.min(
        Math.max(neighbor.blurLevel + (Math.random() - 0.5) * 1, 0),
        20
      );
    }
    if (!isColorDepthLocked) {
      neighbor.bitDepth = Math.min(
        Math.max(neighbor.bitDepth + (Math.random() - 0.5) * 1, 1),
        24
      );
    }
    if (!isQualityLocked) {
      neighbor.quality = Math.min(
        Math.max(neighbor.quality + (Math.random() - 0.5) * 0.05, 0.01),
        1
      );
    }

    return neighbor;
  }

  function applyBlur(canvas, blurLevel) {
    const ctx = canvas.getContext("2d");
    ctx.filter = `blur(${blurLevel}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none"; // Reset filter
    return canvas;
  }

  function reduceColorDepth(canvas, bitDepth) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const factor = 256 / 2 ** bitDepth;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(data[i] / factor) * factor; // Red
      data[i + 1] = Math.floor(data[i + 1] / factor) * factor; // Green
      data[i + 2] = Math.floor(data[i + 2] / factor) * factor; // Blue
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Function to calculate the file size range
  function calculateFileSizeRange() {
    // Check if the crop box is valid
    const cropBoxData = cropper.getCropBoxData();
    if (!cropBoxData || cropBoxData.width === 0 || cropBoxData.height === 0) {
      console.warn("Crop box is not yet defined.");
      return;
    }

    // Get the cropped canvas
    const croppedImage = cropper.getCroppedCanvas();
    if (
      !croppedImage ||
      croppedImage.width === 0 ||
      croppedImage.height === 0
    ) {
      console.warn("Cropped canvas is empty or invalid.");
      return;
    }

    // Calculate minimum file size (lowest quality, least noise, least upscale, max blur, least color depth)
    const minParams = {
      upscaleFactor: 1, // Minimum upscale
      noiseLevel: 0, // Minimum noise
      blurLevel: 20, // Maximum blur
      bitDepth: 1, // Minimum color depth
      quality: 0.01, // Minimum quality
    };
    const minFileSizeKB = getFileSize(minParams);

    // Calculate maximum file size (highest quality, max noise, max upscale, least blur, max color depth)
    const maxParams = {
      upscaleFactor: 5, // Maximum upscale
      noiseLevel: 100, // Maximum noise
      blurLevel: 0, // Minimum blur
      bitDepth: 24, // Maximum color depth
      quality: 1, // Maximum quality
    };
    const maxFileSizeKB = getFileSize(maxParams);

    // Update the file size range display
    const fileSizeRange = document.getElementById("file-size-range");
    fileSizeRange.textContent = `${minFileSizeKB.toFixed(
      2
    )} KB - ${maxFileSizeKB.toFixed(2)} KB`;

    // Update the input field's min and max attributes
    const fileSizeInput = document.getElementById("file-size");
    fileSizeInput.min = minFileSizeKB.toFixed(2);
    fileSizeInput.max = maxFileSizeKB.toFixed(2);
  }

  // Initialize the cropper
  function initCropper(image) {
    if (cropper) {
      cropper.destroy();
    }

    // Initialize the cropper with mobile-friendly settings
    cropper = new Cropper(image, {
      aspectRatio: NaN, // Free aspect ratio
      viewMode: 0, // Allow the crop box to go outside the image
      dragMode: "crop", // Allow creating a new crop box
      autoCrop: true, // Automatically crop the image
      autoCropArea: 0.8, // Default crop area (80% of the image)
      responsive: true, // Make the cropper responsive
      restore: false, // Disable restoring the cropper after resize
      checkCrossOrigin: false, // Disable cross-origin check
      guides: false, // Hide the grid lines
      center: false, // Disable centering the crop box
      highlight: false, // Disable highlighting the crop box
      background: true, // Show the background
      movable: true, // Allow moving the image
      rotatable: true, // Allow rotating the image
      scalable: true, // Allow scaling the image
      zoomable: true, // Allow zooming the image
      zoomOnTouch: true, // Enable zooming on touch devices
      zoomOnWheel: true, // Enable zooming with the mouse wheel
      wheelZoomRatio: 0.1, // Adjust the zoom speed
      cropBoxMovable: true, // Allow moving the crop box
      cropBoxResizable: true, // Allow resizing the crop box
      toggleDragModeOnDblclick: false, // Disable double-click to toggle drag mode
      minCanvasWidth: 200, // Minimum canvas width
      minCanvasHeight: 200, // Minimum canvas height
      minCropBoxWidth: 1, // No minimum crop box width
      minCropBoxHeight: 1, // No minimum crop box height
      touchDragZoom: false, // Disable touch drag zoom (optional)
      cropend: function () {
        // Calculate the file size range when the user is done cropping
        calculateFileSizeRange();
        handleSliderChange();
      },
    });

    // Add event listener to reset the crop box on click outside
    image.addEventListener("click", function (e) {
      const cropBoxData = cropper.getCropBoxData();
      const pointer = cropper.getPointerData();

      // Check if the click is outside the crop box
      if (
        pointer.x < cropBoxData.left ||
        pointer.x > cropBoxData.left + cropBoxData.width ||
        pointer.y < cropBoxData.top ||
        pointer.y > cropBoxData.top + cropBoxData.height
      ) {
        // Reset the crop box to cover the entire image
        cropper.setCropBoxData({
          left: 0,
          top: 0,
          width: cropper.getCanvasData().width,
          height: cropper.getCanvasData().height,
        });
      }
    });
  }

  // Load image and initialize cropper
  window.loadImage = function (file) {
    // Clean up any PDF editor resources
    const pdfEditor = document.getElementById("pdf-editor-container");
    if (pdfEditor) {
      pdfEditor.remove();
      iframeWrappers = [];
      pdfDocs = [];
    }

    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const image = document.getElementById("image");
        image.src = e.target.result;

        // Show image editor elements
        document.getElementById("crop-container").style.display = "block";
        document.getElementById("controls").style.display = "flex";
        document.getElementById("sliders-container").style.display = "grid";

        // Reset layout
        document.querySelector(".left-column").style.maxWidth = "30%";
        document.querySelector(".right-column").style.display = "flex";

        // Initialize the cropper
        initCropper(image);

        // Calculate the file size range
        setTimeout(() => {
          calculateFileSizeRange();
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  function handleSliderChange() {
    const croppedImage = cropper.getCroppedCanvas();
    if (!croppedImage || !(croppedImage instanceof HTMLCanvasElement)) {
      console.error("Cropper did not return a valid canvas.");
      return;
    }

    // Get values from all sliders
    const upscaleFactor = parseFloat(upscaleSlider.value);
    const noiseLevel = parseFloat(noiseSlider.value);
    const blurLevel = parseFloat(blurSlider.value);
    const bitDepth = parseFloat(colorDepthSlider.value);
    const quality = parseFloat(qualitySlider.value);

    // Apply all effects
    const upscaledImage = upscaleImage(croppedImage, upscaleFactor);
    const noisyImage = addNoise(upscaledImage, noiseLevel);
    const blurredImage = applyBlur(noisyImage, blurLevel);
    const colorDepthImage = reduceColorDepth(blurredImage, bitDepth);

    // Update the iteration preview
    const preview = document.getElementById("iteration-preview");
    preview.src = colorDepthImage.toDataURL("image/jpeg", quality);
    preview.style.display = "block";

    // Convert the image to JPEG with the selected quality
    const imageUrl = colorDepthImage.toDataURL("image/jpeg", quality);

    // Calculate file size
    const fileSizeKB = getFileSizeKB(imageUrl);

    // Update the download button
    updateDownloadButton(imageUrl, fileSizeKB);

    // Update display values
    upscaleValue.textContent = `${upscaleFactor.toFixed(1)}x`;
    noiseValue.textContent = `${noiseLevel.toFixed(2)}%`;
    blurValue.textContent = `${blurLevel.toFixed(2)}px`;
    colorDepthValue.textContent = `${bitDepth.toFixed(2)}-bit`;
    qualityValue.textContent = `${Math.round(quality * 100).toFixed(2)}%`;
  }

  function getFileSize(params) {
    const croppedImage = cropper.getCroppedCanvas();
    const upscaledImage = upscaleImage(croppedImage, params.upscaleFactor);
    const noisyImage = addNoise(upscaledImage, params.noiseLevel);
    const blurredImage = applyBlur(noisyImage, params.blurLevel);
    const colorDepthImage = reduceColorDepth(blurredImage, params.bitDepth);

    const imageUrl = colorDepthImage.toDataURL("image/jpeg", params.quality);
    return getFileSizeKB(imageUrl);
  }

  // Helper function to calculate file size in KB
  function getFileSizeKB(dataURL) {
    const fileSizeBytes = dataURL.length * (3 / 4); // Base64 encoding overhead
    return fileSizeBytes / 1024; // Convert to KB
  }

  function upscaleImage(image, scaleFactor) {
    const canvas = document.createElement("canvas");
    canvas.width = image.width * scaleFactor;
    canvas.height = image.height * scaleFactor;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas; // Return the scaled canvas
  }

  function addNoise(canvas, noiseLevel) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * noiseLevel;
      data[i] += noise; // Red
      data[i + 1] += noise; // Green
      data[i + 2] += noise; // Blue
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas; // Return the noisy canvas
  }

  // Function to add the stop button
  function addStopButton() {
    const stopButton = document.getElementById("stop-button");
    if (!stopButton) {
      console.error("Stop button not found!");
      return;
    }

    // Show the stop button
    stopButton.style.display = "block";

    // Add event listener to stop the iteration
    stopButton.onclick = () => {
      stopSearch = true;
      stopButton.style.display = "none"; // Hide the stop button after clicking
    };
  }

  // Function to remove the stop button
  function removeStopButton() {
    const stopButton = document.getElementById("stop-button");
    if (stopButton) {
      stopButton.style.display = "none"; // Hide the stop button
    }
  }

  function freezeSliders(freeze) {
    // Respect the locked states when re-enabling sliders
    upscaleSlider.disabled = freeze || isResolutionLocked;
    noiseSlider.disabled = freeze || isNoiseLocked;
    blurSlider.disabled = freeze || isBlurLocked;
    colorDepthSlider.disabled = freeze || isColorDepthLocked;
    qualitySlider.disabled = freeze || isQualityLocked;
  }

  function getProcessedImage(params, quality) {
    const croppedImage = cropper.getCroppedCanvas();
    const upscaledImage = upscaleImage(croppedImage, params.upscaleFactor);
    const noisyImage = addNoise(upscaledImage, params.noiseLevel);
    const blurredImage = applyBlur(noisyImage, params.blurLevel);
    const colorDepthImage = reduceColorDepth(blurredImage, params.bitDepth);
    return colorDepthImage.toDataURL("image/jpeg", quality);
  }

  // Function to update the download button
  function updateDownloadButton(imageUrl, fileSizeKB) {
    if (!downloadButton) {
      console.error("Download button not found!");
      return;
    }

    // Ensure the button is visible
    downloadButton.style.display = "block";

    // Update the button text
    downloadButton.textContent = `Download (${fileSizeKB.toFixed(2)} KB)`;

    // Update the onclick event
    downloadButton.onclick = () => {
      stopSearch = true; // Stop any ongoing iterations

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = "cropped-image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up after download
      if (!isSearching) {
        removeStopButton(); // Hide the stop button if no iteration is running
      }
    };
  }

  // Function to reset the download button (optional, for cleanup)
  function resetDownloadButton() {
    if (downloadButton) {
      downloadButton.style.display = "none";
      downloadButton.textContent = "Download (0 KB)";
      downloadButton.onclick = null; // Clear any existing event listeners
    }
  }

  async function autoAdjustSliders(desiredFileSizeKB) {
    if (isSearching) return; // Prevent multiple searches
    isSearching = true;
    stopSearch = false; // Reset stopSearch flag

    // Freeze sliders during iteration
    freezeSliders(true);

    // Reset the download button at the start of the iteration
    resetDownloadButton();

    const initialParams = {
      upscaleFactor: parseFloat(upscaleSlider.value),
      noiseLevel: parseFloat(noiseSlider.value),
      blurLevel: parseFloat(blurSlider.value),
      bitDepth: parseFloat(colorDepthSlider.value),
      quality: parseFloat(qualitySlider.value),
    };

    const canvas = document.getElementById("annealing-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Add stop button
    addStopButton();

    let currentParams = initialParams;
    let currentCost = costFunction(
      getFileSize(currentParams),
      desiredFileSizeKB
    );

    let bestParams = { ...currentParams };
    let bestFileSizeKB = getFileSize(bestParams); // Track the actual best file size
    let bestCost = currentCost;

    let temperature = 1.0; // Initial temperature
    const coolingRate = 0.99; // Cooling rate

    const points = []; // Store points for visualization

    // Function to draw the progress visualization
    function drawProgress(
      iteration,
      currentFileSizeKB,
      bestFileSizeKB,
      desiredFileSizeKB,
      imageUrl,
      totalIterations,
      currentParams
    ) {
      const ctx = document.getElementById("annealing-canvas").getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the progress line
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      points.forEach((point, index) => {
        const x = (point.x / totalIterations) * canvas.width; // Normalize x-axis dynamically
        const y = canvas.height - (point.y / desiredFileSizeKB) * canvas.height;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = "#007bff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add text information
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";

      // Show iteration and delta
      ctx.fillText(`Iteration: ${iteration}`, 10, 20);
      ctx.fillText(
        `Delta (Δ): ${Math.abs(bestFileSizeKB - desiredFileSizeKB).toFixed(
          2
        )} KB`,
        10,
        40
      );

      // Show current parameter values
      ctx.fillText(
        `Super Res: ${currentParams.upscaleFactor.toFixed(1)}x`,
        10,
        60
      );
      ctx.fillText(
        `Texture Synthesizer: ${currentParams.noiseLevel.toFixed(1)}%`,
        10,
        80
      );
      ctx.fillText(
        `Bitrate Compressor: ${Math.round(currentParams.quality * 100)}%`,
        10,
        100
      );
      ctx.fillText(
        `Gaussian Operator: ${currentParams.blurLevel.toFixed(1)}px`,
        10,
        120
      );
      ctx.fillText(`Pixel Spectrum: ${currentParams.bitDepth}-bit`, 10, 140);

      // Update the image preview
      const preview = document.getElementById("iteration-preview");
      preview.src = imageUrl; // Use the image URL with quality applied
      preview.style.display = "block";

      // Update the download button
      updateDownloadButton(imageUrl, currentFileSizeKB);
    }

    // Run Simulated Annealing asynchronously
    for (let i = 0; i < 1000; i++) {
      if (stopSearch) break; // Stop if the user clicks the stop button

      // Generate a neighbor
      const neighborParams = getNeighbor(currentParams);
      const neighborCost = costFunction(
        getFileSize(neighborParams),
        desiredFileSizeKB
      );

      // Accept the neighbor if it's better or with a certain probability
      if (
        neighborCost < currentCost ||
        Math.random() < Math.exp((currentCost - neighborCost) / temperature)
      ) {
        currentParams = neighborParams;
        currentCost = neighborCost;
      }

      // Update the best solution
      if (currentCost < bestCost) {
        bestParams = { ...currentParams };
        bestFileSizeKB = getFileSize(bestParams); // Update the actual best file size
        bestCost = currentCost;
      }

      // Cool the temperature
      temperature *= coolingRate;

      // Store points for visualization
      points.push({ x: i, y: currentCost });

      // Draw the progress visualization
      const quality = parseFloat(qualitySlider.value); // Get current quality value
      const imageUrl = getProcessedImage(currentParams, quality); // Apply quality
      drawProgress(
        i,
        getFileSize(currentParams),
        bestFileSizeKB,
        desiredFileSizeKB,
        imageUrl,
        i + 1,
        currentParams
      );

      // Pause to allow the UI to update
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Stop if the cost is close enough
      if (bestCost < 1) break; // Stop if the difference is less than 1 KB
    }

    // Apply the best parameters
    upscaleSlider.value = bestParams.upscaleFactor;
    noiseSlider.value = bestParams.noiseLevel;
    blurSlider.value = bestParams.blurLevel;
    colorDepthSlider.value = bestParams.bitDepth;
    qualitySlider.value = bestParams.quality;

    // Update the slider UI values
    upscaleValue.textContent = `${bestParams.upscaleFactor.toFixed(1)}x`;
    noiseValue.textContent = `${bestParams.noiseLevel.toFixed(2)}%`;
    blurValue.textContent = `${bestParams.blurLevel.toFixed(2)}px`;
    colorDepthValue.textContent = `${bestParams.bitDepth.toFixed(2)}-bit`;
    qualityValue.textContent = `${Math.round(bestParams.quality * 100).toFixed(
      2
    )}%`;

    // Generate the image URL
    const imageUrl = getProcessedImage(bestParams, bestParams.quality);

    // Update the download button with the best image
    updateDownloadButton(imageUrl, bestFileSizeKB);

    // Hide progress indicator and unfreeze sliders
    isSearching = false;
    freezeSliders(false);

    // Remove the stop button
    removeStopButton();
  }

  document.getElementById("stop-button").addEventListener("click", function () {
    stopSearch = true; // Stop the iteration
    this.style.display = "none"; // Hide the stop button
  });

  // Function to recalculate the file size range based on locked parameters
  function recalculateFileSizeRange() {
    const croppedImage = cropper.getCroppedCanvas();
    if (
      !croppedImage ||
      croppedImage.width === 0 ||
      croppedImage.height === 0
    ) {
      console.warn("Cropped canvas is empty or invalid.");
      return;
    }

    // Define default parameter ranges
    const minParams = {
      upscaleFactor: isResolutionLocked ? parseFloat(upscaleSlider.value) : 1,
      noiseLevel: isNoiseLocked ? parseFloat(noiseSlider.value) : 0,
      blurLevel: isBlurLocked ? parseFloat(blurSlider.value) : 20,
      bitDepth: isColorDepthLocked ? parseFloat(colorDepthSlider.value) : 1,
      quality: isQualityLocked ? parseFloat(qualitySlider.value) : 0.01,
    };

    const maxParams = {
      upscaleFactor: isResolutionLocked ? parseFloat(upscaleSlider.value) : 5,
      noiseLevel: isNoiseLocked ? parseFloat(noiseSlider.value) : 100,
      blurLevel: isBlurLocked ? parseFloat(blurSlider.value) : 0,
      bitDepth: isColorDepthLocked ? parseFloat(colorDepthSlider.value) : 24,
      quality: isQualityLocked ? parseFloat(qualitySlider.value) : 1,
    };

    // Calculate minimum and maximum file sizes
    const minFileSizeKB = getFileSize(minParams);
    const maxFileSizeKB = getFileSize(maxParams);

    // Update the file size range display
    const fileSizeRange = document.getElementById("file-size-range");
    fileSizeRange.textContent = `${minFileSizeKB.toFixed(
      2
    )} KB - ${maxFileSizeKB.toFixed(2)} KB`;

    // Update the input field's min and max attributes
    const fileSizeInput = document.getElementById("file-size");
    fileSizeInput.min = minFileSizeKB.toFixed(2);
    fileSizeInput.max = maxFileSizeKB.toFixed(2);
  }

  // Lock/Unlock Resolution
  document
    .getElementById("lock-resolution")
    .addEventListener("click", function () {
      isResolutionLocked = !isResolutionLocked; // Toggle lock state
      upscaleSlider.disabled = isResolutionLocked; // Update slider state
      this.textContent = isResolutionLocked ? "🔑" : "🔓";
      this.classList.toggle("locked", isResolutionLocked);
      recalculateFileSizeRange(); // Recalculate file size range if needed
    });

  // Lock/Unlock Noise
  document.getElementById("lock-noise").addEventListener("click", function () {
    isNoiseLocked = !isNoiseLocked; // Toggle lock state
    noiseSlider.disabled = isNoiseLocked; // Update slider state
    this.textContent = isNoiseLocked ? "🔑" : "🔓";
    this.classList.toggle("locked", isNoiseLocked);
    recalculateFileSizeRange(); // Recalculate file size range if needed
  });

  // Lock/Unlock Quality
  document
    .getElementById("lock-quality")
    .addEventListener("click", function () {
      isQualityLocked = !isQualityLocked; // Toggle lock state
      qualitySlider.disabled = isQualityLocked; // Update slider state
      this.textContent = isQualityLocked ? "🔑" : "🔓";
      this.classList.toggle("locked", isQualityLocked);
      recalculateFileSizeRange(); // Recalculate file size range if needed
    });

  // Lock/Unlock Blur
  document.getElementById("lock-blur").addEventListener("click", function () {
    isBlurLocked = !isBlurLocked; // Toggle lock state
    blurSlider.disabled = isBlurLocked; // Update slider state
    this.textContent = isBlurLocked ? "🔑" : "🔓";
    this.classList.toggle("locked", isBlurLocked);
    recalculateFileSizeRange(); // Recalculate file size range if needed
  });

  // Lock/Unlock Color Depth
  document
    .getElementById("lock-color-depth")
    .addEventListener("click", function () {
      isColorDepthLocked = !isColorDepthLocked; // Toggle lock state
      colorDepthSlider.disabled = isColorDepthLocked; // Update slider state
      this.textContent = isColorDepthLocked ? "🔑" : "🔓";
      this.classList.toggle("locked", isColorDepthLocked);
      recalculateFileSizeRange(); // Recalculate file size range if needed
    });
});