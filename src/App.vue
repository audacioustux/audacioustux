<template>
  <div class="frame grid">
    <article
      class="greeting mx-auto flex flex-col justify-center font-playfair_serif"
    >
      <h1>
        <span class="italic mr-2">Henlo!</span>
        <span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
      </h1>
      <p class="my-6">
        I'm Tanjim Hossain, a
        <span class="border-b-2 border-gray-300">Tehc Enthusiast</span><br />
        &amp; Co-Founder of
        <a href="https://nobinalo.com" target="_blank">Nobinālo</a>.
      </p>
      <nav class="h5">
        <span aria-hidden="true" class="mr-4">༼ つ ◕_◕ ༽つ</span>
        <ul
          class="uwuify inline-flex font-mono child-first:before:hidden child:before:mx-2"
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

<style lang="scss">
ul.uwuify {
  @apply list-none;
  & > li::before {
    content: "•ᴗ•";
  }
}
.child-first {
  &\:before {
    &\:hidden > :first-child::before {
      @apply hidden;
    }
  }
}
.child {
  &\:before {
    &\:mx-2 > ::before {
      @apply mx-2;
    }
  }
}
</style>
<style lang="scss" scoped>
.frame {
  @apply bg-rose-100 text-gray-700;
  min-height: min(100vh, 100vw);
}
.greeting {
  width: min(1408px, calc(80vw + 16px));
  font-size: clamp(0.875rem, 2vw, 3.8rem);
}
a {
  @apply border-b border-dashed border-current;
}
</style>
