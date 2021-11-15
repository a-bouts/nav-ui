<template>
  <div>
    Cette section est protégée. Y accéder sans permission vous expose au supplice de la planche.

    <div v-if="display_name">{{ display_name }}</div>
    <div v-else><button class="button" @click="login">Login</button></div>
  </div>
</template>

<script>
export default {
  name: 'Admin',
  props: {
  },
  mounted() {
    fetch('/api/user/info')
      .then(response => {
        if(response.ok) {
          return response.json().then(json => this.display_name = json.display_name)
        }
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  },
  data: function() {
    return {
      display_name: null
    }
  },
  methods: {
    login() {
      window.location = "https://login.phtheirichthys.fr/?rd=" + encodeURIComponent(window.location) + "&rm=GET"
    }
  }
}
</script>

<style>
</style>
