import { createContext, useContext } from 'react'
import { resolveContent } from '../data/content'

// Page media, resolved from the CMS. Defaults to every slot empty.
export const ContentContext = createContext(resolveContent(null))

export const useContent = () => useContext(ContentContext)
