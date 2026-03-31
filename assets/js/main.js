/**
 * main.js — sherecho 个人主页主交互脚本
 * 
 * 功能清单：
 *  - 平滑滚动 (Smooth Scroll)
 *  - 导航栏滚动阴影 / 背景效果
 *  - 滚动渐入动画 (Intersection Observer)
 *  - 暗色 / 亮色主题切换
 *  - 移动端汉堡菜单
 *  - 博客卡片 hover 微动画增强
 *  - 返回顶部按钮
 */

'use strict';

/* ============================================================
   1. DOM Ready 入口
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initNavbarScroll();
  initScrollReveal();
  initThemeToggle();
  initMobileMenu();
  initCardHoverEffects();
  initBackToTop();
});

/* ============================================================
   2. 平滑滚动 (Smooth Scroll)
   ============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();

      // 计算偏移量（考虑固定导航栏高度）
      const navbar = document.querySelector('.navbar');
      const offset = navbar ? navbar.offsetHeight + 16 : 16;

      const top = targetEl.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({
        top,
        behavior: 'smooth',
      });

      // 移动端点击后自动关闭菜单
      closeMobileMenu();
    });
  });
}

/* ============================================================
   3. 导航栏滚动时添加阴影 / 背景效果
   ============================================================ */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const SCROLL_THRESHOLD = 50;

  const handleScroll = () => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
  };

  // 初始化时立即检查一次
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
}

/* ============================================================
   4. 滚动渐入动画 (Intersection Observer)
   ============================================================ */
function initScrollReveal() {
  // 所有带 data-reveal 属性的元素
  const revealElements = document.querySelectorAll('[data-reveal]');

  if (!revealElements.length) return;

  // 检测是否支持 IntersectionObserver
  if (!('IntersectionObserver' in window)) {
    // 降级：直接显示所有元素
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;

          // 支持 data-reveal-delay 属性设置延迟
          const delay = parseInt(el.dataset.revealDelay, 10) || 0;

          setTimeout(() => {
            el.classList.add('revealed');
          }, delay);

          // 动画完成后取消观察
          observer.unobserve(el);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealElements.forEach(el => observer.observe(el));
}

/* ============================================================
   5. 暗色 / 亮色主题切换
   ============================================================ */
function initThemeToggle() {
  const toggleBtn = document.querySelector('.theme-toggle');
  if (!toggleBtn) return;

  const STORAGE_KEY = 'sherecho-theme';

  /** 获取当前主题 */
  const getTheme = () => localStorage.getItem(STORAGE_KEY) || 'light';

  /** 应用主题到 <html> */
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    toggleBtn?.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
    toggleBtn?.classList.toggle('theme-toggle--dark', theme === 'dark');
  };

  /** 切换主题 */
  const toggleTheme = () => {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  // 初始化
  applyTheme(getTheme());

  // 监听点击
  toggleBtn.addEventListener('click', toggleTheme);
}

/* ============================================================
   6. 移动端汉堡菜单
   ============================================================ */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');

  if (!hamburger || !navMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('nav-menu--open');
    hamburger.classList.toggle('hamburger--active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));

    // 切换 body 滚动锁定
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // 点击菜单外部关闭
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
      closeMobileMenu();
    }
  });

  // ESC 键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });
}

/** 关闭移动端菜单 */
function closeMobileMenu() {
  const navMenu = document.querySelector('.nav-menu');
  const hamburger = document.querySelector('.hamburger');

  if (navMenu) navMenu.classList.remove('nav-menu--open');
  if (hamburger) {
    hamburger.classList.remove('hamburger--active');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

/* ============================================================
   7. 博客卡片 hover 微动画增强
   ============================================================ */
function initCardHoverEffects() {
  const cards = document.querySelectorAll('.blog-card, .project-card');

  cards.forEach(card => {
    // 鼠标移入时添加微倾斜效果 (3D tilt)
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // 计算旋转角度（最大 ±5 度）
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    // 鼠标移出时恢复
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    // 添加过渡效果（仅在非 hover 时生效）
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.1s ease-out';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.4s ease-out';
    });
  });
}

/* ============================================================
   8. 返回顶部按钮
   ============================================================ */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  const SHOW_THRESHOLD = 400;

  // 滚动时显示/隐藏
  const handleScroll = () => {
    btn.classList.toggle('back-to-top--visible', window.scrollY > SHOW_THRESHOLD);
  };

  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });

  // 点击回到顶部
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
