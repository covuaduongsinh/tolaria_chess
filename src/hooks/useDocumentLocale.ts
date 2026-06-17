import { useEffect, useState } from 'react'
import { resolveEffectiveLocale, type AppLocale } from '../lib/i18n'

/** Read the active app locale from the document's `lang` attribute. Editor blocks
 *  are rendered outside the React tree that holds the locale, so they observe the
 *  document instead of receiving it through props/context. */
export function readDocumentLocale(): AppLocale {
  if (typeof document === 'undefined') return 'en'
  return resolveEffectiveLocale(document.documentElement.lang)
}

export function useDocumentLocale(): AppLocale {
  const [locale, setLocale] = useState(readDocumentLocale)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const syncLocale = () => setLocale(readDocumentLocale())
    const observer = new MutationObserver(syncLocale)
    observer.observe(document.documentElement, { attributeFilter: ['lang'], attributes: true })
    syncLocale()

    return () => observer.disconnect()
  }, [])

  return locale
}
