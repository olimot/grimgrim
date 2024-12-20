import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";

// Then register the languages you need
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);

document.querySelectorAll("pre code[data-source-id='1']").forEach((it) => {
  const content = `<div class="grimgrim">
  <style>
  .grimgrim {
    display: grid;
    grid-template-columns: 1fr 320px;
    grid-template-rows: 1fr;
    width: 100%;
    height: 360px;
    outline: 1px solid #e0e0e0;
    font-size: 12px;
  }

  .grimgrim canvas {
    image-rendering: crisp-edges; /* for firefox */
    image-rendering: pixelated; /* for everything else */
  }

  .grimgrim-sidebar {
    display: flex;
    flex-direction: column;
    border-left: 1px solid #e0e0e0;
  }

  .grimgrim-layer-list {
    display: block;
    height: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .grimgrim-layer-list__item {
    display: flex;
    align-items: center;
    background-color: #f0f0f0;
    height: 48px;
    margin: 1px;
  }

  .grimgrim-layer-list__thumbnail {
    width: 40px;
    height: 40px;
    border: 1px solid #e0e0e0;
    margin: 3px;
  }

  .grimgrim-layer-list__name {
    flex: 1 1;
  }
  </style>
  <canvas class="grimgrim-screen" width="1280" height="720"></canvas>
  <div class="grimgrim-sidebar">
    <ul class="grimgrim-layer-list">
      <li class="grimgrim-layer-list__item">
        <canvas class="grimgrim-layer-list__thumbnail"></canvas>
        <span class="grimgrim-layer-list__name">Layer 1</span>
      </li>
      <li class="grimgrim-layer-list__item">
        <canvas class="grimgrim-layer-list__thumbnail"></canvas>
        <span class="grimgrim-layer-list__name">Layer 0</span>
      </li>
    </ul>
  </div>
</div>`;
  it.innerHTML = hljs.highlight(content, { language: "html" }).value;
});
