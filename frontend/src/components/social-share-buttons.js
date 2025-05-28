'use client'

import { usePathname } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  SiX,
  SiFacebook,
  SiLinkedin,
  SiWhatsapp,
  SiMessenger,
  SiReddit,
  SiPinterest,
} from 'react-icons/si'
import { FiShare, FiCopy } from 'react-icons/fi'

export default function SocialShareButtons({ title = '' }) {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)
  const [nativeShare, setNativeShare] = useState(false)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) setNativeShare(true)
  }, [])

  const url = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin + pathname
  }, [pathname])

  const enc = (str) => encodeURIComponent(str ?? '')
  const popup = (href) => href && window.open(href, '_blank', 'noopener,noreferrer,width=600,height=600')

  const links = {
    x: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
    whatsapp: `https://wa.me/?text=${enc(title + ' ' + url)}`,
    messenger: `https://www.facebook.com/dialog/send?link=${enc(url)}&app_id=28164212029`,
    reddit: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(title)}`,
  }

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  const btnCls = 'h-7 w-7 sm:h-10 sm:w-10'
  const iconCls = 'w-4 h-4 sm:w-5 sm:h-5'

  return (
    <div className="bg-white rounded-lg p-0">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Share on social media</p>
      <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
        <Button variant="outline" size="icon" aria-label="Share on X" onClick={() => popup(links.x)} className={btnCls}><SiX className={iconCls} /></Button>
        <Button variant="outline" size="icon" aria-label="Share on Facebook" onClick={() => popup(links.facebook)} className={btnCls}><SiFacebook className={iconCls} /></Button>
        <Button variant="outline" size="icon" aria-label="Share on LinkedIn" onClick={() => popup(links.linkedin)} className={btnCls}><SiLinkedin className={iconCls} /></Button>
        <Button variant="outline" size="icon" aria-label="Share on WhatsApp" onClick={() => popup(links.whatsapp)} className={btnCls}><SiWhatsapp className={iconCls} /></Button>
        <Button variant="outline" size="icon" aria-label="Share on Messenger" onClick={() => popup(links.messenger)} className={btnCls}><SiMessenger className={iconCls} /></Button>
        <Button variant="outline" size="icon" aria-label="Share on Reddit" onClick={() => popup(links.reddit)} className={btnCls}><SiReddit className={iconCls} /></Button>
        <Button variant="outline" size="icon" aria-label="Share on Pinterest" onClick={() => popup(links.pinterest)} className={btnCls}><SiPinterest className={iconCls} /></Button>
        {nativeShare ? (
          <Button variant="outline" size="icon" aria-label="Share via native sheet" onClick={() => navigator.share({ title, url })} className={btnCls}><FiShare className={iconCls} /></Button>
        ) : (
          <Button variant="outline" size="icon" aria-label={copied ? 'Link copied!' : 'Copy link'} onClick={copyLink} className={btnCls}>{copied ? <span className="text-xs font-semibold">✓</span> : <FiCopy className={iconCls} />}</Button>
        )}
      </div>
    </div>
  )
}