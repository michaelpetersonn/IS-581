(function () {
  var form = document.getElementById("signup-form");
  var status = document.getElementById("form-status");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    event.stopPropagation();

    var button = form.querySelector("[type='submit']");
    var endpoint = form.getAttribute("data-endpoint");
    if (button) button.disabled = true;
    if (status) status.textContent = "Joining…";

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        window.location.replace("thank-you.html");
        return response;
      })
      .catch(function () {
        window.location.replace("thank-you.html");
      });
  });
})();

(function () {
  var scroller = document.querySelector(".page-scroll");
  if (!scroller) return;

  function scrollToHash(hash) {
    if (!hash || hash === "#") return;
    var target = document.querySelector(hash);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute("href");
    if (!hash || hash === "#") return;
    if (!document.querySelector(hash)) return;
    event.preventDefault();
    history.pushState(null, "", hash);
    scrollToHash(hash);
  });

  scrollToHash(location.hash);
})();
