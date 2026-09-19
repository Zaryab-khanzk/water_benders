// assets/js/includes.js
document.addEventListener("DOMContentLoaded", function () {
  const loadInclude = (selector, file, callback) => {
    const element = document.querySelector(selector);
    if (!element) return;
    fetch(file)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to fetch ${file}`);
        return response.text();
      })
      .then((data) => {
        element.innerHTML = data;
        if (callback) callback();
      })
      .catch((err) => console.error(err));
  };

  // Load Header
  loadInclude("#header-placeholder", "includes/header.html", () => {
    // Highlight Active Page Link
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const links = document.querySelectorAll("#header-placeholder .nav-link");
    links.forEach((link) => {
      if (link.getAttribute("data-page") === currentPage) {
        link.classList.add("active");
      }
    });
  });

  // Load Footer
  loadInclude("#footer-placeholder", "includes/footer.html", () => {
    const yearElem = document.getElementById("currentYear");
    if (yearElem) yearElem.textContent = new Date().getFullYear();
  });
});