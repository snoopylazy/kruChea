<template>
  <div>
    <router-view></router-view>
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #1f2937;
  /* darker gray for better contrast */
}

body {
  font-family: 'Noto', sans-serif;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #1f2937;
  /* dark gray text */
}

nav a.router-link-exact-active {
  color: #34D399;
  /* emerald-400 */
}
</style>
