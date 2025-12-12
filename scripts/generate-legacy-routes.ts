import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type PageInfo = {
  name: string;
  relPath: string; // relative to src
  humanTitle: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const pagesRoot = path.join(srcRoot, 'pages');
const migrationRoutesRoot = path.join(srcRoot, 'migration', 'routes');
const generatedRoot = path.join(srcRoot, 'migration', 'generated');

const force = process.argv.includes('--force');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isTestFile(file: string) {
  return file.endsWith('.test.tsx') || file.endsWith('.spec.tsx');
}

function toPascalCase(name: string) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/(^\w|[\s]\w)/g, (m) => m.replace(/\s+/, '').toUpperCase());
}

function humanize(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectPages(dir: string): PageInfo[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const collected: PageInfo[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(srcRoot, full).replace(/\\/g, '/');

    // Exclusions
    if (rel.startsWith('pages_migration/')) continue;
    if (entry.isDirectory() && entry.name.toLowerCase() === 'legacy') continue;
    if (entry.isDirectory()) {
      collected.push(...collectPages(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.tsx')) continue;
    if (isTestFile(entry.name)) continue;

    const nameWithExt = path.basename(entry.name);
    const base = nameWithExt.replace(/\.tsx$/, '');
    const name = toPascalCase(base);
    collected.push({
      name,
      relPath: rel,
      humanTitle: humanize(name)
    });
  }
  return collected;
}

function wrapperPath(name: string) {
  return path.join(migrationRoutesRoot, `${name}.legacy.tsx`);
}

function generateWrapper(page: PageInfo) {
  const target = wrapperPath(page.name);
  if (fs.existsSync(target) && !force) {
    return { created: false, path: target };
  }
  ensureDir(path.dirname(target));
  const importPath = page.relPath.replace(/\\/g, '/').replace(/^pages\//, '');
  const content = `import React from "react";
import { usePageTitle } from "../../hooks/usePageTitle";
import UnifiedShellRouter from "../UnifiedShellRouter";
import { migrationFlags } from "../flags";
import LegacyPage from "../../pages/${importPath}";

export default function ${page.name}LegacyRoute(props: any) {
  if (!migrationFlags.unifiedShell) {
    return <LegacyPage {...props} />;
  }

  const { setTitle } = usePageTitle();
  React.useEffect(() => {
    setTitle("${page.humanTitle}");
  }, []);

  return (
    <UnifiedShellRouter>
      <LegacyPage {...props} />
    </UnifiedShellRouter>
  );
}
`;
  fs.writeFileSync(target, content, 'utf-8');
  return { created: true, path: target };
}

function writeJSON(filePath: string, data: any) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateMaps(pages: PageInfo[]) {
  const legacyResolvers: Record<
    string,
    {
      pagePath: string;
      wrapperPath: string;
    }
  > = {};
  pages.forEach((p) => {
    legacyResolvers[p.name] = {
      pagePath: `pages/${p.relPath}`,
      wrapperPath: `migration/routes/${p.name}.legacy`
    };
  });
  writeJSON(path.join(generatedRoot, 'legacy-resolvers.json'), legacyResolvers);

  const routesMap = `export const LegacyRoutesMap = {
${pages
  .map((p) => `  ${p.name}: () => import("../routes/${p.name}.legacy"),`)
  .join('\n')}
};
`;
  ensureDir(generatedRoot);
  fs.writeFileSync(path.join(generatedRoot, 'LegacyRoutesMap.ts'), routesMap, 'utf-8');

  const switchboardMap = `import { migrationFlags } from "../flags";

export const switchboardLegacyResolvers = {
${pages
  .map(
    (p) => `  ${p.name}: async () => {
    if (migrationFlags.unifiedShell) {
      return (await import("../routes/${p.name}.legacy")).default;
    }
    return (await import("../../pages/${p.relPath}")).default;
  },`
  )
  .join('\n')}
};
`;
  fs.writeFileSync(path.join(generatedRoot, 'switchboardLegacyResolvers.ts'), switchboardMap, 'utf-8');
}

async function main() {
  ensureDir(migrationRoutesRoot);
  ensureDir(generatedRoot);

  const pages = collectPages(pagesRoot);
  let createdCount = 0;
  pages.forEach((page) => {
    const res = generateWrapper(page);
    if (res.created) createdCount += 1;
  });

  generateMaps(pages);

  console.log(`✔ Generated ${createdCount} legacy wrappers`);
  console.log(`✔ Generated resolver map`);
  console.log(`✔ Generated router map`);
}

main().catch((err) => {
  console.error('Generation failed', err);
  process.exit(1);
});
