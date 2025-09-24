import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting Diamond Plus seed...')

  // Create admin user if not exists
  const adminEmail = 'admin@diamondplusportal.com'
  const adminPassword = 'DiamondPlus2025!'
  
  let admin = await prisma.users.findUnique({
    where: { email: adminEmail }
  })
  
  if (!admin) {
    const hashedPassword = await hash(adminPassword, 12)
    admin = await prisma.users.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Diamond Plus',
        lastName: 'Admin',
        phone: '+1234567890',
        role: 'ADMIN'
      }
    })
    console.log('✅ Created admin user:', adminEmail)
  } else {
    console.log('✅ Admin user already exists')
  }

  // Check if we already have courses
  const existingCourse = await prisma.courses.findFirst()
  if (existingCourse) {
    console.log('✅ Courses already exist, skipping seed')
    return
  }

  // Create Diamond Plus Course
  const course = await prisma.courses.create({
    data: {
      title: 'Diamond Plus Real Estate Training',
      description: 'Complete real estate training program by Ricky Carruth',
      slug: 'diamond-plus-training',
      published: true
    }
  })

  // Create 8 modules with sample lessons
  const modules = [
    {
      name: 'Foundation',
      description: 'Build a strong foundation for your real estate career',
      thumbnail: '/modules/foundation.jpg'
    },
    {
      name: 'Lead Generation',
      description: 'Master the art of generating consistent leads',
      thumbnail: '/modules/leads.jpg'
    },
    {
      name: 'Sales Mastery',
      description: 'Convert leads into clients with proven sales techniques',
      thumbnail: '/modules/sales.jpg'
    },
    {
      name: 'Listing Presentations',
      description: 'Win more listings with powerful presentations',
      thumbnail: '/modules/listings.jpg'
    },
    {
      name: 'Marketing',
      description: 'Market properties effectively in the digital age',
      thumbnail: '/modules/marketing.jpg'
    },
    {
      name: 'Negotiation',
      description: 'Negotiate like a pro and close more deals',
      thumbnail: '/modules/negotiation.jpg'
    },
    {
      name: 'Systems & Scaling',
      description: 'Build systems to scale your real estate business',
      thumbnail: '/modules/systems.jpg'
    },
    {
      name: 'Mindset & Growth',
      description: 'Develop the mindset of a top producer',
      thumbnail: '/modules/mindset.jpg'
    }
  ]

  for (let i = 0; i < modules.length; i++) {
    const module = await prisma.modules.create({
      data: {
        courseId: course.id,
        title: modules[i].name,
        description: modules[i].description,
        order: i + 1
      }
    })

    // Add 3 sample lessons per module
    for (let j = 0; j < 3; j++) {
      await prisma.sub_lessons.create({
        data: {
          moduleId: module.id,
          title: `${modules[i].name} - Lesson ${j + 1}`,
          description: `Key concepts and strategies for ${modules[i].name.toLowerCase()}`,
          order: j + 1,
          videoUrl: `https://example.com/video-${module.id}-${j}`,
          // Sample Mux IDs (these would be real in production)
          muxPlaybackId: `sample-playback-${module.id}-${j}`,
          muxAssetId: `sample-asset-${module.id}-${j}`,
          duration: 600 + (j * 300) // 10, 15, 20 minutes
        }
      })
    }

    console.log(`✅ Created module: ${modules[i].name} with 3 lessons`)
  }

  // Create sample podcasts
  const podcasts = [
    {
      title: 'Welcome to Diamond Plus',
      description: 'An introduction to the Diamond Plus training program and what you can expect',
      duration: 1200,
      published: true
    },
    {
      title: 'The Power of Consistency',
      description: 'Why consistency is the key to real estate success',
      duration: 1800,
      published: true
    },
    {
      title: 'Building Your Personal Brand',
      description: 'How to stand out in a crowded real estate market',
      duration: 1500,
      published: false
    }
  ]

  for (const podcast of podcasts) {
    await prisma.podcasts.create({
      data: {
        ...podcast,
        muxPlaybackId: `podcast-${podcast.title.toLowerCase().replace(/\s+/g, '-')}`,
        muxAssetId: `asset-${podcast.title.toLowerCase().replace(/\s+/g, '-')}`,
        publishedAt: podcast.published ? new Date() : null
      }
    })
    console.log(`✅ Created podcast: ${podcast.title}`)
  }

  console.log('🎉 Diamond Plus seed completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
