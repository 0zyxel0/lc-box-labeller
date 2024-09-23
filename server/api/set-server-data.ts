import axios from 'axios'
import * as dotenv from 'dotenv'
import { defineEventHandler, H3Event, parseCookies, setCookie } from 'h3'

dotenv.config()
const NOCODB_BASEURL = process.env.NOCODB_BASEURL
const NOCODB_APIKEY = process.env.NOCODB_APIKEY

export default defineEventHandler(async (event) => {
  try {
    // Value you want to store in the cookie
    const cookieValue = `base=${NOCODB_BASEURL};plk=${NOCODB_APIKEY}`

    // Set the cookie
    setCookie(event, 'myCookie', cookieValue, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })

    return { message: 'Cookie has been set!' }
  } catch (err) {
    console.log(err)
  }
})
