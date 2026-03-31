const fs = require('fs');
const path = require('path');

// ============================================================
//  Blog Build Script v2 — Hexo-like
//  读取 posts/*.md → 生成 blog/*.html + blog.html + archive.html + 更新 index.html
//
//  新增功能: 分类(Categories), 归档(Archive), 草稿(Draft),
//           手动摘要(<!-- more -->), 精选文章(Featured)
//
//  用法: node scripts/build.js
// ============================================================

const ROOT   = path.resolve(__dirname, '..');
const POSTS  = path.join(ROOT, 'posts');
const BLOG   = path.join(ROOT, 'blog');
const TPL    = path.join(ROOT, 'templates', 'post.html');

// ───────── Helpers ─────────

function esc(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;

  const meta = {};
  const lines = m[1].split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const arrMatch = line.match(/^(\s+)-\s+(.+)$/);
    if (arrMatch) {
      let j = i - 1;
      while (j >= 0 && lines[j].match(/^\s*$/)) j--;
      if (j >= 0) {
        const keyMatch = lines[j].match(/^(\w[\w-]*)\s*:/);
        if (keyMatch) {
          const key = keyMatch[1];
          if (!meta[key]) meta[key] = [];
          meta[key].push(arrMatch[2].trim());
        }
      }
      i++;
      continue;
    }
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const [, key, val] = kvMatch;
      const v = val.trim();
      if (v === '') {
        if (i + 1 < lines.length && lines[i + 1].match(/^\s+-\s/)) {
          meta[key] = [];
        }
      } else if (v === 'true') {
        meta[key] = true;
      } else if (v === 'false') {
        meta[key] = false;
      } else {
        meta[key] = isNaN(v) ? v : Number(v);
      }
    }
    i++;
  }

  return { meta, content: m[2].trim() };
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]+/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function simpleMarkdown(md) {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${esc(code.trimEnd())}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^[-*]\s+(.+)$/gm, '|||li|||$1|||/li|||')
    .replace(/^\d+\.\s+(.+)$/gm, '|||li|||$1|||/li|||')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  html = html.replace(/(\|\|\|li\|\|\|[\s\S]*?\|\|\|\/li\|\|\|)+/g, (block) => {
    const items = block.replace(/\|\|\|li\|\|\|/g, '<li>').replace(/\|\|\|\/li\|\|\|/g, '</li>');
    return `<ul>${items}</ul>`;
  });

  html = html.replace(/^(?!<[a-z/!]|$|\s)(.*\S.*)$/gm, '<p>$1</p>');

  return html;
}

function formatDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function ensureTags(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Extract excerpt: content before <!-- more -->, or auto first 140 chars
function extractExcerpt(contentHtml, maxLength) {
  const moreIndex = contentHtml.indexOf('<!-- more -->');
  if (moreIndex !== -1) {
    return contentHtml.slice(0, moreIndex).trim();
  }
  // Auto excerpt: strip HTML tags, take first N chars
  const text = contentHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return contentHtml;
  // Find a clean cut point near maxLength
  let cutAt = text.lastIndexOf('。', maxLength) || text.lastIndexOf('.', maxLength) || text.lastIndexOf(' ', maxLength);
  if (cutAt < maxLength * 0.5) cutAt = maxLength;
  return text.slice(0, cutAt + 1) + '…';
}

// Get content after <!-- more --> for full article
function getFullContent(content) {
  return content.replace(/<!-- more -->\s*/g, '');
}

// ───────── Main ─────────

function build() {
  if (!fs.existsSync(POSTS)) {
    console.error('❌ posts/ directory not found');
    process.exit(1);
  }

  // 1. Read all posts
  const files = fs.readdirSync(POSTS).filter(f => f.endsWith('.md'));
  const allPosts = [];
  let draftCount = 0;

  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS, file), 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) {
      console.warn(`⚠ Skipping ${file}: invalid frontmatter`);
      continue;
    }

    // Draft support
    if (parsed.meta.draft === true) {
      draftCount++;
      console.log(`  📝 Draft skipped: ${file}`);
      continue;
    }

    const slug = slugify(file.replace('.md', ''));
    const tags = ensureTags(parsed.meta.tags);
    const category = parsed.meta.category || '未分类';
    const featured = parsed.meta.featured === true;

    const fullContent = getFullContent(parsed.content);
    const contentHtml = simpleMarkdown(fullContent);
    const excerptHtml = extractExcerpt(contentHtml, 140);
    // For excerpt text (plain), strip HTML
    const excerptText = excerptHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    allPosts.push({
      slug,
      file,
      title: parsed.meta.title || slug,
      date: parsed.meta.date || '2026-01-01',
      tags,
      category,
      featured,
      readTime: parsed.meta.readTime || 5,
      contentHtml,
      excerptText,
    });
  }

  // 2. Sort by date descending (featured first within same date)
  allPosts.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return new Date(b.date) - new Date(a.date);
  });

  // Collect all unique tags and categories
  const allTags = [...new Set(allPosts.flatMap(p => p.tags))].sort();
  const allCategories = [...new Set(allPosts.map(p => p.category))].sort();

  console.log(`\n📖 Found ${allPosts.length} posts (${draftCount} drafts), ${allTags.length} tags, ${allCategories.length} categories\n`);

  // 3. Read post template
  if (!fs.existsSync(TPL)) {
    console.error('❌ templates/post.html not found');
    process.exit(1);
  }
  const template = fs.readFileSync(TPL, 'utf-8');

  // 4. Generate individual post pages
  if (!fs.existsSync(BLOG)) fs.mkdirSync(BLOG, { recursive: true });

  // Clean old generated files
  const oldFiles = fs.readdirSync(BLOG).filter(f => f.endsWith('.html'));
  oldFiles.forEach(f => fs.unlinkSync(path.join(BLOG, f)));

  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const prev = i < allPosts.length - 1 ? allPosts[i + 1] : null;
    const next = i > 0 ? allPosts[i - 1] : null;

    const tagsHtml = post.tags
      .map(t => `<span class="tag">${esc(t)}</span>`)
      .join('\n          ');

    const categoryHtml = `<div class="post-category">📁 <a href="../blog.html?category=${encodeURIComponent(post.category)}">${esc(post.category)}</a></div>`;

    const prevHtml = prev
      ? `<a href="${prev.slug}.html" class="post-nav-link prev"><span class="post-nav-label">← 上一篇</span>${esc(prev.title)}</a>`
      : `<span class="post-nav-link prev disabled"><span class="post-nav-label">← 上一篇</span>已是第一篇</span>`;

    const nextHtml = next
      ? `<a href="${next.slug}.html" class="post-nav-link next"><span class="post-nav-label">下一篇 →</span>${esc(next.title)}</a>`
      : `<span class="post-nav-link next disabled"><span class="post-nav-label">下一篇 →</span>已是最新</span>`;

    const html = template
      .replace(/\{\{TITLE\}\}/g, `${esc(post.title)} — sherecho`)
      .replace(/\{\{PAGE_TITLE\}\}/g, esc(post.title))
      .replace(/\{\{DATE\}\}/g, formatDate(post.date))
      .replace(/\{\{READ_TIME\}\}/g, post.readTime)
      .replace(/\{\{TAGS\}\}/g, tagsHtml)
      .replace(/\{\{CATEGORY\}\}/g, categoryHtml)
      .replace(/\{\{CONTENT\}\}/g, post.contentHtml)
      .replace(/\{\{PREV\}\}/g, prevHtml)
      .replace(/\{\{NEXT\}\}/g, nextHtml);

    fs.writeFileSync(path.join(BLOG, `${post.slug}.html`), html);
    console.log(`  ✅ blog/${post.slug}.html`);
  }

  // 5. Generate blog.html listing page
  const blogListItems = allPosts.map(post => {
    const tagsHtml = post.tags
      .map(t => `<span class="tag">${esc(t)}</span>`)
      .join('\n            ');
    const featuredBadge = post.featured ? '<span class="featured-badge">⭐ 精选</span>' : '';
    return `      <article class="blog-item fade-in${post.featured ? ' featured' : ''}" data-tags="${post.tags.join(',')}" data-category="${esc(post.category)}">
        <div class="blog-item-category">${esc(post.category)}</div>
        <div class="blog-item-date">${formatDate(post.date)}</div>
        <div class="blog-item-content">
          <h2><a href="blog/${post.slug}.html">${esc(post.title)}</a>${featuredBadge}</h2>
          <p>${esc(post.excerptText)}</p>
          <div class="card-tags">
            ${tagsHtml}
            <span class="tag">${post.readTime} min read</span>
          </div>
        </div>
      </article>`;
  }).join('\n\n');

  const tagFilterButtons = allTags.map(tag =>
    `        <button class="tag-filter-btn" data-tag="${esc(tag)}">${esc(tag)}</button>`
  ).join('\n');

  const categoryFilterButtons = allCategories.map(cat =>
    `        <button class="category-filter-btn" data-category="${esc(cat)}">${esc(cat)}</button>`
  ).join('\n');

  const blogHtml = generateBlogListHtml(blogListItems, tagFilterButtons, categoryFilterButtons);
  fs.writeFileSync(path.join(ROOT, 'blog.html'), blogHtml);
  console.log(`  ✅ blog.html (${allPosts.length} posts, ${allTags.length} tags, ${allCategories.length} categories)`);

  // 6. Generate archive.html
  const archiveHtml = generateArchiveHtml(allPosts);
  fs.writeFileSync(path.join(ROOT, 'archive.html'), archiveHtml);
  console.log(`  ✅ archive.html (${allPosts.length} posts)`);

  // 7. Update index.html latest posts (featured first)
  updateIndexLatestPosts(allPosts.slice(0, 3));

  console.log('\n🎉 Build complete! Run `npm run build` to rebuild.\n');
}

