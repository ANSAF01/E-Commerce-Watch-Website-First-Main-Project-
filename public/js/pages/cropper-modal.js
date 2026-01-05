(function () {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const IMAGE_COUNT = 3;
  let cropper = null;
  window.imageFiles = {};
  let currentModalInstance = null;
  let EXISTING_IMAGES = [];
  let currentImageFile = null;
  let currentImageIndex = null;
  let initialCropBoxData = null;
  let cropBoxModified = false;

  function initializeExistingImages() {
    const existingImagesEl = document.getElementById('existingImages');
    if (existingImagesEl) {
      try {
        EXISTING_IMAGES = JSON.parse(existingImagesEl.textContent) || [];
      } catch (e) {
        EXISTING_IMAGES = [];
      }
    }
  }

  function displayExistingImage(index, imageSrc) {
    const box = document.querySelector(`[data-image-index="${index}"]`);
    if (!box) return;

    const placeholder = box.querySelector('.image-placeholder');
    const preview = box.querySelector('.image-preview');
    const removeBtn = box.querySelector('.remove-image');

    if (placeholder) placeholder.style.display = 'none';
    if (preview) {
      preview.src = imageSrc;
      preview.style.display = 'block';
    }
    if (removeBtn) removeBtn.style.display = 'block';
    box.style.background = 'transparent';
    box.style.borderColor = '#dee2e6';
  }

  function validateImageFile(file, errorMsg) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      if (errorMsg) {
        errorMsg.textContent = 'Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF)';
        errorMsg.style.display = 'block';
      }
      if (window.Alerts && typeof Alerts.toast === 'function') {
        Alerts.toast('Please select an image file (JPEG, PNG, WebP, GIF)', 'error');
      }
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      if (errorMsg) {
        errorMsg.textContent = 'File size exceeds 5MB limit';
        errorMsg.style.display = 'block';
      }
      return false;
    }

    return true;
  }

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const index = e.target.dataset.index;
    const box = document.querySelector(`[data-image-index="${index}"]`);

    if (!box) {
      return;
    }

    const errorMsg = box.querySelector('.error-message');

    if (!validateImageFile(file, errorMsg)) {
      e.target.value = '';
      return;
    }

    if (errorMsg) {
      errorMsg.style.display = 'none';
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      showCropperModal(event.target.result, file, index);
    };
    reader.readAsDataURL(file);
  }

  function initializeCropper(cropperImg) {
    if (cropper) {
      cropper.destroy();
    }

    cropBoxModified = false;

    cropper = new Cropper(cropperImg, {
      viewMode: 1,
      autoCrop: true,
      autoCropArea: 1,
      responsive: true,
      guides: true,
      center: true,
      highlight: true,
      background: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: true,
      ready() {
        initialCropBoxData = JSON.stringify(cropper.getCropBoxData());
        window.dispatchEvent(new Event('resize'));
      },
      crop() {
        if (!initialCropBoxData) return;
        const currentCropBoxData = JSON.stringify(cropper.getCropBoxData());
        cropBoxModified = currentCropBoxData !== initialCropBoxData;
      }
    });
  }

  function showCropperModal(imageSrc, file, index) {
    const modalEl = document.getElementById('cropperModal');
    if (!modalEl) return;

    const cropperImg = document.getElementById('cropperImage');
    cropperImg.src = imageSrc;

    currentImageFile = file;
    currentImageIndex = index;

    if (currentModalInstance) {
      currentModalInstance.hide();
    }

    currentModalInstance = new bootstrap.Modal(modalEl, {
      backdrop: 'static',
      keyboard: false
    });

    const onShown = () => {
      initializeCropper(cropperImg);
      modalEl.removeEventListener('shown.bs.modal', onShown);
    };

    const onHidden = () => {
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      cropperImg.removeAttribute('src');
      currentImageFile = null;
      currentImageIndex = null;
      initialCropBoxData = null;
      cropBoxModified = false;
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };

    const handleCrop = () => {
      if (!cropper || !currentImageFile) return;

      if (cropBoxModified) {
        const canvas = cropper.getCroppedCanvas();
        canvas.toBlob(function (blob) {
          const croppedFile = new File([blob], currentImageFile.name, { type: 'image/jpeg' });
          window.imageFiles[currentImageIndex] = croppedFile;
          displayImage(currentImageIndex, canvas.toDataURL());
          currentModalInstance.hide();
        }, 'image/jpeg', 0.9);
      } else {
        window.imageFiles[currentImageIndex] = currentImageFile;
        const reader = new FileReader();
        reader.onload = function (e) {
          displayImage(currentImageIndex, e.target.result);
          currentModalInstance.hide();
        };
        reader.readAsDataURL(currentImageFile);
      }
    };

    const cropButton = document.getElementById('cropButton');
    cropButton.onclick = handleCrop;

    modalEl.addEventListener('shown.bs.modal', onShown);
    modalEl.addEventListener('hidden.bs.modal', onHidden);

    currentModalInstance.show();
  }

  function displayImage(index, imageSrc) {
    const box = document.querySelector(`[data-image-index="${index}"]`);
    if (!box) return;

    const placeholder = box.querySelector('.image-placeholder');
    const preview = box.querySelector('.image-preview');
    const removeBtn = box.querySelector('.remove-image');

    if (placeholder) placeholder.style.display = 'none';
    if (preview) {
      preview.src = imageSrc;
      preview.style.display = 'block';
    }
    if (removeBtn) removeBtn.style.display = 'block';
    box.style.background = 'transparent';
    box.style.borderColor = '#dee2e6';
  }

  function removeImage(box) {
    const index = box.dataset.imageIndex;
    const input = box.querySelector('.image-input');
    const placeholder = box.querySelector('.image-placeholder');
    const preview = box.querySelector('.image-preview');
    const removeBtn = box.querySelector('.remove-image');

    delete window.imageFiles[index];
    if (input) input.value = '';
    if (placeholder) placeholder.style.display = 'flex';
    if (preview) preview.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'none';
    box.style.background = '#f8f9fa';
    box.style.borderColor = '#dee2e6';
  }

  function setupImageBoxes() {
    const imageBoxes = document.querySelectorAll('.image-box');

    imageBoxes.forEach((box, idx) => {
      if (EXISTING_IMAGES[idx]) {
        displayExistingImage(idx, EXISTING_IMAGES[idx]);
      }

      box.addEventListener('click', function () {
        const input = this.querySelector('.image-input');
        if (input) input.click();
      });

      const input = box.querySelector('.image-input');
      if (input) {
        input.addEventListener('change', handleImageSelect);
      }

      const removeBtn = box.querySelector('.remove-image');
      if (removeBtn) {
        removeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          removeImage(box);
        });
      }
    });
  }

  function setupFormSubmission() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      const uploadedCount = Object.keys(window.imageFiles).length;
      const validationErrorEl = document.getElementById('imagesValidationError');

      if (uploadedCount === 0 && EXISTING_IMAGES.length === 0) {
        e.preventDefault();
        if (validationErrorEl) {
          validationErrorEl.textContent = `Please upload all ${IMAGE_COUNT} images`;
          validationErrorEl.style.display = 'block';
        }
        return;
      }

      if (validationErrorEl) {
        validationErrorEl.style.display = 'none';
        validationErrorEl.textContent = '';
      }
    });
  }

  function initialize() {
    initializeExistingImages();
    setupImageBoxes();
    setupFormSubmission();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
