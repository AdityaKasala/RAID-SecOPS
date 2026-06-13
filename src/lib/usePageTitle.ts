import { useEffect } from 'react'

/**
 * Updates the browser tab title for the current page.
 * Usage: usePageTitle('Alerts Queue')
 * Result: "Alerts Queue · RAID-SecOps"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = `${title} · RAID-SecOps`
    return () => { document.title = prev }
  }, [title])
}
