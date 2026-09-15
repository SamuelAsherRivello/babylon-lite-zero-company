const contentLayer = document.getElementById("content_layer");

contentLayer.innerHTML = `
  <section class="template-card" aria-labelledby="template-title">
    <p class="template-kicker">Vite starter</p>
    <h1 id="template-title">GitHub Repository Template</h1>
    <p>Ready for your next project.</p>
  </section>
`;

const style = document.createElement("style");
style.textContent = `
  #content_layer {
    display: grid;
    min-height: 100%;
    place-items: center;
    background: #111827;
    color: #f8fafc;
    font-family: system-ui, sans-serif;
  }

  .template-card {
    width: min(520px, calc(100% - 48px));
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 32px;
    background: #0f172a;
    box-shadow: 0 24px 80px rgba(2, 6, 23, 0.35);
  }

  .template-kicker {
    margin: 0 0 12px;
    color: #38bdf8;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: 2rem;
    line-height: 1.15;
  }

  .template-card p:last-child {
    margin: 16px 0 0;
    color: #cbd5e1;
    font-size: 1rem;
    line-height: 1.6;
  }
`;
document.head.append(style);
