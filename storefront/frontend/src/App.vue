<template>
  <div>
    <nav class="nav">
      <div class="container nav-inner">
        <a class="logo" href="/">Daqi<span>API</span></a>
        <div class="nav-links">
          <a href="/#features">Features</a>
          <router-link to="/token">Token</router-link>
          <router-link to="/esim">eSIM</router-link>
          <router-link to="/vpn">VPN</router-link>
          <a href="/blog">Blog</a>
          <router-link to="/forum">Forum</router-link>
        </div>
        <a class="btn-nav" href="/#shop">Shop Now</a>
      </div>
    </nav>

    <router-view />

    <footer>
      <div class="container">
        &copy; 2026 DaqiAPI. All rights reserved. &middot; <a href="mailto:support@daqiapi.example">Contact</a> &middot;
        <router-link to="/token">Token</router-link> &middot;
        <router-link to="/esim">eSIM</router-link> &middot;
        <router-link to="/vpn">VPN</router-link> &middot;
        <a href="/blog">Blog</a> &middot;
        <router-link to="/forum">Forum</router-link>
      </div>
    </footer>
  </div>
</template>

<script>
export default {};
</script>
