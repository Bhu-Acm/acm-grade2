<template>
  <main class="access-shell">
    <section class="access-card">
      <p class="eyebrow">RESTRICTED AREA</p>
      <div class="access-mark">&gt;_</div>
      <h1>进入管理台</h1>
      <p class="muted">此入口用于维护学生资料、评分权重和仓库数据。</p>
      <form class="access-form" @submit.prevent="submit">
        <label>
          管理密码
          <input v-model="password" type="password" placeholder="输入管理密码" autofocus />
        </label>
        <button class="primary-button" type="submit">验证并进入</button>
      </form>
      <p v-if="message" class="form-message">{{ message }}</p>
      <RouterLink to="/" class="back-link">&lt; 返回公开排行榜</RouterLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { unlockAdmin } from '../adminAuth';

const router = useRouter();
const password = ref('');
const message = ref('');

async function submit() {
  if (!unlockAdmin(password.value)) {
    message.value = '密码不正确。';
    password.value = '';
    return;
  }
  await router.replace('/admin');
}
</script>
