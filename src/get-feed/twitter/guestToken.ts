import { fetch } from "@tauri-apps/api/http";

import { AUTHORIZATION } from "./constants";

export let currentGuestToken: string = await newGuestToken();

/**
 * get "x-guest-token" for subsequent requests
 * @returns guest token
 */
export async function newGuestToken(): Promise<string> {

  const obj: any = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
    "method": "POST",
    // "credentials": "omit",
    "headers": {
      "authorization": AUTHORIZATION,
    },
  }).then(r => r.data)
    .catch(() => {
      console.log("Error fetching guest token");
      return ""
    });
  return obj?.guest_token;
}
