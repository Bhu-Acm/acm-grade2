<template>
  <div class="app-frame">
    <header class="topbar">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">&gt;_</span>
        <span>
          <strong>ACM GRADE</strong>
          <small>新生训练系统</small>
        </span>
      </RouterLink>
      <nav class="topnav">
        <RouterLink to="/">排行榜</RouterLink>
        <RouterLink to="/admin">管理台</RouterLink>
      </nav>
    </header>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>
