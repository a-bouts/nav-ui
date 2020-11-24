<template>
  <div class="card-content">
    <div class="media">
      <div class="media-content">
        <p class="title">Status <button class="button" @click="refresh"><i class="fas fa-sync-alt"></i></button></p>
      </div>
    </div>
    <div class="content">
      <dl>
        <li>Router Server : {{ route.status }}</li>
        <li>Wind Server : {{ wind.status }}</li>
        <li>Polar Server : {{ polar.status }}</li>
        <li>UI Server : {{ ui.status }}</li>
      </dl>
    </div>
  </div>
</template>

<script>

export default {
  name: 'Status',
  props: {
    priv: Boolean
  },
  data: function() {
    return {
      route: {
        status: "Unknown"
      },
      wind: {
        status: "Unknown"
      },
      polar: {
        status: "Unknown"
      },
      ui: {
        status: "Unknown"
      }
    }
  },
  mounted: function() {
    this.refresh()
  },
  methods: {
    refresh: function() {
      this.$http.get('/-/healthz', {responseType: "json"}).then(response => {
        this.ui = response.body
      }, (error) => {
        console.log(error)
        this.ui = {
          status: "Failed",
          reason: error.statusText,
          code: error.status
        }
      })

      this.$http.get(this.priv ? '/private/nav/-/healthz' : '/debug/nav/-/healthz').then(response => {
        this.route = response.body
      }, (error) => {
        console.log(error)
        this.route = {
          status: "Failed",
          reason: error.statusText,
          code: error.status
        }
      })

      this.$http.get('/winds/-/healthz').then(response => {
        this.wind = response.body
      }, (error) => {
        console.log(error)
        this.wind = {
          status: "Failed",
          reason: error.statusText,
          code: error.status
        }
      })

      this.$http.get('/polars/-/healthz').then(response => {
        this.polar = response.body
      }, (error) => {
        console.log(error)
        this.polar = {
          status: "Failed",
          reason: error.statusText,
          code: error.status
        }
      })
    }
  }
}
</script>

<style>
</style>
