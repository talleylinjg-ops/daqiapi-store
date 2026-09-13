<template>
  <div class="container">
    <section style="padding-bottom: 18px">
      <h2 class="section-title" style="text-align: left; margin-bottom: 4px">Forum</h2>
      <p class="section-sub" style="text-align: left">Community discussions around products, support and ideas.</p>
    </section>

    <div class="forum-bar">
      <div class="forum-breadcrumb">
        <a href="/forum">Forum</a>
        <template v-if="mode === 'category'">
          <span class="crumb-sep">&rsaquo;</span>
          <span>{{ categoryName }}</span>
        </template>
        <template v-if="mode === 'topic'">
          <span class="crumb-sep">&rsaquo;</span>
          <a @click="goBackToCategory">{{ categoryName }}</a>
          <span class="crumb-sep">&rsaquo;</span>
          <span class="crumb-current">{{ topic.title }}</span>
        </template>
      </div>
      <div class="forum-actions">
        <button v-if="currentUser" class="btn-ghost" @click="openNewTopic">New Topic</button>
        <template v-if="currentUser">
          <span class="user-chip" :class="{ mod: currentUser.is_mod }">
            {{ currentUser.username }}<template v-if="currentUser.is_mod"> &middot; mod</template>
          </span>
          <button class="btn-ghost" @click="logout">Sign out</button>
        </template>
        <template v-else>
          <button class="btn-ghost" @click="openAuth('login')">Sign in</button>
          <button class="btn-solid" @click="openAuth('register')">Register</button>
        </template>
      </div>
    </div>

    <div v-if="error" class="demo-banner">{{ error }}</div>
    <div v-if="loading" class="section-sub" style="padding: 24px 0">Loading...</div>

    <!-- HOME: category list -->
    <div v-if="mode === 'home' && !loading" class="forum-panel">
      <div class="forum-row forum-head">
        <div class="col-main">Forum</div>
        <div class="col-count">Topics</div>
        <div class="col-count">Replies</div>
        <div class="col-last">Last Post</div>
      </div>
      <div v-for="c in categories" :key="c.id" class="forum-row forum-body" @click="openCategory(c)">
        <div class="col-main">
          <div class="cat-ico" :style="{ background: catColor(c.slug) }">{{ c.name.charAt(0) }}</div>
          <div>
            <a class="cat-name" :href="`/forum/category/${c.id}`">{{ c.name }}</a>
            <div class="cat-desc">{{ c.description }}</div>
          </div>
        </div>
        <div class="col-count">{{ c.topics }}</div>
        <div class="col-count">{{ c.replies }}</div>
        <div class="col-last">
          <template v-if="c.lastTopic">
            <a :href="`/forum/topic/${c.lastTopic.id}`" class="last-title">{{ c.lastTopic.title }}</a>
            <div class="last-time">{{ fmtTime(c.lastTopic.lastReplyAt) }}</div>
          </template>
          <span v-else class="muted">No posts</span>
        </div>
      </div>
    </div>

    <!-- CATEGORY: topic list -->
    <div v-if="mode === 'category' && !loading" class="forum-panel">
      <div class="forum-row forum-head">
        <div class="col-main">Topic</div>
        <div class="col-count">Replies</div>
        <div class="col-count">Views</div>
        <div class="col-last">Last Post</div>
      </div>
      <div v-for="t in topics" :key="t.id" class="forum-row forum-body" @click="openTopic(t)">
        <div class="col-main">
          <div class="topic-title">
            <span v-if="t.pinned" class="pill pill-pin">PIN</span>
            <span v-if="t.closed" class="pill pill-close">CLOSED</span>
            <a class="cat-name" :href="`/forum/topic/${t.id}`">{{ t.title }}</a>
          </div>
          <div class="topic-by">by {{ t.author }} &middot; {{ fmtTime(t.createdAt) }}</div>
        </div>
        <div class="col-count">{{ t.replies }}</div>
        <div class="col-count">{{ t.views }}</div>
        <div class="col-last">
          <template v-if="t.lastAuthor">
            <div class="last-author">{{ t.lastAuthor }}</div>
            <div class="last-time">{{ fmtTime(t.lastReplyAt) }}</div>
          </template>
          <span v-else class="muted">None</span>
        </div>
      </div>
      <div v-if="!topics.length" class="forum-empty">
        No topics yet in this category.
        <button v-if="currentUser" class="btn-solid" style="margin-left: 10px" @click="openNewTopic">Start one</button>
      </div>
      <div v-if="pages > 1" class="pager">
        <button class="btn-ghost" :disabled="page <= 1" @click="goTopicPage(page - 1)">&lsaquo; Prev</button>
        <span class="pager-info">{{ page }} / {{ pages }}</span>
        <button class="btn-ghost" :disabled="page >= pages" @click="goTopicPage(page + 1)">Next &rsaquo;</button>
      </div>
    </div>

    <!-- TOPIC: thread -->
    <div v-if="mode === 'topic' && !loading" class="forum-panel">
      <div class="thread-head">
        <div class="thread-tags">
          <span v-if="topic.pinned" class="pill pill-pin">PINNED</span>
          <span v-if="topic.closed" class="pill pill-close">CLOSED</span>
        </div>
        <h2 class="thread-title">{{ topic.title }}</h2>
        <div class="thread-meta">
          Started by <b>{{ topic.author }}</b> &middot; {{ fmtTime(topic.createdAt) }} &middot; {{ topic.views }} views
        </div>
        <div v-if="currentUser && currentUser.is_mod" class="mod-tools">
          <button class="btn-ghost btn-sm" @click="modTopic(topic.pinned ? 'unpin' : 'pin')">{{ topic.pinned ? 'Unpin' : 'Pin' }}</button>
          <button class="btn-ghost btn-sm" @click="modTopic(topic.closed ? 'open' : 'close')">{{ topic.closed ? 'Open' : 'Close' }}</button>
          <button class="btn-ghost btn-sm btn-danger" @click="modTopic('delete')">Delete topic</button>
        </div>
      </div>

      <div class="post first">
        <div class="post-side">
          <div class="avatar" :style="{ background: nameColor(topic.author) }">{{ topic.author.charAt(0) }}</div>
          <div class="post-author">{{ topic.author }}</div>
          <div class="post-time">{{ fmtTime(topic.createdAt) }}</div>
        </div>
        <div class="post-body">{{ topic.content }}</div>
      </div>

      <div v-for="r in replies" :key="r.id" class="post">
        <div class="post-side">
          <div class="avatar" :style="{ background: nameColor(r.author) }">{{ r.author.charAt(0) }}</div>
          <div class="post-author">{{ r.author }}</div>
          <div class="post-time">{{ fmtTime(r.createdAt) }}</div>
        </div>
        <div class="post-body">
          {{ r.content }}
          <button
            v-if="currentUser && currentUser.is_mod"
            class="btn-ghost btn-sm btn-danger reply-del"
            @click="modReply(r.id)"
          >Delete</button>
        </div>
      </div>

      <div v-if="pages > 1" class="pager">
        <button class="btn-ghost" :disabled="page <= 1" @click="goReplyPage(page - 1)">&lsaquo; Prev</button>
        <span class="pager-info">{{ page }} / {{ pages }}</span>
        <button class="btn-ghost" :disabled="page >= pages" @click="goReplyPage(page + 1)">Next &rsaquo;</button>
      </div>

      <div class="reply-box">
        <h3 class="reply-title">Reply to this topic</h3>
        <template v-if="currentUser">
          <textarea
            v-if="!topic.closed"
            v-model="replyContent"
            class="input textarea"
            rows="4"
            placeholder="Write your reply..."
          ></textarea>
          <div v-if="!topic.closed" class="form-msg">{{ replyMsg }}</div>
          <div v-if="topic.closed" class="section-sub">This topic is closed for new replies.</div>
          <button v-if="!topic.closed" class="btn-solid" :disabled="sending" @click="submitReply">Post reply</button>
        </template>
        <div v-else class="section-sub">
          <a class="accent-link" @click="openAuth('login')">Sign in</a> or
          <a class="accent-link" @click="openAuth('register')">register</a> to join the discussion.
        </div>
      </div>
    </div>

    <!-- AUTH MODAL -->
    <div v-if="authOpen" class="modal-mask" @click.self="closeModals">
      <div class="modal">
        <h3 class="modal-title">{{ authMode === 'login' ? 'Sign in' : 'Create account' }}</h3>
        <input v-model="authForm.username" class="input" placeholder="Username (3-30 chars, letters/numbers/_/-)" />
        <input v-model="authForm.password" class="input" type="password" placeholder="Password (min 6 chars)" @keyup.enter="submitAuth" />
        <div class="form-msg">{{ authMsg }}</div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="closeModals">Cancel</button>
          <button class="btn-solid" :disabled="authBusy" @click="submitAuth">
            {{ authMode === 'login' ? 'Sign in' : 'Register' }}
          </button>
        </div>
        <div class="modal-alt">
          <template v-if="authMode === 'login'">
            New here? <a class="accent-link" @click="openAuth('register')">Create an account</a>
          </template>
          <template v-else>
            Already have an account? <a class="accent-link" @click="openAuth('login')">Sign in</a>
          </template>
        </div>
      </div>
    </div>

    <!-- NEW TOPIC MODAL -->
    <div v-if="newTopicOpen" class="modal-mask" @click.self="closeModals">
      <div class="modal">
        <h3 class="modal-title">Start a new topic</h3>
        <select v-model="newTopic.categoryId" class="input">
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <input v-model="newTopic.title" class="input" placeholder="Topic title (3-120 chars)" />
        <textarea v-model="newTopic.content" class="input textarea" rows="5" placeholder="Describe your topic..."></textarea>
        <div class="form-msg">{{ newTopicMsg }}</div>
        <div class="modal-actions">
          <button class="btn-ghost" @click="closeModals">Cancel</button>
          <button class="btn-solid" :disabled="sending" @click="submitNewTopic">Post topic</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      categories: [],
      mode: 'home',
      categoryName: '',
      topics: [],
      topic: {},
      replies: [],
      page: 1,
      pages: 1,
      loading: false,
      error: '',
      currentUser: null,
      authOpen: false,
      authMode: 'login',
      authForm: { username: '', password: '' },
      authMsg: '',
      authBusy: false,
      newTopicOpen: false,
      newTopic: { categoryId: null, title: '', content: '' },
      newTopicMsg: '',
      replyContent: '',
      replyMsg: '',
      sending: false,
    };
  },
  async created() {
    this.setSeo();
    await this.loadUser();
    await this.loadCategories();
    await this.routeChanged();
  },
  watch: {
    $route() {
      this.routeChanged();
    },
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
      document.title = 'Forum | DaqiAPI';
      this.setMeta('description', 'DaqiAPI community forum: product discussions, support and feedback.');
      this.setMeta('og:title', 'Forum | DaqiAPI');
      this.setMeta('og:type', 'website');
      this.setMeta('og:url', window.location.href);
    },
    token() {
      return localStorage.getItem('daqiapi_forum_token') || '';
    },
    headers() {
      return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token()}` };
    },
    async api(url, opts = {}) {
      const res = await fetch(url, opts);
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        /* noop */
      }
      return { status: res.status, data };
    },
    fmtTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const now = Date.now();
      const diff = Math.floor((now - ts) / 1000);
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    catColor(slug) {
      const colors = {
        announcements: '#6366f1',
        products: '#0ea5e9',
        support: '#34d399',
        feedback: '#f59e0b',
        'off-topic': '#8b5cf6',
        integrations: '#ec4899',
        tutorials: '#14b8a6',
        showcase: '#f43f5e',
        billing: '#eab308',
        vpn: '#22c55e',
        esim: '#2563eb',
        models: '#a855f7',
        api: '#06b6d4',
        security: '#dc2626',
        jobs: '#f97316',
        'getting-started': '#0891b2',
        payments: '#16a34a',
        opensource: '#7c3aed',
        mobile: '#db2777',
        devops: '#0d9488',
        data: '#ca8a04',
        partners: '#4f46e5',
        events: '#ea580c',
        meta: '#64748b',
      };
      return colors[slug] || '#64748b';
    },
    nameColor(name) {
      const colors = ['#6366f1', '#0ea5e9', '#34d399', '#f59e0b', '#8b5cf6', '#f472b6', '#22d3ee'];
      let h = 0;
      for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return colors[h % colors.length];
    },
    async loadUser() {
      if (!this.token()) return;
      const { status, data } = await this.api('/api/forum/me', { headers: this.headers() });
      if (status === 200) this.currentUser = data.user;
      else localStorage.removeItem('daqiapi_forum_token');
    },
    async loadCategories() {
      const { data } = await this.api('/api/forum/categories');
      this.categories = data.categories || [];
    },
    async routeChanged() {
      const { categoryId, topicId } = this.$route.params;
      this.error = '';
      if (topicId) return this.loadTopic(parseInt(topicId, 10), 1);
      if (categoryId) return this.loadCategory(parseInt(categoryId, 10), 1);
      this.mode = 'home';
    },
    async loadCategory(id, page) {
      this.mode = 'category';
      this.loading = true;
      try {
        const { data } = await this.api(`/api/forum/categories/${id}/topics?page=${page}`);
        this.categoryName = (this.categories.find((c) => c.id === id) || {}).name || 'Category';
        this.topics = data.topics || [];
        this.page = data.page || 1;
        this.pages = data.pages || 1;
      } catch (e) {
        this.error = 'Failed to load topics.';
      }
      this.loading = false;
    },
    async loadTopic(id, page) {
      this.mode = 'topic';
      this.loading = true;
      try {
        const { status, data } = await this.api(`/api/forum/topics/${id}?page=${page}`);
        if (status === 404) {
          this.error = 'Topic not found.';
          this.mode = 'home';
        } else {
          this.topic = data.topic || {};
          this.categoryName = this.topic.category ? this.topic.category.name : '';
          this.replies = data.replies || [];
          this.page = data.page || 1;
          this.pages = data.pages || 1;
        }
      } catch (e) {
        this.error = 'Failed to load topic.';
      }
      this.loading = false;
    },
    openCategory(c) {
      this.$router.push(`/forum/category/${c.id}`);
    },
    openTopic(t) {
      this.$router.push(`/forum/topic/${t.id}`);
    },
    goBackToCategory() {
      if (this.topic.category) this.$router.push(`/forum/category/${this.topic.category.id}`);
    },
    goTopicPage(p) {
      const { categoryId } = this.$route.params;
      this.loadCategory(parseInt(categoryId, 10), p);
    },
    goReplyPage(p) {
      const { topicId } = this.$route.params;
      this.loadTopic(parseInt(topicId, 10), p);
    },
    openAuth(mode) {
      this.authMode = mode;
      this.authMsg = '';
      this.authOpen = true;
    },
    closeModals() {
      this.authOpen = false;
      this.newTopicOpen = false;
      this.replyMsg = '';
      this.newTopicMsg = '';
    },
    async submitAuth() {
      this.authMsg = '';
      this.authBusy = true;
      try {
        const { status, data } = await this.api('/api/forum/' + (this.authMode === 'login' ? 'login' : 'register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.authForm),
        });
        if (status >= 400) {
          const msgs = {
            BAD_CREDENTIALS: 'Wrong username or password.',
            USERNAME_INVALID: 'Username must be 3-30 chars using letters, numbers, _ or -.',
            USERNAME_TAKEN: 'That username is already taken.',
            PASSWORD_LENGTH: 'Password must be at least 6 characters.',
          };
          this.authMsg = msgs[data.error] || 'Something went wrong.';
          return;
        }
        localStorage.setItem('daqiapi_forum_token', data.token);
        this.currentUser = data.user;
        this.authOpen = false;
        this.authForm = { username: '', password: '' };
      } catch (e) {
        this.authMsg = 'Network error. Try again.';
      } finally {
        this.authBusy = false;
      }
    },
    logout() {
      this.api('/api/forum/logout', { method: 'POST', headers: this.headers() });
      localStorage.removeItem('daqiapi_forum_token');
      this.currentUser = null;
    },
    openNewTopic() {
      this.newTopic.categoryId = this.newTopic.categoryId || (this.categories[0] && this.categories[0].id);
      this.newTopicMsg = '';
      this.newTopicOpen = true;
    },
    async submitNewTopic() {
      this.newTopicMsg = '';
      this.sending = true;
      try {
        const { status, data } = await this.api('/api/forum/topics', {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(this.newTopic),
        });
        if (status >= 400) {
          const msgs = {
            UNAUTHORIZED: 'Please sign in first.',
            SPAM: 'Your post looks like spam and was rejected.',
            RATE_LIMIT: 'You are posting too fast. Please wait a moment.',
            TITLE_LENGTH: 'Title must be between 3 and 120 characters.',
            CONTENT_LENGTH: 'Content must be between 2 and 4000 characters.',
            CATEGORY_NOT_FOUND: 'Please choose a category.',
          };
          this.newTopicMsg = msgs[data.error] || 'Failed to post.';
          return;
        }
        this.newTopicOpen = false;
        this.newTopic = { categoryId: null, title: '', content: '' };
        this.$router.push(`/forum/topic/${data.id}`);
      } catch (e) {
        this.newTopicMsg = 'Network error. Try again.';
      } finally {
        this.sending = false;
      }
    },
    async submitReply() {
      this.replyMsg = '';
      this.sending = true;
      try {
        const { status, data } = await this.api(`/api/forum/topics/${this.$route.params.topicId}/replies`, {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ content: this.replyContent }),
        });
        if (status >= 400) {
          const msgs = {
            UNAUTHORIZED: 'Please sign in first.',
            SPAM: 'Your reply looks like spam and was rejected.',
            RATE_LIMIT: 'You are posting too fast. Please wait a moment.',
            CONTENT_LENGTH: 'Reply must be between 2 and 4000 characters.',
            TOPIC_CLOSED: 'This topic is closed.',
          };
          this.replyMsg = msgs[data.error] || 'Failed to post reply.';
          return;
        }
        this.replyContent = '';
        const { topicId } = this.$route.params;
        const { data: fresh } = await this.api(`/api/forum/topics/${topicId}?page=1`);
        this.replies = fresh.replies || [];
        this.pages = fresh.pages || 1;
        this.page = fresh.page || 1;
      } catch (e) {
        this.replyMsg = 'Network error. Try again.';
      } finally {
        this.sending = false;
      }
    },
    async modTopic(action) {
      const { topicId } = this.$route.params;
      const { status } = await this.api(`/api/forum/admin/topics/${topicId}/${action}`, {
        method: 'POST',
        headers: this.headers(),
      });
      if (status === 200) {
        if (action === 'delete') {
          this.goBackToCategory();
        } else {
          this.loadTopic(parseInt(topicId, 10), this.page);
        }
      }
    },
    async modReply(id) {
      const { status } = await this.api(`/api/forum/admin/replies/${id}/delete`, {
        method: 'POST',
        headers: this.headers(),
      });
      if (status === 200) {
        const { topicId } = this.$route.params;
        this.loadTopic(parseInt(topicId, 10), this.page);
      }
    },
  },
};
</script>

<style scoped>
.forum-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.forum-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 14px;
}
.forum-breadcrumb a {
  color: var(--accent-2);
  cursor: pointer;
}
.crumb-sep {
  color: var(--muted);
}
.crumb-current {
  color: var(--text);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.forum-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-chip {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--text);
}
.user-chip.mod {
  border-color: var(--accent);
  color: var(--accent-2);
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 9px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.btn-ghost:hover {
  border-color: var(--accent);
  color: var(--accent-2);
}
.btn-ghost:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-sm {
  padding: 5px 10px;
  font-size: 12px;
}
.btn-danger:hover {
  border-color: #f87171;
  color: #f87171;
}
.btn-solid {
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  border: none;
  color: #fff;
  border-radius: 9px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
}
.btn-solid:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.forum-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 20px;
}
.forum-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
}
.forum-head {
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.forum-body {
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.15s ease;
}
.forum-body:last-child {
  border-bottom: none;
}
.forum-body:hover {
  background: var(--bg-soft);
}
.col-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.col-count {
  width: 70px;
  text-align: center;
  font-size: 14px;
  color: var(--muted);
}
.col-last {
  width: 210px;
  font-size: 13px;
  color: var(--muted);
}
.cat-ico {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}
.cat-name {
  color: var(--text);
  font-size: 15px;
  font-weight: 600;
}
.cat-name:hover {
  color: var(--accent-2);
}
.cat-desc {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}
.last-title {
  color: var(--muted);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.last-title:hover {
  color: var(--accent-2);
}
.last-time,
.last-author {
  font-size: 12px;
  margin-top: 2px;
}
.topic-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.topic-by {
  color: var(--muted);
  font-size: 12px;
  margin-top: 3px;
}
.pill {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border-radius: 5px;
  padding: 2px 6px;
}
.pill-pin {
  background: rgba(99, 102, 241, 0.2);
  color: var(--accent-2);
}
.pill-close {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}
.forum-empty {
  padding: 28px;
  text-align: center;
  color: var(--muted);
}
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  padding: 16px;
}
.pager-info {
  color: var(--muted);
  font-size: 13px;
}
.muted {
  color: var(--muted);
}
.thread-head {
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--border);
}
.thread-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.thread-title {
  margin: 0 0 6px;
  font-size: 21px;
  color: var(--text);
}
.thread-meta {
  color: var(--muted);
  font-size: 13px;
}
.thread-meta b {
  color: var(--text);
}
.mod-tools {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
.post {
  display: flex;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
}
.post-side {
  width: 90px;
  flex-shrink: 0;
  text-align: center;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 6px;
  font-size: 16px;
}
.post-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  word-break: break-all;
}
.post-time {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
.post-body {
  flex: 1;
  color: var(--text);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.reply-del {
  margin-left: 8px;
}
.reply-box {
  padding: 20px 22px;
}
.reply-title {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--text);
}
.accent-link {
  color: var(--accent-2);
  cursor: pointer;
}
.accent-link:hover {
  text-decoration: underline;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(6, 9, 18, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  width: 420px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.modal-title {
  margin: 0 0 4px;
  color: var(--text);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.modal-alt {
  font-size: 13px;
  color: var(--muted);
}
</style>
