<template>
  <div class="leaflet-control-layers leaflet-control">
    <button style="font-size: 20px" @click="go($event)">GO</button>
  </div>
</template>

<script>
export default {
  name: 'GoControl',
  props: {
  },
  methods: {
    go: function() {
      this.$emit('go')
    }
  }
}
</script>

<style>
</style>
