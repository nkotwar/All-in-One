document
  .getElementById("cbsSearchInput")
  .addEventListener("input", function () {
    const query = this.value.toLowerCase();
    const resultsContainer = document.getElementById("cbsResults");

    // Animate the transition for search results
    gsap.to(resultsContainer, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        resultsContainer.innerHTML = "";

        if (query.length === 0) {
          renderHierarchy(cbsData, resultsContainer, true);
        } else {
          const matches = searchHierarchy(cbsData, query);
          const combinedMatches = combineParallelHierarchies(matches); // Combine parallel hierarchies
          if (combinedMatches.length > 0) {
            renderHierarchy(combinedMatches, resultsContainer, false); // Render combined hierarchy
          } else {
            resultsContainer.textContent = "No results found.";
          }
        }

        // Fade in the new results
        gsap.to(resultsContainer, {
          opacity: 1,
          duration: 0.2,
        });
      },
    });
  });

function fuzzyMatch(text, query) {
  // Normalize the text and query by lowercasing and removing hyphens
  const normalize = (str) => str.toLowerCase().replace(/-/g, "");

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);

  // Split the normalized text into words
  const textWords = normalizedText.split(/\s+/);

  // Split the normalized query into words
  const queryWords = normalizedQuery.split(/\s+/);

  // Check if all query words exist in the text (as substrings or combined words)
  return queryWords.every((queryWord) => {
    // Check if the query word matches any single text word
    if (textWords.some((textWord) => textWord.includes(queryWord))) {
      return true;
    }

    // Check if the query word matches a combination of text words
    const combinedText = textWords.join("");
    return combinedText.includes(queryWord);
  });
}

function renderHierarchy(data, container, isCollapsed, isSearchResult = false) {
  container.innerHTML = "";

  data.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "cbs-item";

    // Check if this item has children in the original data (not just in current filtered view)
    const hasActualChildren = item.children && item.children.length > 0;

    if (hasActualChildren) {
      // Always show as collapsible if it's a parent in the original hierarchy
      const collapsible = document.createElement("button");
      collapsible.className = "cbs-collapsible";
      collapsible.textContent = item.name;

      // Highlight if this node itself is a search match
      if (
        isSearchResult &&
        (item._isMatch ||
          fuzzyMatch(item.name, query) ||
          (item.title && fuzzyMatch(item.title, query)))
      ) {
        collapsible.classList.add("cbs-match-highlight");
      }

      itemDiv.appendChild(collapsible);

      const content = document.createElement("div");
      content.className = "cbs-content";

      // Render children (pass along isSearchResult flag)
      renderHierarchy(item.children, content, isCollapsed, isSearchResult);
      itemDiv.appendChild(content);

      const toggleCollapse = () => {
        const isActive = collapsible.classList.toggle("active");
        if (isActive) {
          gsap.to(content, {
            height: "auto",
            duration: 0.3,
            ease: CustomEase.create("custom", "M0,0 C0.5,0 0.5,1 1,1"),
            onStart: () => (content.style.overflow = "hidden"),
            onComplete: () => (content.style.overflow = "visible"),
          });
        } else {
          gsap.to(content, {
            height: 0,
            duration: 0.3,
            ease: CustomEase.create("custom", "M0,0 C0.5,0 0.5,1 1,1"),
            onStart: () => (content.style.overflow = "hidden"),
          });
        }
      };

      collapsible.addEventListener("click", toggleCollapse);
      itemDiv.addEventListener("click", function (event) {
        if (event.target === itemDiv) {
          toggleCollapse();
        }
      });

      if (!isCollapsed) {
        collapsible.classList.add("active");
        content.style.height = "auto";
      } else {
        content.style.height = "0";
        content.style.overflow = "hidden";
      }
    } else {
      // This is an actual leaf node (no children in original data)
      const leafDiv = document.createElement("div");
      leafDiv.className = "cbs-leaf";

      const nameSpan = document.createElement("span");
      nameSpan.className = "cbs-leaf-name";
      nameSpan.textContent = item.name;
      leafDiv.appendChild(nameSpan);

      if (item.title) {
        const titleSpan = document.createElement("span");
        titleSpan.className = "cbs-leaf-title";
        titleSpan.textContent = ` (${item.title})`;
        leafDiv.appendChild(titleSpan);

        // Add copy button only if there's a title
        const copyBtn = document.createElement("button");
        copyBtn.className = "cbs-copy-btn";
        copyBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>';
        copyBtn.title = "Copy title code";
        leafDiv.appendChild(copyBtn);

        leafDiv.addEventListener("click", function (event) {
          // Only handle clicks on the leaf div itself, not the copy button
          if (event.target !== copyBtn && !copyBtn.contains(event.target)) {
            copyToClipboard(item.title.trim(), leafDiv);
          }
        });

        copyBtn.addEventListener("click", function (event) {
          event.stopPropagation();
          copyToClipboard(item.title.trim(), leafDiv);
        });
      }

      itemDiv.appendChild(leafDiv);
    }

    container.appendChild(itemDiv);
  });
}

