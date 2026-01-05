const TOAST_DURATION = 3000;
const TOAST_POSITION = 'top-end';
const CONFIRM_BUTTON_COLOR = '#82ae46';
const CANCEL_BUTTON_COLOR = '#d33';

window.Alerts = {
  toast: (message, icon = 'success') => {
    if (typeof Swal === 'undefined') {
      alert(message);
      return;
    }

    Swal.fire({
      toast: true,
      icon: icon,
      title: message,
      position: TOAST_POSITION,
      showConfirmButton: false,
      timer: TOAST_DURATION,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
  },

  confirm: async ({ title = 'Are you sure?', text = '', confirmButtonText = 'Yes' }) => {
    if (typeof Swal === 'undefined') {
      return { isConfirmed: confirm(title) };
    }

    return await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: CONFIRM_BUTTON_COLOR,
      cancelButtonColor: CANCEL_BUTTON_COLOR,
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Cancel'
    });
  },

  fire: (options) => {
    if (typeof Swal === 'undefined') {
      return Promise.reject(new Error('SweetAlert2 not loaded'));
    }
    return Swal.fire(options);
  },

  showValidationMessage: (message) => {
    if (typeof Swal === 'undefined') {
      alert(message);
      return;
    }
    Swal.showValidationMessage(message);
  },
};
