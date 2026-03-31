/**
 * blog.js — sherecho 个人主页博客相关脚本
 * 
 * 功能清单：
 *  - 标签筛选功能
 *  - 前端搜索功能（标题 + 摘要 + 标签）
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initTagFilter();
  initBlogSearch();
});

/* ============================================================
   1. 标签筛选功能
   ============================================================ */
function initTagFilter() {
  const filterContainer = document.querySelector('.tag-filter');
  const blogCards = document.querySelectorAll('.blog-card[data-tags]');

  if (!filterContainer || !blogCards.length) return;

  // 标签按钮点击事件（事件委托）
  filterContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;

    const tag = btn.dataset.tag;

    // 更新按钮激活状态
    filterContainer.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--active'));
    btn.classList.add('tag-btn--active');

    // 筛选卡片
    filterCards(tag);
  });
}

/**
 * 根据标签筛选博客卡片
 * @param {string} tag — 选中的标签，'all' 表示显示全部
 */
function filterCards(tag) {
  const cards = document.querySelectorAll('.blog-card[data-tags]');
  let visibleCount = 0;

  cards.forEach(card => {
    const cardTags = card.dataset.tags.split(',').map(t => t.trim().toLowerCase());
    const match = tag === 'all' || cardTags.includes(tag.toLowerCase());

    if (match) {
      card.style.display = '';
      card.classList.add('revealed');
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  // 显示/隐藏"无结果"提示
  showNoResults(visibleCount === 0);
}

/* ============================================================
   2. 前端搜索功能
   ============================================================ */
function initBlogSearch() {
  const searchInput = document.querySelector('.blog-search');
  if (!searchInput) return;

  // 使用防抖（debounce）优化搜索体验
  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = searchInput.value.trim().toLowerCase();
      searchCards(query);
    }, 250);
  });

  // ESC 清空搜索
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchCards('');
      searchInput.blur();
    }
  });
}

/**
 * 根据搜索关键词筛选博客卡片
 * @param {string} query — 搜索关键词
 */
function searchCards(query) {
  const cards = document.querySelectorAll('.blog-card');
  let visibleCount = 0;

  cards.forEach(card => {
    if (!query) {
      // 空查询时恢复所有卡片
      card.style.display = '';
      visibleCount++;
      return;
    }

    // 在标题、摘要、标签中搜索
    const title = (card.querySelector('.blog-card__title')?.textContent || '').toLowerCase();
    const excerpt = (card.querySelector('.blog-card__excerpt')?.textContent || '').toLowerCase();
    const tags = (card.dataset.tags || '').toLowerCase();

    const match = title.includes(query) || excerpt.includes(query) || tags.includes(query);

    card.style.display = match ? '' : 'none';
    if (match) visibleCount++;
  });

  showNoResults(visibleCount === 0);

  // 搜索时重置标签按钮状态
  if (query) {
    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('tag-btn--active'));
    const allBtn = document.querySelector('.tag-btn[data-tag="all"]');
    allBtn?.classList.add('tag-btn--active');
  }
}

/* ============================================================
   3. 工具函数
   ============================================================ */

/** 显示或隐藏"无结果"提示 */
function showNoResults(show) {
  let noResultEl = document.querySelector('.blog-no-results');

  if (show) {
    if (!noResultEl) {
      noResultEl = document.createElement('div');
      noResultEl.className = 'blog-no-results';
      noResultEl.innerHTML = `
        <p>😔 没有找到匹配的文章</p>
        <p class="blog-no-results__hint">试试其他关键词或标签？</p>
      `;
      // 插入到卡片容器内
      const container = document.querySelector('.blog-grid');
      container?.appendChild(noResultEl);
    }
    noResultEl.style.display = '';
  } else if (noResultEl) {
    noResultEl.style.display = 'none';
  }
}
