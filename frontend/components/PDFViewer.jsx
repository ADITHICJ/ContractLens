import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

// Configure local CDN worker to avoid Next.js bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function PDFViewer({ pdfUrl, onPageChange, importantClauses = [] }) {
  const containerRef = useRef(null);
  const renderTasksRef = useRef({});
  const pageRenderIdsRef = useRef({});
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renderedPages, setRenderedPages] = useState({});

  // Cancel all active render tasks on unmount
  useEffect(() => {
    return () => {
      Object.values(renderTasksRef.current).forEach((task) => {
        if (task && typeof task.cancel === "function") {
          try {
            task.cancel();
          } catch (err) { }
        }
      });
    };
  }, []);

  // Fetch document
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPdf(null);
    setNumPages(0);
    setRenderedPages({});

    const loadPdf = async () => {
      try {
        if (!pdfUrl) {
          throw new Error("Invalid PDF source URL.");
        }
        const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        const pdfDoc = await loadingTask.promise;
        if (!active) return;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err) {
        console.error("PDF loading error:", err);
        if (active) {
          setError("Failed to load PDF. Check backend server and CORS permissions.");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [pdfUrl]);

  // Render a specific page to its canvas
  const renderPage = useCallback(async (pageNum, canvas, importantClauses = []) => {
    if (!pdf || !canvas) return;

    // Increment render ID to invalidate any previous runs for this page
    const renderId = (pageRenderIdsRef.current[pageNum] || 0) + 1;
    pageRenderIdsRef.current[pageNum] = renderId;

    // Cancel existing render task for this page to prevent concurrent render conflicts
    if (renderTasksRef.current[pageNum]) {
      try {
        renderTasksRef.current[pageNum].cancel();
      } catch (err) {
        // Ignore cancellation errors
      }
      delete renderTasksRef.current[pageNum];
    }

    try {
      const page = await pdf.getPage(pageNum);
      // If a newer render trigger happened, abort
      if (pageRenderIdsRef.current[pageNum] !== renderId) return;

      // EXPLICIT ROTATION: use page.rotate to render rotated pages properly!
      const viewport = page.getViewport({ scale, rotation: page.rotate });
      const context = canvas.getContext("2d");

      // Reset any transformations to be safe
      context.setTransform(1, 0, 0, 1, 0, 0);

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Fill canvas with solid white background to support transparent PDF pages in dark mode
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTasksRef.current[pageNum] = renderTask;

      await renderTask.promise;
      // If a newer render trigger happened during rendering, abort
      if (pageRenderIdsRef.current[pageNum] !== renderId) return;

      // Draw text highlights directly on canvas
      try {
        const textContent = await page.getTextContent();
        if (pageRenderIdsRef.current[pageNum] !== renderId) return;

        const textItems = textContent.items.filter(item => item.str !== undefined);

        // Find clauses matching this page (or adjacent pages to support split quotes)
        const clausesForPage = importantClauses.filter((c) => {
          const mainPage = c.page;
          const isNearMain = mainPage === pageNum;
          const hasQuoteNear = c.highlighted_quotes && c.highlighted_quotes.some(q => (q.page || mainPage) === pageNum);
          return isNearMain || hasQuoteNear;
        });

        const quotes = [];
        clausesForPage.forEach((c) => {
          // Determine the highlight color based on risk level or conflicts
          let color = "rgba(245, 158, 11, 0.35)"; // Default Medium: Amber

          if (c.cross_clause_conflicts && c.cross_clause_conflicts.length > 0) {
            color = "rgba(99, 102, 241, 0.4)"; // Conflict: Indigo
          } else {
            const level = c.risk_level?.toUpperCase();
            if (level === "HIGH") {
              color = "rgba(239, 68, 68, 0.4)"; // High: Red
            } else if (level === "LOW") {
              color = "rgba(16, 185, 129, 0.4)"; // Low: Emerald
            } else if (level === "MEDIUM") {
              color = "rgba(245, 158, 11, 0.4)"; // Medium: Amber
            }
          }

          if (c.highlighted_quotes && c.highlighted_quotes.length > 0) {
            c.highlighted_quotes.forEach((q) => {
              const quotePage = q.page || c.page;
              if (q.quote && quotePage === pageNum) {
                quotes.push({ quote: q.quote, color });
              }
            });
          } else if (c.section_title && c.page === pageNum) {
            quotes.push({ quote: c.section_title, color });
          }
        });

        if (quotes.length > 0) {
          quotes.forEach(({ quote, color }) => {
            context.fillStyle = color;
            const rects = findHighlightRects(quote, textItems, viewport);
            rects.forEach((r) => {
              context.fillRect(r.x, r.y, r.w, r.h);
            });
          });
        }
      } catch (highlightErr) {
        console.error(`Failed to draw highlights on page ${pageNum}:`, highlightErr);
      }

      setRenderedPages((prev) => ({ ...prev, [pageNum]: true }));
    } catch (err) {
      if (err.name === "RenderingCancelledException" || err.message?.includes("cancelled")) {
        return; // Ignore expected cancellation exceptions
      }
      console.error(`Error rendering page ${pageNum}:`, err);
    } finally {
      if (renderTasksRef.current[pageNum]) {
        delete renderTasksRef.current[pageNum];
      }
    }
  }, [pdf, scale]);

  // Re-render all canvases when zoom scale or clauses change
  useEffect(() => {
    if (!pdf) return;
    // Reset rendering states
    setRenderedPages({});
  }, [scale, importantClauses.length]);

  // Trigger observer to track visible page while scrolling
  useEffect(() => {
    if (loading || numPages === 0) return;

    const observerOptions = {
      root: containerRef.current,
      rootMargin: "0px",
      threshold: 0.35, // 35% of page visible in viewport
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute("data-page"), 10);
          if (pageNum) {
            setCurrentPage(pageNum);
            onPageChange(pageNum);
          }
        }
      });
    }, observerOptions);

    // Observe each page container
    const pageElements = containerRef.current.querySelectorAll("[data-page]");
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      pageElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [loading, numPages, renderedPages]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const targetEl = containerRef.current.querySelector(`[data-page="${currentPage - 1}"]`);
      targetEl?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const targetEl = containerRef.current.querySelector(`[data-page="${currentPage + 1}"]`);
      targetEl?.scrollIntoView({ behavior: "smooth" });
    }
  };



  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm font-semibold">Loading contract PDF document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-red-400">
        <p className="text-sm font-semibold mb-2">{error}</p>
        <p className="text-xs text-slate-500 max-w-sm">
          Please verify your FastAPI server is running on port 8000 and that you uploaded a valid PDF document.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* PDF Controls Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-850 select-none">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-xs font-semibold text-slate-300">
            Page {currentPage} / {numPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2.0}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* PDF Pages Scrollable Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-slate-950 scroll-smooth"
      >
        {Array.from({ length: numPages }, (_, i) => (
          <PageWrapper
            key={i + 1}
            pageNumber={i + 1}
            pdf={pdf}
            scale={scale}
            renderPage={renderPage}
            numPages={numPages}
            importantClauses={importantClauses}
          />
        ))}
      </div>
    </div>
  );
}

