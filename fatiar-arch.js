import fs from "fs";
import path from "path";

const fileContent = fs.readFileSync("docs/ARQUITETURA.md", "utf-8");
// Quebra o texto a cada "## " (ignorando sub-cabeçalhos ###)
const sections = fileContent.split(/^## /gm);

const outputDir = "docs/arch/estado";
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

sections.forEach((section, index) => {
  if (!section.trim()) return;

  // Pega a primeira linha como título e o resto como corpo
  const lines = section.split("\n");
  const title = lines[0].trim();
  const body = lines.slice(1).join("\n").trim();

  // Limpa o título para criar um nome de arquivo válido (ex: "Endpoints da API" -> "endpoints-da-api.md")
  const safeName = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!safeName) return;

  const fileName = `${String(index).padStart(2, "0")}-${safeName}.md`;
  fs.writeFileSync(path.join(outputDir, fileName), `## ${title}\n\n${body}`);

  console.log(`✅ Criado: ${fileName}`);
});