// ───────── Generate blog.html ─────────

function generateBlogListHtml(items, tagButtons, categoryButtons) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>博客 — sherecho</title>
  <meta name="description" content="sherecho 的技术博客 — AI Agent、开发效率、技术探索">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

  <nav class="navbar">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">shere<span>cho</span></a>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html">首页</a></li>
        <li><a href="about.html">关于</a></li>
        <li><a href="blog.html" class="active">博客</a></li>
        <li><a href="archive.html">归档</a></li>
        <li><a href="index.html#projects">项目</a></li>
      </ul>
      <button class="nav-toggle" id="navToggle" aria-label="菜单">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <div class="container">
    <div class="page-header fade-in">
      <div class="label" style="font-size:.8rem;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">博客</div>
      <h1>技术思考与实践记录</h1>
      <p>关于 AI Agent、开发效率提升和技术探索的原创内容，记录每一步成长。</p>
    </div>
  </div>

  <div class="container">
    <div class="fade-in" style="margin-bottom:16px;">
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px;font-weight:600;">📂 分类</div>
      <div class="category-filter">
        <button class="category-filter-btn active" data-category="all">全部</button>
${categoryButtons}
      </div>
    </div>
    <div class="tag-filter fade-in">
      <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px;font-weight:600;">🏷️ 标签</div>
      <button class="tag-filter-btn active" data-tag="all">全部</button>
${tagButtons}
    </div>
  </div>

  <section class="blog-list">
    <div class="container" id="blogList">

