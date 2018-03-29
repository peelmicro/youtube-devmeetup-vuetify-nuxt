import Vuex from 'vuex'
import firebase from 'firebase'

const createStore = () => {
  return new Vuex.Store({
    state: {
      loadedMeetups: [],
      user: null,
      loading: false,
      authError: null
    },
    mutations: {
      setLoadedMeetups (state, payload) {
        state.loadedMeetups = payload
      },
      createMeetup (state, payload) {
        state.loadedMeetups.push(payload)
      },
      updateMeetupData (state, payload) {
        const meetup = state.loadedMeetups.find(meetup => {
          return meetup.id === payload.id
        })
        if (payload.title) {
          meetup.title = payload.title
        }
        if (payload.description) {
          meetup.description = payload.description
        }
        if (payload.date) {
          meetup.date = payload.date
        }
      },
      setUser (state, payload) {
        state.user = payload
      },
      setLoading (state, payload) {
        state.loading = payload
      },
      setAuthError (state, payload) {
        state.authError = payload
      },
      clearAuthError (state) {
        state.authError = null
      }
    },
    actions: {
      loadMeetups ({ commit }) {
        commit('setLoading', true)
        firebase.database().ref('meetups').once('value')
          .then((data) => {
            const meetups = []
            const obj = data.val()
            for (let key in obj) {
              meetups.push({
                id: key,
                title: obj[key].title,
                location: obj[key].location,
                imageUrl: obj[key].imageUrl,
                description: obj[key].description,
                date: obj[key].date,
                creatorId: obj[key].creatorId
              })
            }
            commit('setLoadedMeetups', meetups)
            commit('setLoading', false)
          })
          .catch((error) => {
            commit('setLoading', false)
            console.log(error)
          })
      },
      createMeetup ({ commit, getters }, payload) {
        const meetup = {
          title: payload.title,
          location: payload.location,
          description: payload.description,
          date: payload.date.toISOString(),
          creatorId: getters.user.id
        }
        let imageUrl
        let key
        firebase.database().ref('meetups').push(meetup)
          .then((data) => {
            key = data.key
            return key
          })
          .then(key => {
            const filename = payload.image.name
            const ext = filename.slice(filename.lastIndexOf('.'))
            return firebase.storage().ref('meetups/' + key + '.' + ext).put(payload.image)
          })
          .then(fileData => {
            imageUrl = fileData.metadata.downloadURLs[0]
            return firebase.database().ref('meetups').child(key).update({imageUrl})
          })
          .then(() => {
            commit('createMeetup', { ...meetup, imageUrl, id: key })
          })
          .catch((error) => {
            console.log(error)
          })
      },
      updateMeetupData ({commit}, payload) {
        commit('setLoading', true)
        const updateObj = {}
        if (payload.title) {
          updateObj.title = payload.title
        }
        if (payload.description) {
          updateObj.description = payload.description
        }
        if (payload.date) {
          updateObj.date = payload.date
        }
        firebase.database().ref('meetups').child(payload.id).update(updateObj)
          .then(() => {
            commit('setLoading', false)
            commit('updateMeetupData', payload)
          })
          .catch(
            error => {
              commit('setLoading', false)
              console.log(error)
            }
          )
      },
      signUserUp ({ commit }, payload) {
        commit('setLoading', true)
        commit('clearAuthError')
        firebase.auth().createUserWithEmailAndPassword(payload.email, payload.password)
          .then(
            user => {
              commit('setLoading', false)
              const newUser = {
                id: user.id,
                registeredMeetups: []
              }
              commit('setUser', newUser)
            }
          )
          .catch(
            error => {
              commit('setLoading', false)
              commit('setAuthError', error)
            }
          )
      },
      signUserIn ({ commit }, payload) {
        commit('setLoading', true)
        commit('clearAuthError')
        firebase.auth().signInWithEmailAndPassword(payload.email, payload.password)
          .then(
            user => {
              commit('setLoading', false)
              const newUser = {
                id: user.id,
                registeredMeetups: []
              }
              commit('setUser', newUser)
            }
          )
          .catch(
            error => {
              commit('setLoading', false)
              commit('setAuthError', error)
            }
          )
      },
      autoSignIn ({ commit }, payload) {
        commit('setUser', {id: payload.uid, registeredMeetups: []})
      },
      logout ({ commit }) {
        firebase.auth().signOut()
        commit('setUser', null)
      },
      clearAuthError ({ commit }) {
        commit('clearAuthError')
      }
    },
    getters: {
      loadedMeetups (state) {
        return state.loadedMeetups.sort((meetupA, meetupB) => {
          return meetupA.date > meetupB.date
        })
      },
      featuredMeetups (state, getters) {
        return getters.loadedMeetups.slice(0, 5)
      },
      loadedMeetup (state) {
        return meetupId => {
          return state.loadedMeetups.find(meetup => {
            return meetup.id === meetupId
          })
        }
      },
      user (state) {
        return state.user
      },
      authError (state) {
        return state.authError
      },
      loading (state) {
        return state.loading
      }
    }
  })
}

export default createStore
