import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import TokenView from './views/TokenView.vue';
import ESIMView from './views/ESIMView.vue';
import VPNView from './views/VPNView.vue';
import OrderView from './views/OrderView.vue';
import BlogView from './views/BlogView.vue';
import PostView from './views/PostView.vue';
import ForumView from './views/ForumView.vue';
import AdminLoginView from './views/AdminLoginView.vue';
import AdminView from './views/AdminView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/token', component: TokenView },
    { path: '/esim', component: ESIMView },
    { path: '/vpn', component: VPNView },
    { path: '/order/:id', component: OrderView },
    { path: '/blog', component: BlogView },
    { path: '/blog/:slug', component: PostView },
    { path: '/forum', component: ForumView },
    { path: '/forum/category/:categoryId', component: ForumView },
    { path: '/forum/topic/:topicId', component: ForumView },
    { path: '/admin/login', component: AdminLoginView },
    { path: '/admin', component: AdminView },
    { path: '/wp-login.php', component: AdminLoginView },
    { path: '/wp-admin', component: AdminView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
