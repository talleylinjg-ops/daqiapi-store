<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">Daqi<span>API</span> <em>Admin</em></div>
      <p class="login-sub">Store management console</p>
      <form @submit.prevent="submit">
        <input v-model="username" class="input" placeholder="Username" autocomplete="username" />
        <input v-model="password" class="input" type="password" placeholder="Password" autocomplete="current-password" />
        <div class="form-msg">{{ msg }}</div>
        <button class="btn-solid login-btn" type="submit" :disabled="busy">{{ busy ? 'Signing in...' : 'Sign in' }}</button>
      </form>
      <a class="back-link" href="/">&larr; Back to store</a>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { username: '', password: '', msg: '', busy: false };
  },
  methods: {
    async submit() {
      this.msg = '';
      this.busy = true;
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.username, password: this.password }),
        });
        const data = await res.json();
        if (res.status >= 400) {
          this.msg = data.error === 'LOCKED' ? 'Too many attempts. Try again in 15 minutes.' : 'Wrong username or password.';
          return;
        }
        sessionStorage.setItem('daqiapi_admin_token', data.token);
        this.$router.push('/admin');
      } catch (e) {
        this.msg = 'Network error. Try again.';
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(600px 300px at 20% 0%, rgba(99, 102, 241, 0.12), transparent),
    var(--bg);
  padding: 20px;
}
.login-card {
  width: 380px;
  max-width: 100%;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.login-logo {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
}
.login-logo span {
  color: var(--accent-2);
}
.login-logo em {
  font-style: normal;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  margin-left: 8px;
  letter-spacing: 0.06em;
}
.login-sub {
  color: var(--muted);
  font-size: 14px;
  margin: -6px 0 2px;
}
.login-btn {
  width: 100%;
  padding: 11px;
  font-size: 15px;
}
.back-link {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}
.back-link:hover {
  color: var(--accent-2);
}
</style>
