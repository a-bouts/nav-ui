<template>
  <div>
    <label>Experiments</label>
    <div v-for="(value, expe) in expes" :key="expe">
      <label class="checkbox">
        <input type="checkbox" :checked="value" @change="save(expe, !value)">
        {{ expe }}
      </label>
    </div>
  </div>
</template>

<script>
import {EventBus} from '../event-bus.js';

export default {
  name: 'Expes',
  props: {
    debug: Boolean,
    priv: Boolean
  },
  data: function() {
    return {
      expes: {}
    }
  },
  mounted: function() {
    const it = this
    this.expes = JSON.parse(localStorage.getItem("_expes_"))
    var url = '/debug/nav/expes'
    if (this.priv) {
      url = '/private/nav/expes'
    }
    this.$http.get(url).then(response => {
      const expes = {}
      response.body.forEach(expe => {
        expes[expe] = false
        if (it.expes && it.expes[expe])
          expes[expe] = true
      });
      it.expes = expes
      if (it.debug) {
        EventBus.$emit('expes', it.expes)
      }
    })
  },
  methods: {
    save(expe, value) {
      this.expes[expe] = value
      localStorage.setItem("_expes_", JSON.stringify(this.expes))
      if (this.debug) {
        EventBus.$emit('expes', this.expes)
      }
    }
  }
}
</script>

<style scoped>
</style>