// Add this helper function outside renderHierarchy
function copyToClipboard(text, leafElement) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      // Stronger visual feedback with color change and scale effect
      gsap.to(leafElement, {
        backgroundColor: "#e8f5e9",
        scale: 1.03,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
        onComplete: () => {
          gsap.to(leafElement, {
            backgroundColor: "transparent",
            scale: 1,
            duration: 0.2,
          });
        },
      });

      // Create and position feedback element
      const feedback = document.createElement("div");
      feedback.className = "cbs-copy-feedback";
      feedback.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg> <span>Copied: ${text}</span>`;

      document.body.appendChild(feedback);

      const leafRect = leafElement.getBoundingClientRect();
      const feedbackTop = leafRect.top - feedback.offsetHeight - 8;
      const leftPosition = Math.max(8, leafRect.left); // Ensure it doesn't go off screen

      feedback.style.position = "fixed";
      feedback.style.left = `${leftPosition}px`;
      feedback.style.top = `${feedbackTop}px`;

      gsap.fromTo(
        feedback,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          ease: "back.out(1.2)",
          onComplete: () => {
            setTimeout(() => {
              gsap.to(feedback, {
                opacity: 0,
                y: -10,
                duration: 0.25,
                ease: "back.in(1.2)",
                onComplete: () => feedback.remove(),
              });
            }, 1500);
          },
        }
      );
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
}

function searchHierarchy(data, query) {
  const results = [];
  const stack = [];

  function traverse(node) {
    stack.push(node);

    const nameMatch = fuzzyMatch(node.name, query);
    const titleMatch = node.title ? fuzzyMatch(node.title, query) : false;
    const isMatch = nameMatch || titleMatch;

    if (isMatch) {
      // Mark this node as a match
      const matchedNode = { ...node, _isMatch: true, path: stack.slice() };
      results.push(matchedNode);
    }

    if (node.children) {
      // Include all children in the path, but don't mark as matches unless they actually match
      node.children.forEach((child) => traverse(child));
    }
    stack.pop();
  }

  data.forEach((item) => traverse(item));
  return results;
}

// Modified combineParallelHierarchies to preserve full structure
function combineParallelHierarchies(matches) {
  const combinedTree = [];

  matches.forEach((match) => {
    let currentLevel = combinedTree;

    match.path.forEach((node, index) => {
      let existingNode = currentLevel.find((item) => item.name === node.name);

      if (!existingNode) {
        // Copy the node but preserve its original children structure
        existingNode = {
          ...node,
          children: [],
          // Preserve match status if this was a matched node
          _isMatch: node._isMatch || false,
        };
        currentLevel.push(existingNode);
      }

      currentLevel = existingNode.children;
    });
  });

  return combinedTree;
}

// Initial render
document.addEventListener("DOMContentLoaded", function () {
  const resultsContainer = document.getElementById("cbsResults");
  if (resultsContainer) {
    renderHierarchy(cbsData, resultsContainer, true);
  } else {
    console.error("Results container not found!");
  }
});