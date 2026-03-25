// Build script: bundles FaithFit into a single shareable HTML file
// Run with: node build.js

const fs = require('fs');
const path = require('path');

const dir = __dirname;

const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
const coachJs = fs.readFileSync(path.join(dir, 'coach.js'), 'utf8');
const photosJs = fs.readFileSync(path.join(dir, 'photos.js'), 'utf8');

let out = html;

// Remove external file references and PWA-only tags
out = out.replace(/<link rel="stylesheet" href="styles\.css">[^\n]*\n?/, '');
out = out.replace(/<link rel="manifest"[^>]*>[^\n]*\n?/, '');
out = out.replace(/<link rel="apple-touch-icon"[^>]*>[^\n]*\n?/, '');
out = out.replace(/<meta name="apple-mobile-web-app-capable"[^>]*>[^\n]*\n?/, '');
out = out.replace(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>[^\n]*\n?/, '');
out = out.replace(/<meta name="apple-mobile-web-app-title"[^>]*>[^\n]*\n?/, '');
out = out.replace(/<script src="app\.js"><\/script>[^\n]*\n?/, '');
out = out.replace(/<script src="photos\.js"><\/script>[^\n]*\n?/, '');
out = out.replace(/<script src="coach\.js"><\/script>[^\n]*\n?/, '');

// Inline CSS
out = out.replace('</head>', `    <style>\n${css}\n    </style>\n</head>`);

// Inline JS
out = out.replace('</body>',
`    <script>\n${appJs}\n    </script>
    <script>\n${photosJs}\n    </script>
    <script>\n${coachJs}\n    </script>
</body>`);

const outPath = path.join(dir, 'FaithFit.html');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Built: ' + outPath + ' (' + (out.length / 1024).toFixed(1) + ' KB)');
