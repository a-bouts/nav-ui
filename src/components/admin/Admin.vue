<template>
  <div class="container">
    <section v-if="connected" class="hero is-danger">
      <div class="hero-body p-5">
        <div class="columns is-vcentered is-mobile">
          <div class="column">
            <p class="subtitle">
              Cabine du capitaine
            </p>
            <p>
              Accès interdit aux femmes et aux lapins. Y accéder sans permission vous expose au supplice de la planche.
            </p>
          </div>
          <div class="column is-narrow">
            <a class="button is-danger is-inverted mr-2" @click="login">
              <span class="icon">
                <i class="fab fa-mandalorian"></i>
              </span>
              <span>Login</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <div v-else>
      <div class="tabs is-boxed is-centered">
        <ul>
          <li :class="{'is-active': tab == 'races'}"><a @click="displayRaces">Races</a></li>
          <li :class="{'is-active': tab == 'polars'}"><a @click="displayPolars">Polars</a></li>
        </ul>
      </div>
      <div v-show="tab == 'races'">
        <Races ref="races" v-on:disconnected="disconnected" />
      </div>
      <div v-show="tab == 'polars'" style="overflow-x:scroll;">
        <Polars ref="polars" v-on:disconnected="disconnected" />
      </div>
    </div>
  </div>
</template>

<script>
import Races from './Races.vue'
import Polars from './Polars.vue'

export default {
  name: 'Admin',
  components: {
    Races,
    Polars
  },
  props: {
  },
  mounted() {
    console.log("mounted")
    fetch('/api/user/info')
      .then(response => {
        if(response.ok) {
          return response.json().then(json => {
            this.display_name = json.data.display_name
            this.connected = true
          })
        }
      })
      .catch((error) => {
        console.error('Error:', error)
      })
  },
  data: function() {
    return {
      connected: false,
      display_name: null,
      tab: "races",
    }
  },
  methods: {
    refresh() {
      this.$refs.races.refresh()
      this.$refs.polars.refresh()
    },
    login() {
      window.location = "https://login.phtheirichthys.fr/?rd=" + encodeURIComponent(window.location) + "&rm=GET"
    },
    disconnected() {
      console.log("The user is not connected")
      this.connected = false
    },
    displayRaces() {
      this.tab = "races"
    },
    displayPolars() {
      this.tab = "polars"
    },
  }
}
</script>

<style>
</style>
