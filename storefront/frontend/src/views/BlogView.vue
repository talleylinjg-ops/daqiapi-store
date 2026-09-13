<template>
  <div class="container">
    <section style="padding-bottom: 24px">
      <h2 class="section-title" style="text-align: left; margin-bottom: 4px">Blog</h2>
      <p class="section-sub" style="text-align: left">Guides, tutorials and tips for getting the most out of your API credits.</p>
    </section>

    <!-- Category submenu / table of contents -->
    <div class="cat-menu">
      <button
        v-for="c in cats"
        :key="c.slug"
        class="cat-btn"
        :class="{ active: !category || category === c.slug }"
        @click="setCategory(category === c.slug ? null : c.slug)"
      >{{ c.title }}</button>
      <button class="cat-btn" :class="{ active: category === 'all' }" @click="setCategory('all')">All</button>
    </div>

    <div v-if="error" class="demo-banner">{{ error }}</div>
    <div v-if="!posts.length && !error" class="section-sub">Loading posts...</div>

    <div class="blog-grid">
      <a v-for="p in posts" :key="p.slug" class="blog-card" :href="`/blog/${p.slug}`">
        <div class="blog-cover">
          <img :src="p.cover" :alt="p.title" loading="lazy" />
        </div>
        <div class="blog-meta">
          <span class="blog-cat">{{ catTitle(p.category) }}</span>
          <span>&middot;</span>
          <span>{{ p.date }}</span>
          <span>&middot;</span>
          <span>{{ p.readTime }} min read</span>
        </div>
        <h3>{{ p.title }}</h3>
        <p>{{ p.excerpt }}</p>
        <div class="blog-tags">
          <span v-for="t in p.tags" :key="t" class="blog-tag">{{ t }}</span>
        </div>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { posts: [], cats: [], category: null, error: '' };
  },
  async created() {
    this.setSeo();
    await this.loadCats();
    await this.loadPosts();
  },
  methods: {
    setMeta(name, content) {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    },
    setSeo() {
      document.title = 'Blog | DaqiAPI';
      this.setMeta('description', 'Guides, tutorials and tips for getting the most out of your API credits.');
      this.setMeta('og:title', 'Blog | DaqiAPI');
      this.setMeta('og:type', 'website');
      this.setMeta('og:url', window.location.href);
    },
    catTitle(slug) {
      const c = this.cats.find((c) => c.slug === slug);
      return c ? c.title : 'Blog';
    },
    async loadCats() {
      try {
        const res = await fetch('/api/blog/categories');
        const data = await res.json();
        this.cats = data.categories || [];
      } catch (err) {
        this.error = 'Failed to load blog. Is the backend running?';
      }
    },
    async loadPosts() {
      try {
        const q = this.category ? `?category=${this.category}` : '';
        const res = await fetch(`/api/blog/posts${q}`);
        const data = await res.json();
        this.posts = data.posts || [];
      } catch (err) {
        this.error = 'Failed to load posts. Is the backend running?';
      }
    },
    setCategory(slug) {
      this.category = slug;
      this.loadPosts();
    },
  },
};
</script>
