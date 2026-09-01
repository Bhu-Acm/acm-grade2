import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './pages/HomeView.vue';
import AdminView from './pages/AdminView.vue';
import AdminAccessView from './pages/AdminAccessView.vue';
import HelpView from './pages/HelpView.vue';
import { isAdminUnlocked } from './adminAuth';

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView },
    { path: '/help', component: HelpView },
    { path: '/admin-access', component: AdminAccessView },
    {
      path: '/admin',
      component: AdminView,
      beforeEnter: () => (isAdminUnlocked() ? true : '/admin-access')
    }
  ]
});
