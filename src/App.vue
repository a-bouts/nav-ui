<template>
  <div>
    <div class="modal" v-bind:class="{'is-active': !boat && boats && boats.length > 1}" style="z-index:4000">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">Choose your boat</p>
        </header>
        <section class="modal-card-body">
          <div class="tile is-vertical">
            <a class="tile is-child notification" v-for="b in boats" :key="b.name" @click="boat = b.name">
              <p class="title">{{b.name}}</p>
            </a>
          </div>
        </section>
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
    <Nav v-if="boat || !boats || boats.length <= 1" v-bind:debug="debug" v-bind:boat="boat"></Nav>
  </div>
</template>

<script>
import Nav from './components/Nav.vue'

import VConsole from 'vconsole'

export default {
  name: 'App',
  components: {
    Nav
  },
  data : function() {
    return {
      boat: null,
      boats: [],
      debug: false
    }
  },
  created: function() {
    this.boats = JSON.parse(localStorage.getItem("_boats_"))

    var it = this
    let uri = window.location.href.split('?');
    if (uri.length == 2)
    {
      let vars = uri[1].split('&');
      vars.forEach(function(v){
        if(v == 'debug') {
          new VConsole()
          it.debug = true
        } else {
          let kv = v.split('=')
          if(kv[0] == 'boat' && kv.length == 2) {
            it.boat = kv[1]
          }
        }
      });
    }

    if (Notification.permission === 'granted') {
      // show notification here
    } else {
      // request permission from user
      Notification.requestPermission().then(function(p) {
       if(p === 'granted') {
           // show notification here
       } else {
           console.log('User blocked notifications.');
       }
      }).catch(function(err) {
          console.error(err);
      });
    }
  },
}
</script>

<style>

body {
    margin: 0px;
}
</style>
