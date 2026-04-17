const fs = require('fs');
const path = require('path');

const editorPath = path.join('d:/自媒体/Octopus', 'src', 'components', 'Editor.vue');
let content = fs.readFileSync(editorPath, 'utf-8');

// The massive replacements:
const rules = [
  { search: /#0f172a/gi, replace: 'var(--bg-app)' },
  { search: /#1e293b/gi, replace: 'var(--bg-panel)' },
  { search: /#1e2329/gi, replace: 'var(--bg-panel)' },
  { search: /#282c34/gi, replace: 'var(--bg-panel)' },
  
  { search: /#ffffff/gi, replace: 'var(--bg-preview)' }, // This handles preview pane white
  { search: /#fff/gi, replace: 'var(--text-primary)' },
  
  { search: /#cbd5e1/gi, replace: 'var(--text-primary)' },
  { search: /#94a3b8/gi, replace: 'var(--text-secondary)' },
  { search: /#64748b/gi, replace: 'var(--text-muted)' },
  
  { search: /rgba\(255(?:,\s*|\s+)255(?:,\s*|\s+)255(?:,\s*|\s+)0\.05\)/g, replace: 'var(--border-subtle)' },
  { search: /rgba\(255(?:,\s*|\s+)255(?:,\s*|\s+)255(?:,\s*|\s+)0\.1\)/g, replace: 'var(--border-strong)' },
  { search: /rgba\(255(?:,\s*|\s+)255(?:,\s*|\s+)255(?:,\s*|\s+)0\.15\)/g, replace: 'var(--border-strong)' },
  { search: /rgba\(255(?:,\s*|\s+)255(?:,\s*|\s+)255(?:,\s*|\s+)0\.2\)/g, replace: 'var(--border-strong)' },
  
  { search: /rgba\(15(?:,\s*|\s+)23(?:,\s*|\s+)42(?:,\s*|\s+)0\.75\)/g, replace: 'var(--bg-toolbar)' },
  { search: /rgba\(15(?:,\s*|\s+)23(?:,\s*|\s+)42(?:,\s*|\s+)0\.95\)/g, replace: 'var(--bg-toolbar)' },
  { search: /rgba\(15(?:,\s*|\s+)23(?:,\s*|\s+)42(?:,\s*|\s+)0\.6\)/g, replace: 'var(--bg-toolbar)' },
  { search: /rgba\(15(?:,\s*|\s+)23(?:,\s*|\s+)42(?:,\s*|\s+)0\.2\)/g, replace: 'var(--border-strong)' },
  { search: /rgba\(15(?:,\s*|\s+)23(?:,\s*|\s+)42(?:,\s*|\s+)0\.4\)/g, replace: 'var(--border-strong)' },
  
  // Hover & accent buttons
  { search: /#3b82f6/gi, replace: 'var(--accent-color)' },
  { search: /#38bdf8/gi, replace: 'var(--accent-color)' },
  { search: /#4a8df8/gi, replace: 'var(--accent-color)' },
  
  // Specific inline fix for toolbars that used white text regardless of background
  { search: /color:\s*white/gi, replace: 'color: var(--text-primary)' },
  { search: /color:\s*#f8fafc/gi, replace: 'color: var(--text-primary)' },
  { search: /color:\s*#e2e8f0/gi, replace: 'color: var(--text-primary)' },
  // Ensure the black text in the preview doesn't disappear in dark mode due to regex overlapping
  { search: /color:\s*#334155/gi, replace: 'color: var(--text-primary)' },
];

rules.forEach(r => {
  content = content.replace(r.search, r.replace);
});

// Write to file
fs.writeFileSync(editorPath, content, 'utf-8');
console.log('Successfully replaced hardcoded colors with tokens in Editor.vue');
