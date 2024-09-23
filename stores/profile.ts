import { defineStore } from 'pinia'
import axios from 'axios'
import Cookies from 'js-cookie'
const { setToken } = useAuthState()
const router = useRouter()

export const useProfileStore = defineStore('profiles', {
  state: () => ({}),
  getters: {},
  actions: {},
})
