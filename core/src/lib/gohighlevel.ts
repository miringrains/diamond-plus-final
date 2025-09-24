/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import { env } from "@/lib/env"

// GoHighLevel API v2 Base URL for private integrations
const GHL_API_BASE = "https://services.leadconnectorhq.com"
const FREE_COURSE_TAG_NAME = "course-signup"
const DIAMOND_MEMBER_TAG_NAME = "watch-diamond-member"

interface GHLContact {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  tags?: string[]
  locationId?: string
}

interface GHLTag {
  id: string
  name: string
}

export class GoHighLevelService {
  private privateKey: string
  private locationId: string
  private freeCoursTagId: string | null = null
  private diamondMemberTagId: string | null = null

  constructor() {
    this.privateKey = env.GHL_PRIVATE_KEY
    this.locationId = env.GHL_LOCATION_ID
  }

  /**
   * Get default headers for all GHL API requests
   */
  private getHeaders() {
    return {
      Authorization: `Bearer ${this.privateKey}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28", // Required for v2 API
    }
  }

  /**
   * Get or create a tag by name
   */
  private async ensureTag(tagName: string, tagIdField: 'freeCoursTagId' | 'diamondMemberTagId'): Promise<string> {
    if (this[tagIdField]) {
      return this[tagIdField]!
    }

    try {
      // Get all tags for the location
      const tagsResponse = await axios.get(
        `${GHL_API_BASE}/locations/${this.locationId}/tags`,
        {
          headers: this.getHeaders(),
        }
      )

      const existingTag = tagsResponse.data.tags?.find(
        (tag: GHLTag) => tag.name.toLowerCase() === tagName.toLowerCase()
      )

      if (existingTag) {
        this[tagIdField] = existingTag.id
        console.log(`[GHL] Using existing tag "${tagName}" ID: ${existingTag.id}`)
        return existingTag.id
      }

      // If tag doesn't exist, create it
      console.log(`[GHL] Creating new tag: ${tagName}`)
      const createTagResponse = await axios.post(
        `${GHL_API_BASE}/locations/${this.locationId}/tags`,
        {
          name: tagName,
        },
        {
          headers: this.getHeaders(),
        }
      )

      this[tagIdField] = createTagResponse.data.tag.id
      console.log(`[GHL] Created tag "${tagName}" with ID: ${this[tagIdField]}`)
      return this[tagIdField]!
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`[GHL] Error managing tag "${tagName}":`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw new Error(`Failed to manage tag "${tagName}": ${error.response?.data?.message || error.message}`)
      } else {
        console.error(`[GHL] Error managing tag "${tagName}":`, error)
        throw new Error(`Failed to manage tag "${tagName}" in GoHighLevel`)
      }
    }
  }

  /**
   * Get or create the "course-signup" tag
   */
  private async ensureFreeCoursTag(): Promise<string> {
    return this.ensureTag(FREE_COURSE_TAG_NAME, 'freeCoursTagId')
  }

  /**
   * Get or create the "watch-diamond-member" tag
   */
  private async ensureDiamondMemberTag(): Promise<string> {
    return this.ensureTag(DIAMOND_MEMBER_TAG_NAME, 'diamondMemberTagId')
  }

  /**
   * Search for a contact by email in the specific location
   */
  async searchContactByEmail(email: string): Promise<GHLContact | null> {
    try {
      console.log(`[GHL] Searching for contact: ${email}`)
      
      // Using the v2 contacts endpoint with query parameter
      const response = await axios.get(`${GHL_API_BASE}/contacts/`, {
        headers: this.getHeaders(),
        params: {
          locationId: this.locationId,
          query: email,
          limit: 10,
        },
      })

      console.log(`[GHL] Search response status: ${response.status}`)
      console.log(`[GHL] Total contacts found: ${response.data.contacts?.length || 0}`)

      const contacts = response.data.contacts || []
      
      // Find exact email match
      const contact = contacts.find((c: GHLContact) => c.email === email)
      
      if (contact) {
        console.log(`[GHL] Found exact match for ${email}:`, {
          id: contact.id,
          tags: contact.tags?.length || 0
        })
        
        return {
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          tags: contact.tags || [],
        }
      } else {
        console.log(`[GHL] No exact match found for ${email}`)
        return null
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[GHL] Error searching contact:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.config?.headers,
          url: error.config?.url
        })
        
        // Provide more specific error message
        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message
        throw new Error(`GoHighLevel search failed: ${errorMessage}`)
      } else {
        console.error("[GHL] Error searching contact:", error)
        throw new Error("Failed to search contact in GoHighLevel")
      }
    }
  }

  /**
   * Create a new contact with the course-signup and watch-diamond-member tags
   */
  async createContact(data: {
    email: string
    firstName?: string
    lastName?: string
    phone?: string
  }): Promise<GHLContact> {
    try {
      console.log(`[GHL] Creating contact: ${data.email}`)

      const contactData: any = {
        locationId: this.locationId,
        email: data.email,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        // Use tag names instead of IDs - GHL API accepts both
        tags: [FREE_COURSE_TAG_NAME, DIAMOND_MEMBER_TAG_NAME],
      }

      // Add phone if provided
      if (data.phone) {
        contactData.phone = data.phone
      }

      const response = await axios.post(
        `${GHL_API_BASE}/contacts/`,
        contactData,
        {
          headers: this.getHeaders(),
        }
      )

      console.log(`[GHL] Contact created successfully:`, {
        id: response.data.contact.id,
        email: response.data.contact.email,
        tags: response.data.contact.tags
      })

      return {
        id: response.data.contact.id,
        email: response.data.contact.email,
        firstName: response.data.contact.firstName,
        lastName: response.data.contact.lastName,
        phone: response.data.contact.phone,
        tags: response.data.contact.tags || [],
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[GHL] Error creating contact:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        
        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message
        throw new Error(`Failed to create contact: ${errorMessage}`)
      } else {
        console.error("[GHL] Error creating contact:", error)
        throw new Error("Failed to create contact in GoHighLevel")
      }
    }
  }

  /**
   * Add the course-signup tag to an existing contact
   */
  async addFreeCoursTagToContact(contactId: string): Promise<void> {
    try {
      console.log(`[GHL] Adding free course tag to contact ${contactId}`)

      // Update contact with the tag name
      await axios.put(
        `${GHL_API_BASE}/contacts/${contactId}`,
        {
          tags: [FREE_COURSE_TAG_NAME], // Use tag name
        },
        {
          headers: this.getHeaders(),
        }
      )
      
      console.log(`[GHL] Free course tag added successfully to contact ${contactId}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[GHL] Error adding free course tag to contact:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        
        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message
        throw new Error(`Failed to add free course tag: ${errorMessage}`)
      } else {
        console.error("[GHL] Error adding free course tag to contact:", error)
        throw new Error("Failed to add free course tag to contact")
      }
    }
  }

  /**
   * Add the watch-diamond-member tag to an existing contact
   */
  async addDiamondMemberTagToContact(contactId: string): Promise<void> {
    try {
      console.log(`[GHL] Adding diamond member tag to contact ${contactId}`)

      // Update contact with the tag name
      await axios.put(
        `${GHL_API_BASE}/contacts/${contactId}`,
        {
          tags: [DIAMOND_MEMBER_TAG_NAME], // Use tag name
        },
        {
          headers: this.getHeaders(),
        }
      )
      
      console.log(`[GHL] Diamond member tag added successfully to contact ${contactId}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[GHL] Error adding diamond member tag to contact:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        
        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message
        throw new Error(`Failed to add diamond member tag: ${errorMessage}`)
      } else {
        console.error("[GHL] Error adding diamond member tag to contact:", error)
        throw new Error("Failed to add diamond member tag to contact")
      }
    }
  }

  /**
   * Add both tags to an existing contact
   */
  async addAllTagsToContact(contactId: string): Promise<void> {
    try {
      console.log(`[GHL] Adding both tags to contact ${contactId}`)

      // Update contact with both tag names
      await axios.put(
        `${GHL_API_BASE}/contacts/${contactId}`,
        {
          tags: [FREE_COURSE_TAG_NAME, DIAMOND_MEMBER_TAG_NAME], // Use tag names
        },
        {
          headers: this.getHeaders(),
        }
      )
      
      console.log(`[GHL] Both tags added successfully to contact ${contactId}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[GHL] Error adding tags to contact:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        
        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message
        throw new Error(`Failed to add tags: ${errorMessage}`)
      } else {
        console.error("[GHL] Error adding tags to contact:", error)
        throw new Error("Failed to add tags to contact")
      }
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, data: {
    firstName?: string
    lastName?: string
    phone?: string
  }): Promise<void> {
    try {
      const updateData: Record<string, string> = {}
      
      if (data.firstName !== undefined) updateData.firstName = data.firstName
      if (data.lastName !== undefined) updateData.lastName = data.lastName
      if (data.phone !== undefined) updateData.phone = data.phone

      console.log(`[GHL] Updating contact ${contactId}:`, updateData)

      await axios.put(
        `${GHL_API_BASE}/contacts/${contactId}`,
        updateData,
        {
          headers: this.getHeaders(),
        }
      )
      
      console.log(`[GHL] Contact ${contactId} updated successfully`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("[GHL] Error updating contact:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        
        const errorMessage = error.response?.data?.message || error.response?.statusText || error.message
        throw new Error(`Failed to update contact: ${errorMessage}`)
      } else {
        console.error("[GHL] Error updating contact:", error)
        throw new Error("Failed to update contact in GoHighLevel")
      }
    }
  }

  /**
   * Check if contact has the course-signup tag
   */
  async hasFreeCoursTag(contact: GHLContact): Promise<boolean> {
    // Check by tag name or tag ID (case-insensitive)
    const tagId = await this.ensureFreeCoursTag()
    const hasTag = contact.tags?.some(tag => 
      tag === FREE_COURSE_TAG_NAME || 
      tag.toLowerCase() === tagId.toLowerCase() ||
      tag.toLowerCase() === FREE_COURSE_TAG_NAME.toLowerCase()
    ) || false
    
    console.log(`[GHL] Contact ${contact.id} has course-signup tag: ${hasTag}`)
    return hasTag
  }

  /**
   * Check if contact has the watch-diamond-member tag
   */
  async hasDiamondMemberTag(contact: GHLContact): Promise<boolean> {
    // Check by tag name or tag ID (case-insensitive)
    const tagId = await this.ensureDiamondMemberTag()
    const hasTag = contact.tags?.some(tag => 
      tag === DIAMOND_MEMBER_TAG_NAME || 
      tag.toLowerCase() === tagId.toLowerCase() ||
      tag.toLowerCase() === DIAMOND_MEMBER_TAG_NAME.toLowerCase()
    ) || false
    
    console.log(`[GHL] Contact ${contact.id} has watch-diamond-member tag: ${hasTag}`)
    return hasTag
  }

  /**
   * Check if contact has both required tags
   */
  async hasBothTags(contact: GHLContact): Promise<{ freeCoursTag: boolean; diamondMemberTag: boolean }> {
    const [hasFreeCoursTag, hasDiamondMemberTag] = await Promise.all([
      this.hasFreeCoursTag(contact),
      this.hasDiamondMemberTag(contact)
    ])
    
    return { 
      freeCoursTag: hasFreeCoursTag, 
      diamondMemberTag: hasDiamondMemberTag 
    }
  }
}

export const ghlService = new GoHighLevelService()