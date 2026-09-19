// assets/js/main.js
document.addEventListener("DOMContentLoaded", function () {
  // Contact Form Submission Handler
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const alertBox = document.getElementById("formAlert");
      if (alertBox) {
        alertBox.classList.remove("d-none");
        contactForm.reset();
      }
    });
  }
});