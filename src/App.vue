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
        <RouterLink to="/help">帮助</RouterLink>
        <RouterLink to="/admin">管理台</RouterLink>
      </nav>
    </header>
    <RouterView />
    <footer class="site-footer">
      <span>ACM GRADE 2 / 数据与帮助内容由 GitHub 仓库维护</span>
      <a :href="githubRepositoryUrl" target="_blank" rel="noreferrer">
        github.com/{{ githubConfig.owner }}/{{ githubConfig.repo }} &gt;
      </a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { githubConfig } from './services/github';

const githubRepositoryUrl = githubConfig.repositoryUrl;
</script>
