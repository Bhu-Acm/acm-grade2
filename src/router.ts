import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './pages/HomeView.vue';
import AdminView from './pages/AdminView.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/admin', component: AdminView }
  ]
});
