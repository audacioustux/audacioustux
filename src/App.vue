<template>
  <div class="grid min-h-screen-min bg-rose-100 text-gray-700">
    <article
      class="greeting mx-auto flex flex-col justify-center font-playfair-serif"
    >
      <h1>
        <span class="italic mr-2/em">Henlo!</span>
        <span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
      </h1>
      <p class="leading-loose my-2/em">
        I'm Tanjim Hossain, a
        <span class="border-b-2 border-gray-300">Tehc Enthusiast</span><br />
        &amp; Co-Founder of
        <a href="https://nobinalo.com" target="_blank">Nobinālo</a>.
      </p>
      <nav class="h6 leading-8/em">
        <span aria-hidden="true" class="mr-4/em">༼ つ ◕_◕ ༽つ</span>
        <ul
          class="uwuify inline-flex font-mono children:first:before:hidden children:before:mx-2/em"
        >
          <li><a href="#">Blogs</a></li>
          <li><a href="#">Thoughts</a></li>
          <li><a href="#">Wall</a></li>
        </ul>
      </nav>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "App",
  components: {},
});
</script>

<style lang="scss" scoped>
ul.uwuify {
  @apply list-none;
  & > li::before {
    content: "•ᴗ•";
  }
}
.greeting {
  position: relative;
  width: min(1408px, calc(80vw + 1rem));
  font-size: clamp(0.875rem, 3vw, 3.8rem);
  &::before {
    pointer-events: none;
    position: absolute;
    width: 100%;
    height: 100%;
    content: " ";
    display: block;
    opacity: 0.04;
    background-image: url("assets/04.png");
    background-size: contain;
    background-position: center right;
    background-repeat: no-repeat;
  }
}
a {
  @apply border-b border-dashed border-current transition;
  @apply hover:border-solid hover:border-rose-500 hover:border-b-2;
}
</style>
