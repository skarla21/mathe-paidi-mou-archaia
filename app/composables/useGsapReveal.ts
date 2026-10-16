export function useGsapReveal() {
  function prefersReducedMotion() {
    return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  async function getGsap() {
    const { default: gsap } = await import('gsap')
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    gsap.registerPlugin(ScrollTrigger)
    return { gsap, ScrollTrigger }
  }

  async function revealSection(
    el: HTMLElement | string,
    opts?: { y?: number; duration?: number; stagger?: number; ease?: string; scroller?: HTMLElement }
  ) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el
    if (!target) return
    const y = opts?.y ?? 28
    const duration = opts?.duration ?? 0.65
    const stagger = opts?.stagger ?? 0.1
    const ease = opts?.ease ?? 'power2.out'
    const scrollTrigger: Record<string, unknown> = {
      trigger: target,
      start: 'top 85%',
      toggleActions: 'play none none none',
    }
    if (opts?.scroller) scrollTrigger.scroller = opts.scroller
    gsap.fromTo(
      target,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration,
        ease,
        stagger: target.children.length > 1 ? stagger : undefined,
        scrollTrigger,
      }
    )
  }

  async function revealNow(
    el: HTMLElement | string,
    opts?: { y?: number; duration?: number; ease?: string },
  ) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el
    if (!target) return
    gsap.fromTo(
      target,
      { opacity: 0, y: opts?.y ?? 16 },
      {
        opacity: 1,
        y: 0,
        duration: opts?.duration ?? 0.45,
        ease: opts?.ease ?? 'power2.out',
      },
    )
  }

  async function revealStagger(
    container: HTMLElement | string,
    childSelector: string,
    opts?: { y?: number; duration?: number; stagger?: number; ease?: string; scroller?: HTMLElement }
  ) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const el: HTMLElement | null =
      typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container
    if (!el) return
    const children = el.querySelectorAll(childSelector)
    if (children.length === 0) return
    const y = opts?.y ?? 24
    const duration = opts?.duration ?? 0.5
    const stagger = opts?.stagger ?? 0.08
    const ease = opts?.ease ?? 'power2.out'
    const scrollTrigger: Record<string, unknown> = {
      trigger: el,
      start: 'top 82%',
      toggleActions: 'play none none none',
    }
    if (opts?.scroller) scrollTrigger.scroller = opts.scroller
    gsap.fromTo(
      children,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        ease,
        scrollTrigger,
      }
    )
  }

  async function animateHero(
    title: HTMLElement | string,
    lead: HTMLElement | string,
    cta?: HTMLElement | string
  ) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const t: HTMLElement | null =
      typeof title === 'string' ? document.querySelector<HTMLElement>(title) : title
    const l: HTMLElement | null =
      typeof lead === 'string' ? document.querySelector<HTMLElement>(lead) : lead
    if (!t || !l) return
    gsap.fromTo(t, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
    gsap.fromTo(l, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55, delay: 0.15, ease: 'power2.out' })
    if (cta) {
      const c: HTMLElement | null =
        typeof cta === 'string' ? document.querySelector<HTMLElement>(cta) : cta
      if (c) {
        gsap.fromTo(c, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.4, delay: 0.35, ease: 'back.out(1.2)' })
      }
    }
  }

  async function iconWiggle(el: HTMLElement | string) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el
    if (!target) return
    gsap.to(target, { rotation: 3, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  }

  async function animateBadge(el: HTMLElement | string) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el
    if (!target) return
    gsap.fromTo(
      target,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.2)' }
    )
  }

  async function parallaxBlobs(container: HTMLElement | string, scroller?: HTMLElement) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const el: HTMLElement | null =
      typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container
    if (!el) return
    const scrollTrigger: Record<string, unknown> = {
      trigger: el.parentElement ?? el,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
    }
    if (scroller) scrollTrigger.scroller = scroller
    gsap.to(el, { y: 80, scrollTrigger })
  }

  async function heroFadeOnScroll(heroEl: HTMLElement | string, scroller?: HTMLElement) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof heroEl === 'string' ? document.querySelector<HTMLElement>(heroEl) : heroEl
    if (!target) return
    const scrollTrigger: Record<string, unknown> = {
      trigger: target,
      start: 'top top',
      end: 'top -300px',
      scrub: 0.5,
    }
    if (scroller) scrollTrigger.scroller = scroller
    gsap.to(target, { opacity: 0, scrollTrigger })
  }

  async function dropdownEnter(el: HTMLElement | string) {
    if (!import.meta.client || prefersReducedMotion()) return
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el
    if (!target) return
    gsap.fromTo(
      target,
      { opacity: 0, y: 10, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' }
    )
  }

  async function dropdownExit(el: HTMLElement | string, onComplete?: () => void) {
    if (!import.meta.client) return
    if (prefersReducedMotion()) {
      onComplete?.()
      return
    }
    const { gsap } = await getGsap()
    const target: HTMLElement | null =
      typeof el === 'string' ? document.querySelector<HTMLElement>(el) : el
    if (!target) {
      onComplete?.()
      return
    }
    gsap.to(target, {
      opacity: 0,
      y: 10,
      scale: 0.95,
      duration: 0.2,
      ease: 'power2.in',
      onComplete,
    })
  }

  return {
    revealSection,
    revealNow,
    revealStagger,
    animateHero,
    iconWiggle,
    animateBadge,
    parallaxBlobs,
    heroFadeOnScroll,
    dropdownEnter,
    dropdownExit,
  }
}