// Render individual page components outside of parent to prevent remounting canvas nodes
const PageWrapper = ({ pageNumber, pdf, scale, renderPage, numPages, importantClauses }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && pdf) {
      renderPage(pageNumber, canvasRef.current, importantClauses);
    }
  }, [pdf, scale, pageNumber, renderPage, importantClauses]);

  return (
    <div
      data-page={pageNumber}
      className="flex flex-col items-center justify-center py-4 border-b border-slate-900 bg-slate-950"
    >
      <div className="relative shadow-lg border border-slate-800 bg-slate-900 rounded-md overflow-hidden">
        <canvas ref={canvasRef} key={`${pageNumber}-${scale}`} />
        <div className="absolute bottom-2 right-3 bg-slate-950/80 backdrop-blur border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-400 font-semibold select-none">
          Page {pageNumber} of {numPages}
        </div>
      </div>
    </div>
  );
};

const findHighlightRects = (
  quote,
  textItems,
  viewport
) => {
  if (!quote || !textItems?.length) {
    return [];
  }

  // ==========================================
  // Build page text
  // ==========================================

  let fullText = "";
  const charToItemMap = [];

  textItems.forEach((item, itemIdx) => {
    const str = item.str || "";

    for (let i = 0; i < str.length; i++) {
      fullText += str[i];
      charToItemMap.push(itemIdx);
    }

    fullText += " ";
    charToItemMap.push(itemIdx);
  });

  // ==========================================
  // Normalization
  // ==========================================

  const normalize = (text) =>
    text
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const normalizedPageText =
    normalize(fullText);

  const normalizedQuote =
    normalize(quote);

  if (!normalizedQuote) {
    return [];
  }

  // ==========================================
  // Use first 20 words only
  // ==========================================

  const words =
    normalizedQuote.split(" ");

  const searchText =
    words
      .slice(
        0,
        Math.min(words.length, 20)
      )
      .join(" ");

  const matchStart =
    normalizedPageText.indexOf(
      searchText
    );

  if (matchStart === -1) {
    console.warn(
      "Quote not found:",
      searchText
    );
    return [];
  }

  const matchEnd =
    matchStart + searchText.length;

  // ==========================================
  // Build normalized index map
  // IMPORTANT:
  // Must use SAME normalization logic
  // ==========================================

  const normalizedIndexMap = [];

  let normalizedBuilder = "";

  for (
    let i = 0;
    i < fullText.length;
    i++
  ) {
    let ch = fullText[i];

    // Remove punctuation
    if (/[^\w\s]/.test(ch)) {
      continue;
    }

    // Normalize spaces
    if (/\s/.test(ch)) {
      if (
        normalizedBuilder.length > 0 &&
        normalizedBuilder[
        normalizedBuilder.length - 1
        ] !== " "
      ) {
        normalizedBuilder += " ";
        normalizedIndexMap.push(i);
      }

      continue;
    }

    normalizedBuilder +=
      ch.toLowerCase();

    normalizedIndexMap.push(i);
  }

  const startOriginal =
    normalizedIndexMap[matchStart];

  const endOriginal =
    normalizedIndexMap[
    Math.min(
      matchEnd - 1,
      normalizedIndexMap.length - 1
    )
    ];

  if (
    startOriginal === undefined ||
    endOriginal === undefined
  ) {
    return [];
  }

  // ==========================================
  // Find matching text items
  // ==========================================

  const matchedItems =
    new Set();

  for (
    let i = startOriginal;
    i <= endOriginal;
    i++
  ) {
    const itemIdx =
      charToItemMap[i];

    if (itemIdx !== undefined) {
      matchedItems.add(itemIdx);
    }
  }

  // ==========================================
  // Build highlight rectangles
  // ==========================================

  const rects = [];

  matchedItems.forEach(
    (itemIdx) => {
      const item =
        textItems[itemIdx];

      if (
        !item ||
        !item.transform
      ) {
        return;
      }

      const x =
        item.transform[4];

      const y =
        item.transform[5];

      const width =
        item.width || 0;

      const height =
        item.height || 0;

      const rect = [
        x,
        y,
        x + width,
        y + height
      ];

      const [
        vx1,
        vy1,
        vx2,
        vy2
      ] =
        viewport.convertToViewportRectangle(
          rect
        );

      rects.push({
        x: Math.min(vx1, vx2),
        y:
          Math.min(vy1, vy2) - 2,
        w:
          Math.abs(vx2 - vx1) + 2,
        h:
          Math.abs(vy2 - vy1) + 4,
      });
    }
  );

  return rects;
};