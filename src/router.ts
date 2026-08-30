import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './pages/HomeView.vue';
import AdminView from './pages/AdminView.vue';
import AdminAccessView from './pages/AdminAccessView.vue';
import { isAdminUnlocked } from './adminAuth';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/admin-access', component: AdminAccessView },
    {
      path: '/admin',
      component: AdminView,
      beforeEnter: () => (isAdminUnlocked() ? true : '/admin-access')
    }
  ]
});
