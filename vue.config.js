module.exports = {
  devServer: {
    // proxy: {
    //   '^/debug': {
    //     target: 'http://localhost:8888'
    //   },
    //   '^/winds': {
    //     target: 'http://localhost:8090'
    //   }
    // }
   proxy: 'https://nav.apps-k3s.no-cloud.fr'
  }
}
