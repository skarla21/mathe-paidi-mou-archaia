import {
  canonicalHref,
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_ORIGIN,
} from "#shared/utils/siteMeta.mjs"

export type Crumb = {
  name: string
  path: string
}

type JsonRecord = Record<string, unknown>

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`

export function organizationNode(): JsonRecord {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: canonicalHref(SITE_LOGO_PATH),
    description: SITE_DESCRIPTION,
  }
}

export function websiteNode(): JsonRecord {
  return {
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description: SITE_DESCRIPTION,
    inLanguage: "el",
    publisher: { "@id": ORGANIZATION_ID },
  }
}

export function faqPageNode(items: Array<{ question: string; answer: string }>): JsonRecord {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

export function breadcrumbList(items: Crumb[]): JsonRecord {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalHref(item.path),
    })),
  }
}

export function articleImageUrl(url?: string | null) {
  const text = url?.trim() ?? ""
  if (text.startsWith("https://") || text.startsWith("http://")) return text
  return SITE_OG_IMAGE
}

export function articleJsonLd(input: {
  title: string
  description: string
  path: string
  createdAt: string
  updatedAt: string
  imageUrl?: string | null
}): JsonRecord {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.createdAt,
    dateModified: input.updatedAt,
    image: articleImageUrl(input.imageUrl),
    inLanguage: "el",
    mainEntityOfPage: canonicalHref(input.path),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: canonicalHref(SITE_LOGO_PATH),
      },
    },
  }
}

export function learningResourceNode(input: {
  name: string
  description?: string | null
  path: string
  educationalLevel?: string | null
  isAccessibleForFree: boolean
}): JsonRecord {
  const description = input.description?.trim() ?? ""
  const level = input.educationalLevel?.trim() ?? ""
  return {
    "@type": "LearningResource",
    name: input.name,
    ...(description ? { description } : {}),
    inLanguage: "el",
    learningResourceType: "Σημειώσεις",
    ...(level ? { educationalLevel: level } : {}),
    isAccessibleForFree: input.isAccessibleForFree,
    url: canonicalHref(input.path),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  }
}

export function jsonLdGraph(nodes: JsonRecord[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  }
}

export function jsonLdScript(data: unknown, key: string) {
  return {
    key,
    type: "application/ld+json",
    innerHTML: JSON.stringify(data).replace(/</g, "\\u003c"),
  }
}
