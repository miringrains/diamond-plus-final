import Mux from "@mux/mux-node"
import { sign } from "jsonwebtoken"

const tokenId = process.env.MUX_TOKEN_ID
const tokenSecret = process.env.MUX_TOKEN_SECRET

export const isMuxConfigured = Boolean(tokenId && tokenSecret)

export const mux = isMuxConfigured
  ? new Mux({ tokenId: tokenId as string, tokenSecret: tokenSecret as string })
  : (null as unknown as Mux)

export function requireMuxConfigured() {
  if (!isMuxConfigured) {
    throw new Error("Mux is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in env.")
  }
}

// Allow base64-encoded signing key via env for convenience
const signingKeyBase64 = process.env.MUX_SIGNING_KEY_BASE64
if (!process.env.MUX_SIGNING_KEY && signingKeyBase64) {
  try {
    const decoded = Buffer.from(signingKeyBase64, "base64").toString("utf8")
    process.env.MUX_SIGNING_KEY = decoded
    console.log("[Mux] Decoded signing key from base64, length:", decoded.length)
  } catch (e) {
    console.error("[Mux] Failed to decode signing key from base64:", e)
  }
}

/**
 * Creates a signed JWT token for Mux playback
 * @param playbackId - The Mux playback ID
 * @param options - Additional options for the token
 * @returns Signed JWT token
 */
export function createPlaybackToken(
  playbackId: string,
  options: {
    type?: "video" | "thumbnail" | "gif" | "storyboard"
    expiration?: number // Unix timestamp
    viewerId?: string
  } = {}
) {
  const signingKey = process.env.MUX_SIGNING_KEY
  const signingKeyId = process.env.MUX_SIGNING_KEY_ID
  
  if (!signingKey || !signingKeyId) {
    throw new Error("MUX_SIGNING_KEY and MUX_SIGNING_KEY_ID must be set for signed playback")
  }

  const ttl = parseInt(process.env.MUX_SIGNED_TTL_SECONDS || "3600", 10)
  const now = Math.floor(Date.now() / 1000)
  
  // Map type to Mux audience values
  const audienceMap: Record<string, string> = {
    "video": "v",
    "thumbnail": "t", 
    "gif": "g",
    "storyboard": "s"
  }
  const audience = audienceMap[options.type || "video"] || "v"
  
  const payload: Record<string, any> = {
    sub: playbackId,
    aud: audience,
    exp: options.expiration || now + ttl
  }

  // Add viewer_id as a top-level claim if provided
  if (options.viewerId) {
    payload.viewer_id = options.viewerId
  }

  // Sign with RS256 algorithm and include kid in header
  const token = sign(payload, signingKey, { 
    algorithm: "RS256",
    noTimestamp: true,
    keyid: signingKeyId // This puts 'kid' in the JWT header where Mux expects it
  })

  console.log("[Mux] Created playback token for:", {
    playbackId,
    kid: signingKeyId,
    aud: audience,
    exp: new Date(payload.exp * 1000).toISOString(),
    tokenLength: token.length
  })

  return token
}

/**
 * Check if signed playback is enabled
 */
export const isSignedPlaybackEnabled = () => {
  return process.env.MUX_SIGNED_PLAYBACK === "true"
}

/**
 * Get webhook secret for verifying webhook signatures
 */
export const getWebhookSecret = () => {
  return process.env.MUX_WEBHOOK_SECRET
}
