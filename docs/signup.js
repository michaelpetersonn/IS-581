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
