import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    credits: 0,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    setAuth(token: string, user: any) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    setCredits(val: number) {
      this.credits = val
    },
    logout() {
      this.token = ''
      this.user = null
      this.credits = 0
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
