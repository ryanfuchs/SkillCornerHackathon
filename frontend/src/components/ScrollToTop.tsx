import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Reset window scroll on navigation (SPA default leaves prior scroll position). */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
