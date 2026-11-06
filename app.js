document.addEventListener("DOMContentLoaded", async () => {
  const initializeTftCursor = () => {
    const cursor = document.querySelector("#tft-mouse-cursor");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!cursor || !finePointer.matches || reducedMotion.matches) return;

    const root = document.documentElement;
    const textEntrySelector = 'textarea, [contenteditable="true"], input:not([type="button"]):not([type="checkbox"]):not([type="color"]):not([type="file"]):not([type="hidden"]):not([type="image"]):not([type="radio"]):not([type="range"]):not([type="reset"]):not([type="submit"])';
    const interactiveSelector = 'a[href], button:not(:disabled), select:not(:disabled), [role="button"], [role="link"], summary';

    const hideCursor = () => {
      root.classList.remove("tft-cursor-active");
      cursor.classList.remove("is-visible", "is-interactive", "is-pressed");
    };

    document.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      if (!finePointer.matches || reducedMotion.matches) {
        hideCursor();
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(textEntrySelector)) {
        hideCursor();
        return;
      }

      root.classList.add("tft-cursor-active");
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor.classList.toggle("is-interactive", Boolean(target?.closest(interactiveSelector)));
      cursor.classList.add("is-visible");
    }, { passive: true });

    document.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && cursor.classList.contains("is-visible")) {
        cursor.classList.add("is-pressed");
      }
    }, true);
    document.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"), true);
    document.addEventListener("pointerout", (event) => {
      if (event.pointerType === "mouse" && event.relatedTarget === null) hideCursor();
    });
    window.addEventListener("blur", hideCursor);

    const updateMotionSupport = () => {
      if (!finePointer.matches || reducedMotion.matches) hideCursor();
    };
    [finePointer, reducedMotion].forEach((query) => {
      if (typeof query.addEventListener === "function") query.addEventListener("change", updateMotionSupport);
      else if (typeof query.addListener === "function") query.addListener(updateMotionSupport);
    });
  };

  initializeTftCursor();

  const tftCursorOverlay = document.querySelector("#tft-mouse-cursor");
  const dialog = document.querySelector("#product-dialog");
  const title = document.querySelector("#product-detail-title");
  const description = document.querySelector("#product-detail-description");
  const image = document.querySelector("#product-detail-image");
  const photoFrame = image?.closest(".product-dialog-photo");
  const closeButton = document.querySelector("#product-dialog-close");
  const inquiryLink = document.querySelector("#product-inquiry-link");
  const inquirySelect = document.querySelector('select[name="product"]');
  const prefetchedImages = new Set();
  const warmingImages = new Map();
  let activeImageUrl = "";
  let lastTrigger = null;
  const inquiryForm = document.querySelector(".inquiry-form");
  const formStatus = document.querySelector("#form-status");
  const submitButton = inquiryForm?.querySelector('button[type="submit"]');
  const defaultFormStatus = formStatus?.textContent.trim() || "";

  const setFormStatus = (state, message) => {
    if (!formStatus) return;
    formStatus.dataset.state = state;
    formStatus.textContent = message;
  };

  if (inquiryForm && formStatus && submitButton) {
    inquiryForm.addEventListener("input", () => {
      if (["success", "error"].includes(formStatus.dataset.state)) {
        setFormStatus("idle", defaultFormStatus);
      }
    });

    inquiryForm.addEventListener("submit", async (event) => {
      const endpoint = inquiryForm.dataset.ajaxEndpoint;
      if (!endpoint) return;
      event.preventDefault();
      if (!inquiryForm.reportValidity() || submitButton.disabled) return;

      const payload = Object.fromEntries(new FormData(inquiryForm).entries());
      payload._url = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
      const requestBody = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => requestBody.set(key, value));
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = "Sending…";
      inquiryForm.setAttribute("aria-busy", "true");
      setFormStatus("sending", "Sending your inquiry…");

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: requestBody
        });
        let result;
        try {
          result = await response.json();
        } catch {
          throw new Error("FormSubmit did not return a readable confirmation.");
        }

        const serviceMessage = typeof result?.message === "string" ? result.message : "";
        const activationPending = /\b(?:activat(?:e|ed|ion|ing)|confirm(?:ation|ed)?|verif(?:y|ication))\b/i.test(serviceMessage);
        if (activationPending) {
          setFormStatus("pending", "FormSubmit reports that the mailbox must be activated before email delivery. Check info@txfoodtrade.com for its activation email.");
          return;
        }

        const confirmed = result?.success === true || result?.success === "true" || result?.success === "success";
        if (!response.ok || !confirmed) throw new Error(serviceMessage || "FormSubmit did not confirm delivery.");

        setFormStatus("success", "Your inquiry was sent successfully. Thank you for contacting Texas Food Trading.");
        inquiryForm.reset();
      } catch (error) {
        console.error("Inquiry form submission was not confirmed.", error);
        setFormStatus("error", "We could not confirm delivery. To avoid a duplicate, contact sales@txfoodtrade.com before resubmitting.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
        inquiryForm.removeAttribute("aria-busy");
      }
    });
  }

  const initializeHeroCarousel = () => {
    const carousel = document.querySelector("#hero-carousel");
    const track = carousel?.querySelector(".hero-carousel-track");
    const slides = Array.from(carousel?.querySelectorAll(".hero-carousel-slide") || []);
    if (!carousel || !track || slides.length < 2) return;

    const previousButton = carousel.querySelector(".hero-carousel-previous");
    const nextButton = carousel.querySelector(".hero-carousel-next");
    const pauseButton = carousel.querySelector(".hero-carousel-pause");
    const dots = Array.from(carousel.querySelectorAll(".hero-carousel-dot"));
    const status = carousel.querySelector(".hero-carousel-status");
    if (!previousButton || !nextButton || !pauseButton || dots.length !== slides.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentIndex = 0;
    let direction = 1;
    let userPaused = false;
    let userRequestedPlay = false;
    let hoveredByMouse = false;
    let focusWithin = false;
    let intervalId = 0;

    const updateSlide = (index, announce = false) => {
      currentIndex = index;
      track.style.setProperty("--slide-offset", `${-currentIndex * 100}%`);

      slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === currentIndex;
        slide.setAttribute("aria-hidden", String(!isActive));
        slide.classList.toggle("is-active", isActive);
      });

      previousButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === slides.length - 1;
      dots.forEach((dot, dotIndex) => {
        const isCurrent = dotIndex === currentIndex;
        dot.setAttribute("aria-current", String(isCurrent));
        dot.setAttribute("aria-pressed", String(isCurrent));
      });

      if (announce && status) status.textContent = `Image ${currentIndex + 1} of ${slides.length}`;
    };

    const advanceAutomatically = () => {
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= slides.length) {
        direction *= -1;
        nextIndex = currentIndex + direction;
      }
      updateSlide(nextIndex);
    };

    const refreshRotation = () => {
      window.clearInterval(intervalId);
      intervalId = 0;
      pauseButton.hidden = reducedMotion.matches;
      pauseButton.setAttribute("aria-label", userPaused ? "Resume automatic image changes" : "Pause automatic image changes");
      const pauseIcon = pauseButton.querySelector(".hero-carousel-pause-icon");
      if (pauseIcon) pauseIcon.textContent = userPaused ? "▶" : "Ⅱ";

      const canRotate = !userPaused && !document.hidden && !reducedMotion.matches
        && (!hoveredByMouse || userRequestedPlay)
        && (!focusWithin || userRequestedPlay);
      if (canRotate) intervalId = window.setInterval(advanceAutomatically, 2000);
    };

    const moveBy = (delta) => {
      const nextIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + delta));
      if (nextIndex === currentIndex) return;
      direction = Math.sign(delta);
      updateSlide(nextIndex, true);
      refreshRotation();
    };

    previousButton.addEventListener("click", () => moveBy(-1));
    nextButton.addEventListener("click", () => moveBy(1));
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        if (index === currentIndex) return;
        direction = Math.sign(index - currentIndex);
        updateSlide(index, true);
        refreshRotation();
      });
    });

    pauseButton.addEventListener("click", () => {
      userPaused = !userPaused;
      userRequestedPlay = !userPaused;
      refreshRotation();
    });

    carousel.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") {
        hoveredByMouse = true;
        refreshRotation();
      }
    });
    carousel.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") {
        hoveredByMouse = false;
        userRequestedPlay = false;
        refreshRotation();
      }
    });
    carousel.addEventListener("focusin", () => {
      focusWithin = true;
      refreshRotation();
    });
    carousel.addEventListener("focusout", (event) => {
      if (!carousel.contains(event.relatedTarget)) {
        focusWithin = false;
        userRequestedPlay = false;
        refreshRotation();
      }
    });
    carousel.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBy(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveBy(1);
      }
    });
    document.addEventListener("visibilitychange", refreshRotation);
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", refreshRotation);
    } else if (typeof reducedMotion.addListener === "function") {
      reducedMotion.addListener(refreshRotation);
    }

    updateSlide(0);
    refreshRotation();
  };

  initializeHeroCarousel();

  if (!dialog || !title || !description || !image || !photoFrame || !closeButton) return;

  const setImageState = (state) => {
    photoFrame.dataset.imageState = state;
    photoFrame.setAttribute("aria-busy", state === "loading" ? "true" : "false");
    image.classList.toggle("image-unavailable", state === "error");
  };

  const absoluteUrl = (url) => new URL(url, document.baseURI).href;

  const prefetchImage = (url) => {
    if (!url || prefetchedImages.has(url) || warmingImages.has(url)) return;

    const preloader = new Image();
    preloader.decoding = "async";
    if ("fetchPriority" in preloader) preloader.fetchPriority = "high";
    warmingImages.set(url, preloader);
    preloader.addEventListener("load", () => {
      prefetchedImages.add(url);
      warmingImages.delete(url);
    }, { once: true });
    preloader.addEventListener("error", () => warmingImages.delete(url), { once: true });
    preloader.src = url;
  };

  let products;
  try {
    const response = await fetch("./products.json");
    if (!response.ok) throw new Error(`Product data request failed: ${response.status}`);
    products = await response.json();
  } catch (error) {
    console.error("Product details could not be loaded.", error);
    return;
  }

  const productsByName = new Map(products.map((product) => [product.name, product]));

  const openProduct = (product, trigger) => {
    lastTrigger = trigger;
    title.textContent = product.name;
    description.textContent = product.description;
    image.alt = `Photo of ${product.name}`;
    image.decoding = "async";
    image.loading = "eager";
    if ("fetchPriority" in image) image.fetchPriority = "high";

    activeImageUrl = absoluteUrl(product.image);
    const currentImageUrl = image.getAttribute("src") ? absoluteUrl(image.getAttribute("src")) : "";
    const sameImageIsReady = currentImageUrl === activeImageUrl && image.complete && image.naturalWidth > 0;

    if (sameImageIsReady) {
      setImageState("loaded");
    } else {
      setImageState("loading");
      image.src = product.image;
      if (image.complete) setImageState(image.naturalWidth > 0 ? "loaded" : "error");
    }

    if (inquirySelect) inquirySelect.value = product.name;
    dialog.showModal();
    if (tftCursorOverlay) dialog.append(tftCursorOverlay);
    closeButton.focus();
  };

  document.querySelectorAll(".product-list li").forEach((item) => {
    const name = item.textContent.trim();
    const product = productsByName.get(name);
    if (!product) return;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "product-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-label", `View details and image for ${product.name}`);

    const productName = document.createElement("span");
    productName.className = "product-trigger-name";
    productName.textContent = product.name;

    const viewLabel = document.createElement("span");
    viewLabel.className = "product-trigger-action";
    viewLabel.innerHTML = 'View details <span aria-hidden="true">↗</span>';

    const warmProductImage = () => {
      if (product.preload !== false) prefetchImage(product.image);
    };
    trigger.addEventListener("pointerenter", warmProductImage);
    trigger.addEventListener("focus", warmProductImage);

    trigger.append(productName, viewLabel);
    trigger.addEventListener("click", () => openProduct(product, trigger));

    item.replaceChildren(trigger);
  });

  document.querySelectorAll(".featured-product-link[data-product-name]").forEach((trigger) => {
    const product = productsByName.get(trigger.dataset.productName);
    if (!product) {
      trigger.disabled = true;
      return;
    }

    const warmFeaturedImage = () => {
      if (product.preload !== false) prefetchImage(product.image);
    };
    trigger.addEventListener("pointerenter", warmFeaturedImage);
    trigger.addEventListener("focus", warmFeaturedImage);
    trigger.addEventListener("click", () => openProduct(product, trigger));
  });

  image.addEventListener("load", () => {
    const loadedUrl = image.currentSrc || image.src;
    if (loadedUrl === activeImageUrl) {
      setImageState(image.naturalWidth > 0 ? "loaded" : "error");
    }
  });

  image.addEventListener("error", () => {
    const failedUrl = image.currentSrc || image.src;
    if (failedUrl === activeImageUrl) setImageState("error");
  });

  closeButton.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    if (tftCursorOverlay) document.body.append(tftCursorOverlay);
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });

  if (inquiryLink) {
    inquiryLink.addEventListener("click", () => {
      dialog.close();
      window.setTimeout(() => {
        document.querySelector("#inquiry")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    });
  }
});
