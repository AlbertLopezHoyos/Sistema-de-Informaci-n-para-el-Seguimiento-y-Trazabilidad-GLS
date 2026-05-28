const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "renderer", "pages");
const css = `    <link rel="stylesheet" href="../assets/css/toast.css" />
    <link rel="stylesheet" href="../assets/css/ui-enhancements.css" />`;
const scripts = `    <script src="../components/toast.js"></script>
    <script src="../components/ui-core.js"></script>
`;

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".html")) continue;
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, "utf8");
  if (!c.includes("toast.css") && c.includes("styles.css")) {
    c = c.replace(
      /<link rel="stylesheet" href="\.\.\/assets\/css\/styles\.css" \/>/,
      `<link rel="stylesheet" href="../assets/css/styles.css" />\n${css}`
    );
  }
  if (!c.includes("toast.js")) {
    if (c.includes('alert.js')) {
      c = c.replace(
        '<script src="../components/alert.js"></script>',
        `${scripts}    <script src="../components/alert.js"></script>`
      );
    } else if (c.includes("login.js")) {
      c = c.replace(
        '<script src="../js/login.js"></script>',
        `${scripts}    <script src="../js/login.js"></script>`
      );
    } else if (c.includes("signup.js")) {
      c = c.replace(
        '<script src="../js/signup.js"></script>',
        `${scripts}    <script src="../js/signup.js"></script>`
      );
    }
  }
  fs.writeFileSync(p, c);
  console.log("patched", f);
}
