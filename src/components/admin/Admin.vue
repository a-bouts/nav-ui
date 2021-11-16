<template>
  <div>
    <section v-if="!display_name" class="hero is-danger">
      <div class="hero-head">
        <nav class="navbar">
          <div class="container">
            <div id="navbarMenuHeroA" class="navbar-menu">
              <div class="navbar-end">
                <span class="navbar-item">
                  <a class="button is-danger is-inverted mr-2" @click="login">
                    <span class="icon">
                      <i class="fab fa-mandalorian"></i>
                    </span>
                    <span>Login</span>
                  </a>
                </span>
              </div>
            </div>
          </div>
        </nav>
      </div>
      <div class="hero-body p-5" style="margin-top: -60px">
        <p class="subtitle">
          Cabine du capitaine
        </p>
        <p>
          Accès interdit aux femmes et aux lapins. Y accéder sans permission vous expose au supplice de la planche.
        </p>
      </div>
    </section>

    <div v-else>{{ display_name }}</div>
  </div>
</template>

<script>
export default {
  name: 'Admin',
  props: {
  },
  mounted() {
    console.log("mounted")
    fetch('/api/user/info')
      .then(response => {
        if(response.ok) {
          return response.json().then(json => this.display_name = json.data.display_name)
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
