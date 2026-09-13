<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">Daqi<span>API</span> <em>Admin</em></div>
      <nav class="side-nav">
        <button v-for="item in tabs" :key="item.key" class="side-item" :class="{ active: tab === item.key }" @click="switchTab(item.key)">
          {{ item.label }}
        </button>
      </nav>
      <div class="side-foot">
        <a class="side-link" href="/" target="_blank">View store &nearr;</a>
        <div class="side-user">{{ user.username }}<template v-if="user.is_super"> &middot; super</template></div>
        <button class="side-link" @click="logout">Sign out</button>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-head">
        <h1 class="admin-title">{{ currentTab.label }}</h1>
        <div v-if="msg" class="flash" :class="{ ok: msgOk }">{{ msg }}</div>
      </header>

      <!-- DASHBOARD -->
      <div v-if="tab === 'dashboard'">
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-num">{{ dash.orders ?? 0 }}</div><div class="stat-label">Orders</div></div>
          <div class="stat-card"><div class="stat-num">${{ (dash.revenue ?? 0).toFixed(2) }}</div><div class="stat-label">Revenue (paid/fulfilled)</div></div>
          <div class="stat-card"><div class="stat-num">{{ dash.products ?? 0 }}</div><div class="stat-label">Products live</div></div>
          <div class="stat-card"><div class="stat-num">{{ dash.pendingComments ?? 0 }}</div><div class="stat-label">Pending comments</div></div>
          <div class="stat-card"><div class="stat-num">{{ dash.forumTopics ?? 0 }}</div><div class="stat-label">Forum topics</div></div>
          <div class="stat-card"><div class="stat-num">{{ dash.forumReplies ?? 0 }}</div><div class="stat-label">Forum replies</div></div>
        </div>
        <h3 class="sub-title">Recent orders</h3>
        <div class="panel">
          <table class="tbl">
            <thead><tr><th>Order</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              <tr v-for="o in orders.slice(0, 8)" :key="o.id">
                <td class="mono">{{ o.id }}</td>
                <td>{{ o.packageName }}</td>
                <td>${{ o.amountUsd }}</td>
                <td><span class="badge-st" :class="o.status">{{ o.status }}</span></td>
                <td>{{ fmtTime(o.createdAt) }}</td>
              </tr>
              <tr v-if="!orders.length"><td colspan="5" class="empty-cell">No orders yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ORDERS -->
      <div v-if="tab === 'orders'">
        <div class="panel">
          <table class="tbl">
            <thead><tr><th>Order</th><th>Product</th><th>Category</th><th>Amount</th><th>Email</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              <tr v-for="o in orders" :key="o.id">
                <td class="mono">{{ o.id }}</td>
                <td>{{ o.packageName }}<span v-if="o.planKey" class="hint"> ({{ o.planKey }})</span></td>
                <td>{{ o.category || o.product }}</td>
                <td>${{ o.amountUsd }}</td>
                <td>{{ o.email || '-' }}</td>
                <td>
                  <select class="sel" :value="o.status" @change="setOrderStatus(o.id, $event.target.value)">
                    <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                  </select>
                </td>
                <td>{{ fmtTime(o.createdAt) }}</td>
              </tr>
              <tr v-if="!orders.length"><td colspan="7" class="empty-cell">No orders yet.</td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="selectedOrder" class="panel order-detail">
          <h3 class="sub-title">Order {{ selectedOrder.id }}</h3>
          <pre class="detail-pre">{{ JSON.stringify(selectedOrder, null, 2) }}</pre>
          <button class="btn-solid" @click="selectedOrder = null">Close</button>
        </div>
      </div>

      <!-- PRODUCTS -->
      <div v-if="tab === 'products'">
        <div v-for="group in productGroups" :key="group.key" class="panel product-group">
          <h3 class="sub-title">{{ groupLabel(group.key) }}</h3>
          <table class="tbl">
            <thead><tr><th>ID</th><th>Name</th><th>Base price</th><th>Override price</th><th>Live</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="p in group.items" :key="p.id">
                <td class="mono">{{ p.id }}</td>
                <td>{{ p.name }}</td>
                <td>${{ basePrice(p) }}</td>
                <td>
                  <input v-model="prodEdits[p.id].priceUsd" class="inp-sm" type="number" step="0.01" min="0" placeholder="default" />
                </td>
                <td>
                  <label class="switch">
                    <input type="checkbox" v-model="prodEdits[p.id].enabled" />
                    <span></span>
                  </label>
                </td>
                <td>
                  <button class="btn-ghost btn-sm" @click="saveProduct(p)">Save</button>
                  <button v-if="p.override" class="btn-ghost btn-sm" @click="clearProduct(p)">Reset</button>
                  <span v-if="p.priceOverride || (p.override && p.override.enabled === false)" class="pill-ov">OVERRIDE</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TOKENS -->
      <div v-if="tab === 'tokens'">
        <div class="panel">
          <table class="tbl">
            <thead><tr><th>ID</th><th>User</th><th>Name</th><th>Key</th><th>Status</th><th>Used / Quota</th><th>Created</th></tr></thead>
            <tbody>
              <tr v-for="t in tokens" :key="t.id">
                <td class="mono">{{ t.id }}</td>
                <td>{{ t.username || '-' }}</td>
                <td>{{ t.name || '-' }}</td>
                <td class="mono">{{ t.key }}</td>
                <td><span class="badge-st" :class="t.status === 1 ? 'fulfilled' : 'failed'">{{ t.status === 1 ? 'enabled' : 'disabled' }}</span></td>
                <td>{{ fmtQuota(t.usedQuota) }} / {{ t.unlimitedQuota ? 'unlimited' : fmtQuota(t.remainQuota) }}</td>
                <td>{{ fmtEpoch(t.createdTime) }}</td>
              </tr>
              <tr v-if="!tokens.length"><td colspan="7" class="empty-cell">No tokens yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CHANNELS -->
      <div v-if="tab === 'channels'">
        <div class="panel">
          <table class="tbl">
            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Balance</th><th>Priority</th><th>Models</th></tr></thead>
            <tbody>
              <tr v-for="c in channels" :key="c.id">
                <td class="mono">{{ c.id }}</td>
                <td>{{ c.name }}</td>
                <td>{{ c.type }}</td>
                <td><span class="badge-st" :class="c.status === 1 ? 'fulfilled' : 'failed'">{{ c.status === 1 ? 'enabled' : 'disabled' }}</span></td>
                <td>{{ c.balance }}</td>
                <td>{{ c.priority }}</td>
                <td class="row-title">{{ c.models }}</td>
              </tr>
              <tr v-if="!channels.length"><td colspan="7" class="empty-cell">No channels configured yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- USERS -->
      <div v-if="tab === 'users'">
        <div class="panel">
          <table class="tbl">
            <thead><tr><th>ID</th><th>Username</th><th>Display name</th><th>Role</th><th>Status</th><th>Quota used / total</th><th>Requests</th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td class="mono">{{ u.id }}</td>
                <td>{{ u.username }}</td>
                <td>{{ u.displayName || '-' }}</td>
                <td>{{ roleLabel(u.role) }}</td>
                <td><span class="badge-st" :class="u.status === 1 ? 'fulfilled' : 'failed'">{{ u.status === 1 ? 'active' : 'banned' }}</span></td>
                <td>{{ fmtQuota(u.usedQuota) }} / {{ fmtQuota(u.quota) }}</td>
                <td>{{ u.requestCount }}</td>
              </tr>
              <tr v-if="!users.length"><td colspan="7" class="empty-cell">No users yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- COMMENTS -->
      <div v-if="tab === 'comments'">
        <div class="toolbar">
          <button class="btn-ghost btn-sm" :class="{ active: commentFilter === 'all' }" @click="setCommentFilter('all')">All</button>
          <button class="btn-ghost btn-sm" :class="{ active: commentFilter === 'pending' }" @click="setCommentFilter('pending')">Pending ({{ dash.pendingComments ?? 0 }})</button>
        </div>
        <div class="panel">
          <div v-for="c in comments.comments" :key="c.id" class="admin-row">
            <div class="row-main">
              <div class="row-head">
                <b>{{ c.author }}</b>
                <span v-if="c.email" class="hint">{{ c.email }}</span>
                <span class="badge-st" :class="c.status">{{ c.status }}</span>
                <span class="hint">{{ fmtTime(c.createdAt) }}</span>
              </div>
              <div class="row-content">{{ c.content }}</div>
              <div v-if="c.reply" class="row-reply">Reply: {{ c.reply }}</div>
              <div class="row-actions">
                <button v-if="c.status !== 'approved'" class="btn-ghost btn-sm" @click="commentAction(c.id, 'approve')">Approve</button>
                <input v-model="replyMap[c.id]" class="inp-sm" placeholder="Reply (moderation)" @keyup.enter="commentAction(c.id, 'reply')" />
                <button class="btn-ghost btn-sm" @click="commentAction(c.id, 'reply')">Send</button>
                <button class="btn-ghost btn-sm btn-danger" @click="commentAction(c.id, 'delete')">Delete</button>
              </div>
            </div>
          </div>
          <div v-if="!comments.comments.length" class="empty-cell">No comments.</div>
        </div>
      </div>

      <!-- FORUM -->
      <div v-if="tab === 'forum'">
        <div class="toolbar">
          <button class="btn-ghost btn-sm" :class="{ active: forumSub === 'topics' }" @click="forumSub = 'topics'">Topics ({{ forumTopics.total }})</button>
          <button class="btn-ghost btn-sm" :class="{ active: forumSub === 'replies' }" @click="forumSub = 'replies'">Replies ({{ forumReplies.total }})</button>
        </div>
        <div v-if="forumSub === 'topics'" class="panel">
          <table class="tbl">
            <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Replies</th><th>Views</th><th>State</th><th>Actions</th></tr></thead>
            <tbody>
              <tr v-for="t in forumTopics.topics" :key="t.id">
                <td class="row-title">{{ t.title }}</td>
                <td>{{ t.category }}</td>
                <td>{{ t.author }}</td>
                <td>{{ t.replies }}</td>
                <td>{{ t.views }}</td>
                <td>
                  <span v-if="t.pinned" class="badge-st pinned">pinned</span>
                  <span v-if="t.closed" class="badge-st closed">closed</span>
                </td>
                <td>
                  <button class="btn-ghost btn-sm" @click="topicAction(t.id, t.pinned ? 'unpin' : 'pin')">{{ t.pinned ? 'Unpin' : 'Pin' }}</button>
                  <button class="btn-ghost btn-sm" @click="topicAction(t.id, t.closed ? 'open' : 'close')">{{ t.closed ? 'Open' : 'Close' }}</button>
                  <button class="btn-ghost btn-sm btn-danger" @click="topicAction(t.id, 'delete')">Delete</button>
                </td>
              </tr>
              <tr v-if="!forumTopics.topics.length"><td colspan="7" class="empty-cell">No topics.</td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="forumSub === 'replies'" class="panel">
          <table class="tbl">
            <thead><tr><th>Content</th><th>Topic</th><th>Author</th><th>Category</th><th>Date</th><th></th></tr></thead>
            <tbody>
              <tr v-for="r in forumReplies.replies" :key="r.id">
                <td class="row-title">{{ truncate(r.content, 80) }}</td>
                <td>{{ truncate(r.topicTitle, 40) }}</td>
                <td>{{ r.author }}</td>
                <td>{{ r.category }}</td>
                <td>{{ fmtTime(r.createdAt) }}</td>
                <td><button class="btn-ghost btn-sm btn-danger" @click="replyDelete(r.id)">Delete</button></td>
              </tr>
              <tr v-if="!forumReplies.replies.length"><td colspan="6" class="empty-cell">No replies.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  data() {
    return {
      token: '',
      user: {},
      tab: 'dashboard',
      tabs: [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'orders', label: 'Orders' },
        { key: 'products', label: 'Products' },
        { key: 'tokens', label: 'Tokens' },
        { key: 'channels', label: 'Channels' },
        { key: 'users', label: 'Users' },
        { key: 'comments', label: 'Comments' },
        { key: 'forum', label: 'Forum' },
      ],
      msg: '',
      msgOk: false,
      dash: {},
      orders: [],
      products: [],
      prodEdits: {},
      productGroups: [],
      comments: { comments: [], total: 0, page: 1, pages: 1 },
      commentFilter: 'all',
      replyMap: {},
      forumSub: 'topics',
      forumTopics: { topics: [], total: 0 },
      forumReplies: { replies: [], total: 0 },
      selectedOrder: null,
      statuses: ['pending', 'paid', 'fulfilled', 'failed', 'cancelled'],
      tokens: [],
      channels: [],
      users: [],
    };
  },
  computed: {
    currentTab() {
      return this.tabs.find((t) => t.key === this.tab) || this.tabs[0];
    },
  },
  async created() {
    this.token = sessionStorage.getItem('daqiapi_admin_token') || '';
    if (!this.token) return this.redirect();
    const me = await this.api('/api/admin/me');
    if (!me) return;
    this.user = me.user || {};
    await this.refresh();
  },
  methods: {
    redirect() {
      this.$router.replace('/wp-login.php');
    },
    headers() {
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      };
    },
    async api(url, opts = {}) {
      try {
        const res = await fetch(url, { ...opts, headers: { ...this.headers(), ...(opts.headers || {}) } });
        if (res.status === 401) {
          sessionStorage.removeItem('daqiapi_admin_token');
          this.redirect();
          return null;
        }
        const data = await res.json();
        return { status: res.status, data };
      } catch (e) {
        return null;
      }
    },
    async refresh() {
      if (this.tab === 'dashboard') await this.loadDashboard();
      if (this.tab === 'orders') await this.loadOrders();
      if (this.tab === 'products') await this.loadProducts();
      if (this.tab === 'tokens') await this.loadTokens();
      if (this.tab === 'channels') await this.loadChannels();
      if (this.tab === 'users') await this.loadUsers();
      if (this.tab === 'comments') await this.loadComments();
      if (this.tab === 'forum') await this.loadForum();
    },
    async switchTab(tab) {
      this.tab = tab;
      await this.refresh();
    },
    flash(msg, ok = false) {
      this.msg = msg;
      this.msgOk = ok;
      clearTimeout(this._ft);
      this._ft = setTimeout(() => (this.msg = ''), 3000);
    },
    async loadDashboard() {
      const r = await this.api('/api/admin/dashboard');
      if (r) this.dash = r.data;
      const o = await this.api('/api/admin/orders');
      if (o) this.orders = o.data.orders || [];
    },
    async loadOrders() {
      const r = await this.api('/api/admin/orders');
      if (r) this.orders = r.data.orders || [];
    },
    async setOrderStatus(id, status) {
      const r = await this.api(`/api/admin/orders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      if (r && r.status === 200) this.flash(`Order ${id} -> ${status}`, true);
      else this.flash('Failed to update order');
      await this.loadOrders();
    },
    async loadProducts() {
      const r = await this.api('/api/admin/products');
      if (!r) return;
      this.products = r.data.products || [];
      const groups = ['token', 'esim', 'vpn'];
      this.productGroups = groups
        .map((key) => ({ key, items: this.products.filter((p) => p.category === key) }))
        .filter((g) => g.items.length);
      const edits = {};
      this.products.forEach((p) => {
        edits[p.id] = {
          priceUsd: p.override && p.override.priceUsd !== null && p.override.priceUsd !== undefined ? p.override.priceUsd : '',
          enabled: p.override ? p.override.enabled !== false : true,
        };
      });
      this.prodEdits = edits;
    },
    basePrice(p) {
      if (p.priceOverride && p.override) return p.override.priceUsd;
      return p.priceUsd === null || p.priceUsd === undefined ? '-' : p.priceUsd;
    },
    groupLabel(key) {
      return { token: 'Token (API credits)', esim: 'eSIM plans', vpn: 'VPN plans' }[key] || key;
    },
    async loadTokens() {
      const r = await this.api('/api/admin/tokens');
      if (r) this.tokens = r.data.tokens || [];
    },
    async loadChannels() {
      const r = await this.api('/api/admin/channels');
      if (r) this.channels = r.data.channels || [];
    },
    async loadUsers() {
      const r = await this.api('/api/admin/users');
      if (r) this.users = r.data.users || [];
    },
    async saveProduct(p) {
      const edit = this.prodEdits[p.id];
      const priceUsd = edit.priceUsd === '' ? null : Number(edit.priceUsd);
      const r = await this.api(`/api/admin/products/${p.id}`, {
        method: 'POST',
        body: JSON.stringify({ priceUsd, enabled: edit.enabled }),
      });
      if (r && r.status === 200) this.flash(`Saved ${p.id}`, true);
      else this.flash('Failed to save (price must be > 0)');
      await this.loadProducts();
    },
    async clearProduct(p) {
      const r = await this.api(`/api/admin/products/${p.id}/override`, { method: 'DELETE' });
      if (r && r.status === 200) this.flash(`Reset ${p.id} to defaults`, true);
      await this.loadProducts();
    },
    async loadComments() {
      const page = this.commentFilter === 'pending' ? 1 : this.comments.page;
      const r = await this.api(`/api/admin/comments?page=${page}${this.commentFilter === 'pending' ? '&status=pending' : ''}`);
      if (r) this.comments = r.data;
    },
    setCommentFilter(f) {
      this.commentFilter = f;
      this.loadComments();
    },
    async commentAction(id, action) {
      const body = action === 'reply' ? JSON.stringify({ content: this.replyMap[id] || '' }) : undefined;
      const r = await this.api(`/api/admin/comments/${id}/${action}`, {
        method: 'POST',
        body,
      });
      if (r && r.status === 200) {
        this.flash(`Comment ${action} done`, true);
        if (action === 'reply') this.replyMap[id] = '';
      } else {
        this.flash('Action failed');
      }
      await this.loadComments();
      this.loadDashboard();
    },
    async loadForum() {
      const t = await this.api('/api/admin/forum/topics');
      if (t) this.forumTopics = t.data;
      const r = await this.api('/api/admin/forum/replies');
      if (r) this.forumReplies = r.data;
    },
    async topicAction(id, action) {
      const r = await this.api(`/api/admin/forum/topics/${id}/${action}`, { method: 'POST' });
      if (r && r.status === 200) this.flash(`Topic ${action} done`, true);
      else this.flash('Action failed');
      await this.loadForum();
      this.loadDashboard();
    },
    async replyDelete(id) {
      const r = await this.api(`/api/admin/forum/replies/${id}/delete`, { method: 'POST' });
      if (r && r.status === 200) this.flash('Reply deleted', true);
      await this.loadForum();
      this.loadDashboard();
    },
    logout() {
      this.api('/api/admin/logout', { method: 'POST' });
      sessionStorage.removeItem('daqiapi_admin_token');
      this.$router.replace('/wp-login.php');
    },
    fmtTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    truncate(s, n) {
      s = String(s || '');
      return s.length > n ? s.slice(0, n) + '...' : s;
    },
    fmtQuota(q) {
      if (q === null || q === undefined) return '0';
      if (q >= 1000000) return (q / 1000000).toFixed(1) + 'M';
      if (q >= 1000) return (q / 1000).toFixed(1) + 'K';
      return String(q);
    },
    fmtEpoch(ts) {
      if (!ts) return '-';
      const d = new Date(ts * 1000);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },
    roleLabel(role) {
      const roles = { 1: 'Common', 10: 'Admin', 100: 'Super Admin' };
      return roles[role] || String(role);
    },
  },
};
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-soft);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.side-logo {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  padding: 0 6px 18px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 14px;
}
.side-logo span {
  color: var(--accent-2);
}
.side-logo em {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  margin-left: 6px;
  letter-spacing: 0.06em;
}
.side-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.side-item {
  text-align: left;
  background: transparent;
  border: none;
  color: var(--muted);
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.side-item:hover {
  background: var(--card);
  color: var(--text);
}
.side-item.active {
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  color: #fff;
  font-weight: 600;
}
.side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.side-link {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  padding: 0 6px;
}
.side-link:hover {
  color: var(--accent-2);
}
.side-user {
  color: var(--text);
  font-size: 13px;
  padding: 0 6px;
}
.admin-main {
  flex: 1;
  padding: 24px 28px 40px;
  min-width: 0;
}
.admin-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.admin-title {
  margin: 0;
  font-size: 24px;
  color: var(--text);
}
.flash {
  background: var(--card);
  border: 1px solid var(--border);
  color: #f87171;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
}
.flash.ok {
  color: var(--green);
  border-color: var(--green);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px;
}
.stat-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
}
.stat-label {
  color: var(--muted);
  font-size: 12px;
  margin-top: 4px;
}
.sub-title {
  margin: 0 0 12px;
  font-size: 15px;
  color: var(--text);
}
.panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 18px;
  padding: 6px 0;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tbl th {
  text-align: left;
  color: var(--muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-soft);
}
.tbl td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
}
.tbl tr:last-child td {
  border-bottom: none;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.hint {
  color: var(--muted);
  font-size: 12px;
}
.row-title {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-cell {
  text-align: center;
  color: var(--muted);
  padding: 24px !important;
}
.badge-st {
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 8px;
  font-weight: 600;
}
.badge-st.pending {
  background: rgba(245, 158, 11, 0.18);
  color: #f59e0b;
}
.badge-st.paid {
  background: rgba(99, 102, 241, 0.18);
  color: var(--accent-2);
}
.badge-st.fulfilled {
  background: rgba(52, 211, 153, 0.15);
  color: var(--green);
}
.badge-st.failed {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}
.badge-st.cancelled {
  background: rgba(148, 163, 184, 0.15);
  color: var(--muted);
}
.badge-st.approved {
  background: rgba(52, 211, 153, 0.15);
  color: var(--green);
}
.badge-st.pinned {
  background: rgba(99, 102, 241, 0.18);
  color: var(--accent-2);
}
.badge-st.closed {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}
.sel {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
}
.inp-sm {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  width: 90px;
}
.inp-sm:focus {
  border-color: var(--accent);
  outline: none;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  margin-right: 4px;
}
.btn-ghost:hover {
  border-color: var(--accent);
  color: var(--accent-2);
}
.btn-ghost.active {
  border-color: var(--accent);
  color: var(--accent-2);
}
.btn-danger:hover {
  border-color: #f87171;
  color: #f87171;
}
.btn-solid {
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  border: none;
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
}
.pill-ov {
  font-size: 10px;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.18);
  color: #f59e0b;
  border-radius: 5px;
  padding: 2px 6px;
  margin-left: 6px;
}
.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 20px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch span {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 999px;
  transition: background 0.15s ease;
  cursor: pointer;
}
.switch span::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.15s ease;
}
.switch input:checked + span {
  background: var(--accent);
}
.switch input:checked + span::before {
  transform: translateX(18px);
}
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.admin-row {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.admin-row:last-child {
  border-bottom: none;
}
.row-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.row-content {
  color: var(--text);
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 8px;
}
.row-reply {
  background: var(--bg);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 8px;
}
.row-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.order-detail {
  padding: 14px 16px;
}
.detail-pre {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  overflow-x: auto;
  color: var(--muted);
  margin-bottom: 10px;
}
.product-group {
  padding: 6px 0;
}
</style>
