document.addEventListener("DOMContentLoaded", async () => {
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
    trigger.addEventListener("click", () => {
      lastTrigger = trigger;
      title.textContent = product.name;
      description.textContent = product.description;
      image.alt = `Illustrative product image: ${product.name}`;
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
      closeButton.focus();
    });

    item.replaceChildren(trigger);
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
