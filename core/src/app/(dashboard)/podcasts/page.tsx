import { Button } from "@/components/ui/button"
import { Mic, Play, Clock } from "lucide-react"
import { getRecentPodcasts } from "@/lib/loaders/dashboard"
import { PageHeader, PageHeaderPresets } from "@/components/layout"
import { PodcastPlayer } from "@/components/podcast-player"
import Image from "next/image"

export default async function PodcastsPage() {
  const podcasts = await getRecentPodcasts()

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader {...PageHeaderPresets.podcasts} />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Featured Episode */}
        <section className="mb-16">
          <div className="flex flex-col lg:flex-row gap-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
            {/* Left: Podcast Image and Info */}
            <div className="w-full lg:w-1/3 flex-shrink-0">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-900">
                      <Image
                        src="/diamondstandardpod.webp"
                        alt="The Diamond Standard Podcast"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                      />
                    </div>
            </div>
            
            {/* Right: Latest Episode with PodcastPlayer */}
            <div className="flex-1">
              {podcasts.length > 0 ? (
                <PodcastPlayer
                  episodeNumber={podcasts[0].episodeNumber}
                  title={podcasts[0].title}
                  description={podcasts[0].description}
                  muxPlaybackId={podcasts[0].muxPlaybackId}
                  duration={podcasts[0].duration}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No episodes available yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* All Episodes */}
        {podcasts.length > 1 && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">More Episodes</h2>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="divide-y divide-gray-200">
                {podcasts.slice(1).map((podcast, i) => (
                  <div key={podcast.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Episode Number */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-600">
                            {podcast.episodeNumber || i + 2}
                          </span>
                        </div>
                      </div>
                      
                      {/* Episode Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {podcast.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{Math.floor(podcast.duration / 60)}:{String(podcast.duration % 60).padStart(2, '0')}</span>
                          <span>•</span>
                          <span>
                            {new Date(podcast.publishedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Play Button */}
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-9 w-9 hover:bg-blue-50 hover:text-blue-600 flex-shrink-0"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Single Episode Message */}
        {podcasts.length === 1 && (
          <section className="text-center py-8">
            <p className="text-gray-600">More episodes coming soon!</p>
          </section>
        )}
      </div>
    </div>
  )
}
