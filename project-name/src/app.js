export const pageContent = Object.freeze({
  title: "HTML project starter",
  message: "Your plain HTML, CSS, and JavaScript template is ready.",
});

export function renderTemplatePage(document) {
  const title = document.getElementById("page-title");
  const message = document.getElementById("page-message");

  if (!title || !message) {
    throw new Error("The starter page requires title and message elements.");
  }

  title.textContent = pageContent.title;
  message.textContent = pageContent.message;
}

if (typeof document !== "undefined") {
  renderTemplatePage(document);
}
