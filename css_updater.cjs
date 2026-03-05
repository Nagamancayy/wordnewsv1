const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles', 'main.css');
let content = fs.readFileSync(cssPath, 'utf8');

// 1. Replace Theme Colors
const colorRegex = /\/\* Backgrounds \*\/[\s\S]*?--font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Fira Code', 'DejaVu Sans Mono', 'Liberation Mono', monospace;\n  --font-body: var\(--font-mono\);\n}/;
const newColors = `/* Backgrounds */
  --bg: #0f172a;
  --bg-secondary: #1e293b;
  --surface: #0f172a;
  --surface-hover: #334155;
  --surface-active: #475569;

  /* Borders */
  --border: #334155;
  --border-strong: #475569;
  --border-subtle: #1e293b;

  /* Text */
  --text: #f8fafc;
  --text-secondary: #e2e8f0;
  --text-dim: #94a3b8;
  --text-muted: #64748b;
  --text-faint: #475569;
  --text-ghost: #334155;
  --accent: #38bdf8;

  /* Overlays & shadows */
  --overlay-subtle: rgba(255, 255, 255, 0.03);
  --overlay-light: rgba(255, 255, 255, 0.05);
  --overlay-medium: rgba(255, 255, 255, 0.1);
  --overlay-heavy: rgba(255, 255, 255, 0.2);
  --shadow-color: rgba(0, 0, 0, 0.6);
  --darken-light: rgba(0, 0, 0, 0.15);
  --darken-medium: rgba(0, 0, 0, 0.25);
  --darken-heavy: rgba(0, 0, 0, 0.4);

  /* Scrollbar */
  --scrollbar-thumb: #475569;
  --scrollbar-thumb-hover: #64748b;

  /* Input */
  --input-bg: #1e293b;

  /* Panels */
  --panel-bg: #0f172a;
  --panel-border: #334155;

  /* Map */
  --map-bg: #020617;
  --map-grid: #0f172a;
  --map-country: #1e293b;
  --map-stroke: #334155;

  /* Font stack */
  --font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Fira Code', 'DejaVu Sans Mono', 'Liberation Mono', monospace;
  --font-body: 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', sans-serif;
}`;
content = content.replace(colorRegex, newColors);


// 2. Replace body tag
const bodyRegex = /body \{\n  font-family: var\(--font-body\);\n  font-size: 12px;\n  line-height: 1\.5;\n  background: var\(--bg\);\n  color: var\(--text\);\n  overflow: hidden;\n  height: 100%;\n  width: 100%;\n  min-height: 100vh;\n  min-width: 100vw;\n\}/;
const newBody = `body {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.6;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  height: 100%;
  width: 100%;
  min-height: 100vh;
  min-width: 100vw;
  -webkit-font-smoothing: antialiased;
}`;
content = content.replace(bodyRegex, newBody);


// 3. Replace .main-content to .map-section.hidden
const layoutRegex = /\.main-content \{\n  display: flex;\n  flex: 1;\n  min-height: 0;\n  position: relative;\n\}\n\n\.panels-grid \{\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  overflow-y: auto;\n  overflow-x: hidden;\n  will-change: transform;\n  transform: translateZ\(0\);\n\}\n\n\.map-section \{\n  flex: 0 0 var\(--map-width\);\n  min-width: min\(400px, 100vw\);\n  display: flex;\n  flex-direction: column;\n  border-right: 1px solid var\(--border\);\n  position: relative;\n  transition: flex 0\.3s ease;\n\}\n\n\.map-resize-handle \{\n  position: absolute;\n  right: -2px;\n  top: 0;\n  bottom: 0;\n  width: 4px;\n  cursor: col-resize;\n  background: transparent;\n  z-index: 1000;\n  padding: 0 2px;\n\}/g;

const newLayout = `.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
  background: radial-gradient(circle at top right, rgba(56, 189, 248, 0.05), transparent 50%),
              radial-gradient(circle at bottom left, rgba(56, 189, 248, 0.03), transparent 50%);
}

.panels-grid {
  flex: 0 0 calc(100% - var(--map-width));
  min-width: 400px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  will-change: transform;
  transform: translateZ(0);
  background: var(--surface);
  border-right: 1px solid var(--border);
  box-shadow: 4px 0 24px var(--shadow-color);
  z-index: 10;
}

@media (max-width: 1200px) {
  .panels-grid {
    flex: 0 0 min(500px, 40%);
  }
}

.map-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  transition: flex 0.3s ease;
  z-index: 5;
}

.map-resize-handle {
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  z-index: 1000;
  padding: 0 2px;
}`;
content = content.replace(layoutRegex, newLayout);


// 4. Panel radius 
const panelRegex = /\.panel \{\n  display: flex;\n  flex-direction: column;\n  background: var\(--panel-bg\);\n  border: 1px solid var\(--panel-border\);\n  position: relative;\n  transition: box-shadow 0\.2s, min-width 0\.2s;\n  min-height: 250px;\n\}/g;
const newPanel = `.panel {
  display: flex;
  flex-direction: column;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px; /* Added rounded corners */
  margin: 6px; /* Added spacing between panels */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  min-height: 250px;
}`;
content = content.replace(panelRegex, newPanel);


fs.writeFileSync(cssPath, content, 'utf8');
console.log('CSS updated successfully!');
