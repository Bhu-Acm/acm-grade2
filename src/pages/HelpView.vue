<template>
  <main class="help-shell">
    <header class="help-hero">
      <div>
        <p class="eyebrow">FIELD MANUAL <span>// HELP</span></p>
        <h1>先自己想，再来提问。</h1>
        <p class="hero-copy">
          这里把注册、提问、排错、板子和训练复盘整理成一轮轮可以快速查阅的问答。
          需要原始图文或完整代码时，再打开底部资料。
        </p>
      </div>
      <div class="help-count">
        <strong>{{ posts.length }}</strong>
        <span>条问答 / {{ roundOptions.length }} 轮</span>
      </div>
    </header>

    <section class="help-layout">
      <aside class="help-index panel">
        <p class="eyebrow">ROUNDS</p>
        <button
          v-for="round in roundOptions"
          :key="round.value"
          class="help-round-button"
          :class="{ active: selectedRound === round.value }"
          @click="selectedRound = round.value"
        >
          <span>0{{ round.value }}</span>
          <strong>{{ round.label }}</strong>
          <small>{{ round.count }} 条</small>
        </button>
        <div class="help-index-note">
          <span class="live-dot"></span>
          内容来自仓库 `src/data/helpPosts.json`
        </div>
      </aside>

      <section class="help-content">
        <div class="panel-heading help-section-heading">
          <div>
            <p class="eyebrow">ROUND 0{{ selectedRound }}</p>
            <h2>{{ activeRoundLabel }}</h2>
          </div>
          <span class="rule-label">滚动阅读 / 独立思考</span>
        </div>

        <article v-for="(post, index) in activePosts" :key="post.id" class="help-card">
          <button class="help-question" @click="togglePost(post.id)">
            <span class="help-card-number">0{{ index + 1 }}</span>
            <span class="help-question-copy">
              <small>{{ post.category }}</small>
              <strong>{{ post.question }}</strong>
            </span>
            <span class="help-toggle" :class="{ open: expandedPosts.has(post.id) }">+</span>
          </button>
          <div v-if="expandedPosts.has(post.id)" class="help-answer">
            <p>{{ post.answer }}</p>
            <ol v-if="post.steps?.length">
              <li v-for="step in post.steps" :key="step">{{ step }}</li>
            </ol>
            <pre v-if="post.code"><code>{{ post.code }}</code></pre>
            <div v-if="post.tips?.length" class="help-tips">
              <strong>记住</strong>
              <span v-for="tip in post.tips" :key="tip">{{ tip }}</span>
            </div>
          </div>
        </article>
      </section>
    </section>

    <section class="help-resources panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">SOURCE MATERIALS</p>
          <h2>原始资料</h2>
        </div>
        <span class="rule-label">PDF / TEXT</span>
      </div>
      <div class="resource-grid">
        <a
          v-for="resource in resources"
          :key="resource.id"
          class="resource-card"
          :href="resource.path"
          target="_blank"
          rel="noreferrer"
        >
          <span class="resource-type">{{ resource.type }}</span>
          <strong>{{ resource.title }}</strong>
          <p>{{ resource.description }}</p>
          <span class="resource-link">打开资料 &gt;</span>
        </a>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDataStore } from '../data/store';

const data = useDataStore();
const posts = computed(() => [...data.helpPosts].sort((left, right) => left.round - right.round));
const resources = computed(() => data.helpResources);
const roundOptions = computed(() => {
  const rounds = new Map<number, { value: number; label: string; count: number }>();
  posts.value.forEach((post) => {
    const current = rounds.get(post.round);
    if (current) current.count += 1;
    else rounds.set(post.round, { value: post.round, label: post.category, count: 1 });
  });
  return [...rounds.values()];
});
const selectedRound = ref(1);
const expandedPosts = ref(new Set<string>());

const activePosts = computed(() => posts.value.filter((post) => post.round === selectedRound.value));
const activeRoundLabel = computed(() => roundOptions.value.find((round) => round.value === selectedRound.value)?.label ?? '帮助');

function togglePost(id: string) {
  const next = new Set(expandedPosts.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedPosts.value = next;
}
</script>
