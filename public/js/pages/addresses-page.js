(function () {
  const { api } = window.UserCommon || {};

  function handleAddressForm() {
    const form = document.getElementById('addressForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      document.querySelectorAll('#addressForm .text-danger').forEach(el => {
        el.textContent = '';
        el.classList.add('d-none');
      });

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const result = await UserCommon.api('POST', '/user/addresses/add', data);

        if (result.success) {
          Alerts.toast(result.message || 'Address added successfully!', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (result.errors) {
            Object.keys(result.errors).forEach(field => {
              const errorElement = document.getElementById(`error-${field}`);
              if (errorElement) {
                errorElement.textContent = result.errors[field].msg || result.errors[field];
                errorElement.classList.remove('d-none');
              }
            });
          } else {
            Alerts.toast(result.message || 'Failed to add address', 'error');
          }
        }
      } catch (error) {
        if (error.payload && error.payload.errors) {
          const errors = error.payload.errors;
          Object.keys(errors).forEach(field => {
            const errorElement = document.getElementById(`error-${field}`);
            if (errorElement) {
              errorElement.textContent = errors[field].msg || errors[field];
              errorElement.classList.remove('d-none');
            }
          });
        } else {
          Alerts.toast(error.message || 'Failed to add address', 'error');
        }
      }
    });
  }

  function handleEditAddressForm() {
    const editForm = document.getElementById('editAddressForm');
    if (!editForm) return;

    editForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      document.querySelectorAll('#editAddressForm .text-danger').forEach(el => el.textContent = '');

      const formData = new FormData(editForm);
      const data = Object.fromEntries(formData.entries());
      const addressId = data.id;

      try {
        const result = await UserCommon.api('PATCH', `/user/addresses/edit/${addressId}`, data);

        if (result.success) {
          const modalElement = document.getElementById('editAddressModal');
          const modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();

          Alerts.toast(result.message || 'Address updated successfully!', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          if (result.errors) {
            Object.keys(result.errors).forEach(field => {
              const errorElement = document.getElementById(`edit-error-${field}`);
              if (errorElement) {
                errorElement.textContent = result.errors[field].msg || result.errors[field];
              }
            });
          } else {
            Alerts.toast(result.message || 'Failed to update address', 'error');
          }
        }
      } catch (error) {
        if (error.payload && error.payload.errors) {
          const errors = error.payload.errors;
          Object.keys(errors).forEach(field => {
            const errorElement = document.getElementById(`edit-error-${field}`);
            if (errorElement) {
              errorElement.textContent = errors[field].msg || errors[field];
            }
          });
        } else {
          Alerts.toast(error.message || 'Failed to update address', 'error');
        }
      }
    });
  }

  window.openEdit = function (id, address, district, city, state, pincode, landmark, type) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-address').value = address;
    document.getElementById('edit-district').value = district;
    document.getElementById('edit-city').value = city;
    document.getElementById('edit-state').value = state;
    document.getElementById('edit-pincode').value = pincode;
    document.getElementById('edit-landmark').value = landmark || '';
    document.getElementById('edit-type').value = type || 'home';

    const modalElement = document.getElementById('editAddressModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  };

  window.confirmDelete = async function (id) {
    const result = await Swal.fire({
      title: 'Delete Address?',
      text: 'Are you sure you want to delete this address?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const data = await UserCommon.api('DELETE', `/user/addresses/delete/${id}`);
        if (data.success) {
          Alerts.toast(data.message || 'Address deleted successfully!', 'success');
          setTimeout(() => window.location.reload(), 500);
        } else {
          Alerts.toast(data.message || 'Failed to delete address', 'error');
        }
      } catch (error) {
        Alerts.toast(error.message || 'Failed to delete address', 'error');
      }
    }
  };

  function handleAddressActions() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('.js-edit-address')) {
        const btn = e.target.closest('.js-edit-address');
        const ds = btn.dataset;
        window.openEdit(ds.id, ds.address, ds.district, ds.city, ds.state, ds.pincode, ds.landmark, ds.type);
      }
      if (e.target.closest('.js-delete-address')) {
        const btn = e.target.closest('.js-delete-address');
        window.confirmDelete(btn.dataset.id);
      }
    });
  }

  function init() {
    handleAddressForm();
    handleEditAddressForm();
    handleAddressActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