${items}

    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <div class="footer-inner">
        <p>© 2026 sherecho. Built with ❤️ and AI.</p>
        <div class="footer-links">
          <a href="https://github.com/sherecho" target="_blank" rel="noopener">GitHub</a>
          <a href="https://x.com/sherecho" target="_blank" rel="noopener">Twitter</a>
          <a href="mailto:hello@sherecho.dev">Email</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    const navToggle = document.getElementById('navToggle');
    const navLinks  = document.getElementById('navLinks');
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Fallback: ensure all fade-in elements become visible after short delay
    // (handles file:// protocol where IntersectionObserver may not fire)
    setTimeout(() => {
      document.querySelectorAll('.fade-in:not(.visible)').forEach(el => el.classList.add('visible'));
    }, 150);

    // Tag filter
    document.querySelectorAll('.tag-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tag-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tag = btn.dataset.tag;
        document.querySelectorAll('.blog-item').forEach(item => {
          if (tag === 'all' || (item.dataset.tags || '').split(',').includes(tag)) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });

    // Category filter
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.dataset.category;
        document.querySelectorAll('.blog-item').forEach(item => {
          if (category === 'all' || item.dataset.category === category) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });

    // Support ?category= URL param
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam) {
      const catBtn = document.querySelector(\`.category-filter-btn[data-category="\${catParam}"]\`);
      if (catBtn) catBtn.click();
    }
  </script>

</body>
</html>`;
}

// ───────── Generate archive.html ─────────

function generateArchiveHtml(posts) {
  // Group by year → month
  const byYear = {};
  for (const post of posts) {
    const d = new Date(post.date);
    const year = d.getFullYear().toString();
    const month = d.getMonth() + 1;
    const monthStr = month < 10 ? '0' + month : '' + month;
    if (!byYear[year]) byYear[year] = {};
    if (!byYear[year][monthStr]) byYear[year][monthStr] = [];
    byYear[year][monthStr].push(post);
  }

  const years = Object.keys(byYear).sort((a, b) => b - a);
  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

  let archiveContent = '';
  for (const year of years) {
    archiveContent += `      <div class="archive-year">${year}</div>\n`;
    const months = Object.keys(byYear[year]).sort((a, b) => b - a);
    for (const month of months) {
      const monthIdx = parseInt(month) - 1;
      archiveContent += `      <div class="archive-month">${monthNames[monthIdx]}</div>\n`;
      archiveContent += `      <ul class="archive-list">\n`;
      for (const post of byYear[year][month]) {
        archiveContent += `        <li>
          <span class="archive-date">${formatDate(post.date)}</span>
          <span class="archive-title"><a href="blog/${post.slug}.html">${esc(post.title)}</a></span>
          <span class="archive-cat">${esc(post.category)}</span>
        </li>\n`;
      }
      archiveContent += `      </ul>\n`;
    }
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>归档 — sherecho</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

  <nav class="navbar">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">shere<span>cho</span></a>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html">首页</a></li>
        <li><a href="about.html">关于</a></li>
        <li><a href="blog.html">博客</a></li>
        <li><a href="archive.html" class="active">归档</a></li>
        <li><a href="index.html#projects">项目</a></li>
      </ul>
      <button class="nav-toggle" id="navToggle" aria-label="菜单">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <div class="container">
    <div class="page-header fade-in">
      <div class="label" style="font-size:.8rem;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">归档</div>
      <h1>文章归档</h1>
      <p class="archive-stats">共 ${posts.length} 篇文章</p>
    </div>
  </div>

  <div class="container" style="padding-top:0;">
${archiveContent}
  </div>

  <footer class="footer">
    <div class="container">
      <div class="footer-inner">
        <p>© 2026 sherecho. Built with ❤️ and AI.</p>
        <div class="footer-links">
          <a href="https://github.com/sherecho" target="_blank" rel="noopener">GitHub</a>
          <a href="https://x.com/sherecho" target="_blank" rel="noopener">Twitter</a>
          <a href="mailto:hello@sherecho.dev">Email</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    const navToggle = document.getElementById('navToggle');
    const navLinks  = document.getElementById('navLinks');
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Fallback: ensure all fade-in elements become visible after short delay
    setTimeout(() => {
      document.querySelectorAll('.fade-in:not(.visible)').forEach(el => el.classList.add('visible'));
    }, 150);
  </script>

</body>
</html>`;
}

// ───────── Update index.html ─────────

function updateIndexLatestPosts(latest3) {
  const indexPath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, 'utf-8');

  const icons  = ['cyan', 'green', 'blue'];
  const emojis = ['🤖', '⚡', '🧠'];

  const cardsHtml = latest3.map((post, i) => {
    const tagsHtml = post.tags.slice(0, 3)
      .map(t => `<span class="tag">${esc(t)}</span>`)
      .join('\n          ');
    const featuredBadge = post.featured ? ' <span class="featured-badge">⭐</span>' : '';
    return `        <article class="card">
          <div class="card-icon ${icons[i]}">${emojis[i]}</div>
          <div class="card-date">${formatDate(post.date)}</div>
          <h3 class="card-title"><a href="blog/${post.slug}.html">${esc(post.title)}</a>${featuredBadge}</h3>
          <p class="card-excerpt">
            ${esc(post.excerptText)}
          </p>
          <div class="card-tags">
            ${tagsHtml}
          </div>
        </article>`;
  }).join('\n\n');

  const regex = /(<!--\s*={5,}\s*Blog Posts\s*={5,}\s*-->[\s\S]*?<div class="cards-grid fade-in">)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/;
  const match = html.match(regex);
  if (match) {
    html = html.replace(regex, `$1\n\n${cardsHtml}\n\n      $3`);
    fs.writeFileSync(indexPath, html);
    console.log(`  ✅ index.html (updated latest 3 posts)`);
  } else {
    console.warn('  ⚠ Could not find blog cards section in index.html');
  }
}

// Run
build();
