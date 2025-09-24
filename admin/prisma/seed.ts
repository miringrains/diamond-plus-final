import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Check if admin already exists
  const existingAdmin = await prisma.users.findFirst({
    where: { role: 'ADMIN' }
  })

  if (existingAdmin) {
    console.log('✅ Admin already exists, skipping...')
    return
  }

  // Get admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@diamonddistrict.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#'
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'System'
  const adminLastName = process.env.ADMIN_LAST_NAME || 'Administrator'
  const adminPhone = process.env.ADMIN_PHONE || '+1234567890'

  // Check if this email already exists as a regular user
  const existingUser = await prisma.users.findUnique({
    where: { email: adminEmail }
  })

  if (existingUser) {
    console.log('⚠️  User with admin email already exists. Updating role to ADMIN...')
    await prisma.users.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN' }
    })
    console.log('✅ Updated existing user to ADMIN role')
    return
  }

  // Create admin user
  const hashedPassword = await hash(adminPassword, 12)
  
  const admin = await prisma.users.create({
    data: {
      id: randomUUID(),
      email: adminEmail,
      password: hashedPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'ADMIN',
      emailVerified: new Date(), // Auto-verify admin
      updatedAt: new Date(),
    }
  })

  console.log('✅ Admin account created:')
  console.log(`   Email: ${admin.email}`)
  console.log(`   Name: ${admin.firstName} ${admin.lastName}`)
  console.log(`   Role: ${admin.role}`)
  console.log('')
  console.log('⚠️  IMPORTANT: Change the admin password after first login!')
  console.log(`   Default password: ${adminPassword}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })