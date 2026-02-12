/**
 * B2B Product Customizer — Client-side JavaScript
 *
 * Handles file upload through Shopify App Proxy to avoid CORS issues.
 * The flow:
 * 1. Customer selects a file
 * 2. JS requests a presigned S3 URL from our API (via Shopify App Proxy)
 * 3. File is uploaded directly to S3
 * 4. The S3 URL replaces the file input value in a hidden field
 * 5. When added to cart, the URL becomes a line item property
 * 6. The ORDERS_CREATE webhook captures this URL for manufacturing
 */
(function () {
  'use strict';

  const APP_PROXY_PATH = '/apps/b2b-upload';
  const customizer = document.getElementById('b2b-product-customizer');
  if (!customizer) return;

  // Handle file inputs
  const fileInputs = customizer.querySelectorAll('.b2b-customizer__file-input');

  fileInputs.forEach(function (input, index) {
    input.addEventListener('change', async function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const fieldName = input.getAttribute('data-field-name');
      const statusEl = document.getElementById('b2b-status-' + (index + 1));
      const previewEl = document.getElementById('b2b-preview-' + (index + 1));
      const hiddenInput = document.getElementById('b2b-field-' + (index + 1) + '-value');

      // Show uploading status
      if (statusEl) statusEl.textContent = 'Uploading...';

      try {
        // 1. Get presigned URL from API via App Proxy
        const presignResponse = await fetch(APP_PROXY_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });

        if (!presignResponse.ok) throw new Error('Failed to get upload URL');
        var presignData = await presignResponse.json();

        // 2. Upload file directly to S3
        const uploadResponse = await fetch(presignData.data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadResponse.ok) throw new Error('Upload failed');

        // 3. Set the file URL as the hidden input value (becomes line item property)
        if (hiddenInput) {
          hiddenInput.value = presignData.data.fileUrl;
        }

        // 4. Show preview
        if (previewEl && file.type.startsWith('image/')) {
          var img = previewEl.querySelector('.b2b-customizer__preview-img');
          var filenameEl = previewEl.querySelector('.b2b-customizer__filename');
          if (img) img.src = URL.createObjectURL(file);
          if (filenameEl) filenameEl.textContent = file.name;
          previewEl.style.display = 'block';
        }

        if (statusEl) statusEl.textContent = 'Uploaded successfully';
      } catch (err) {
        console.error('Upload error:', err);
        if (statusEl) statusEl.textContent = 'Upload failed. Please try again.';
        if (hiddenInput) hiddenInput.value = '';
      }
    });
  });

  // Handle text input character counting
  var textInputs = customizer.querySelectorAll('.b2b-customizer__text-input');
  textInputs.forEach(function (input) {
    var maxLength = input.getAttribute('maxlength');
    if (!maxLength) return;

    var counter = input.parentElement.querySelector('.b2b-customizer__char-count');
    if (!counter) return;

    input.addEventListener('input', function () {
      counter.textContent = input.value.length + '/' + maxLength;
    });
  });

  // Validate required fields before add-to-cart
  var productForm = customizer.closest('form[action*="/cart/add"]');
  if (productForm) {
    productForm.addEventListener('submit', function (e) {
      var requiredFields = customizer.querySelectorAll('[data-required="true"]');
      var valid = true;

      requiredFields.forEach(function (fieldContainer) {
        var type = fieldContainer.getAttribute('data-field-type');
        var input;

        if (type === 'file') {
          input = fieldContainer.querySelector('.b2b-customizer__hidden-value');
          if (!input || !input.value) {
            valid = false;
            fieldContainer.style.borderLeft = '3px solid #e53e3e';
          } else {
            fieldContainer.style.borderLeft = '';
          }
        } else if (type === 'text') {
          input = fieldContainer.querySelector('.b2b-customizer__text-input');
          if (!input || !input.value.trim()) {
            valid = false;
            fieldContainer.style.borderLeft = '3px solid #e53e3e';
          } else {
            fieldContainer.style.borderLeft = '';
          }
        }
      });

      if (!valid) {
        e.preventDefault();
        alert('Please fill in all required customization fields.');
      }
    });
  }
})();
