// Every built page: loads clean (no console errors/warnings, no 4xx, no failed
// requests), no horizontal overflow at desktop widths, every code trigger
// points at templates that exist.
import { listPages, openTracked } from '../lib.mjs';

export default async function pages({ browser, base, dist, report }) {
  const list = listPages(dist);
  report.note(`${list.length} pages`);
  for (const width of [1280, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    for (const path of list) {
      const { page, problems } = await openTracked(ctx, base + path);
      await page.waitForTimeout(100);
      const info = await page.evaluate(() => {
        const de = document.documentElement;
        const missing = [];
        document.querySelectorAll('.code-trigger').forEach((t) => {
          for (const key of ['codeHtml', 'codeCss', 'codeJs', 'codeDeps']) {
            const id = t.dataset[key];
            if (id && !(document.getElementById(id) instanceof HTMLTemplateElement)) missing.push(id);
          }
        });
        return {
          overflow: de.scrollWidth - de.clientWidth,
          missing,
          specimens: document.querySelectorAll('.specimen').length,
          leftover: /\{\{[>@]?\s*[\w-]/.test(document.body.innerHTML.replace(/<template[\s\S]*?<\/template>/g, '')),
          charset: document.characterSet
        };
      });
      report.check(`${path}@${width} clean`, problems.length === 0, problems.join(' | '));
      report.check(`${path}@${width} no overflow`, info.overflow <= 0, `${info.overflow}px`);
      if (width === 1280) {
        report.check(`${path} templates exist`, info.missing.length === 0, info.missing.join(','));
        report.check(`${path} no template markers`, !info.leftover);
        report.check(`${path} utf-8`, info.charset === 'UTF-8', info.charset);
        if (path.startsWith('components/') && path !== 'components/index.html') {
          report.check(`${path} has specimens`, info.specimens > 0);
        }
      }
      await page.close();
    }
    await ctx.close();
  }
}
