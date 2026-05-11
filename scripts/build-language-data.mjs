import { mkdir, writeFile } from "node:fs/promises"
import { iso6393 } from "iso-639-3"

const countriesUrl =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
const languagesUrl =
  "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,languages"
const wikidataSparqlUrl = "https://query.wikidata.org/sparql"
const cldrSupplementalDataUrl =
  "https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/supplementalData.xml"
const commonCrawlLanguagesUrl =
  "https://commoncrawl.github.io/cc-crawl-statistics/plots/languages.csv"

const palette = [
  "#d7301f",
  "#fe9929",
  "#fec44f",
  "#fee391",
  "#78c6a3",
  "#5aa9e6",
  "#7b61ff",
  "#c77dff",
  "#f28482",
  "#84a59d",
  "#f6bd60",
  "#43aa8b",
]

const languageCodeAliases = new Map(
  Object.entries({
    acm: "ara",
    acq: "ara",
    aeb: "ara",
    ajp: "ara",
    apc: "ara",
    arb: "ara",
    ars: "ara",
    ary: "ara",
    arz: "ara",
    cmn: "zho",
    yue: "zho",
    nan: "zho",
    hak: "zho",
    pes: "fas",
    prs: "fas",
    swh: "swa",
    gaz: "orm",
    tgl: "fil",
    hbs: "srp",
    sr: "srp",
    sh: "srp",
    iw: "heb",
    jw: "jav",
    mo: "ron",
    nb: "nor",
    nob: "nor",
    nn: "nor",
    nno: "nor",
    no: "nor",
    pt_br: "por",
    zh_cn: "zho",
    zh_tw: "zho",
  })
)

const polygonCountryCodeOverrides = new Map(
  Object.entries({
    France: { iso2: "FR", iso3: "FRA" },
    Kosovo: { iso2: "XK", iso3: "UNK" },
    Norway: { iso2: "NO", iso3: "NOR" },
  })
)

const benchmarkSources = [
  {
    id: "aya-101",
    name: "Aya-101",
    shortName: "Aya-101",
    sourceType: "model card",
    apiUrl: "https://huggingface.co/api/models/CohereForAI/aya-101",
    sourceUrl: "https://huggingface.co/CohereForAI/aya-101",
    paperUrl: "https://arxiv.org/abs/2402.07827",
    description:
      "Cohere for AI Aya model card language coverage for the 101-language instruction-tuned model.",
  },
  {
    id: "aya-dataset",
    name: "Aya Dataset",
    shortName: "Aya Dataset",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/CohereForAI/aya_dataset",
    sourceUrl: "https://huggingface.co/datasets/CohereForAI/aya_dataset",
    paperUrl: "https://arxiv.org/abs/2402.06619",
    description:
      "Human-curated multilingual instruction data from Cohere for AI.",
  },
  {
    id: "belebele",
    name: "Belebele",
    shortName: "Belebele",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/facebook/belebele",
    sourceUrl: "https://huggingface.co/datasets/facebook/belebele",
    paperUrl: "https://arxiv.org/abs/2308.16884",
    description:
      "Parallel multiple-choice reading-comprehension benchmark in 122 language variants.",
  },
  {
    id: "flores-200",
    name: "FLORES-200",
    shortName: "FLORES-200",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/facebook/flores",
    sourceUrl: "https://huggingface.co/datasets/facebook/flores",
    paperUrl: "https://arxiv.org/abs/2207.04672",
    description:
      "Machine-translation evaluation benchmark used by No Language Left Behind.",
  },
  {
    id: "sib-200",
    name: "SIB-200",
    shortName: "SIB-200",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/Davlan/sib200",
    sourceUrl: "https://huggingface.co/datasets/Davlan/sib200",
    paperUrl: "https://arxiv.org/abs/2309.07445",
    description:
      "Topic-classification benchmark derived from FLORES-200 languages.",
  },
  {
    id: "mmmlu",
    name: "MMMLU",
    shortName: "MMMLU",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/openai/MMMLU",
    sourceUrl: "https://huggingface.co/datasets/openai/MMMLU",
    paperUrl: "https://huggingface.co/datasets/openai/MMMLU",
    description: "OpenAI multilingual MMLU translations covering 14 locales.",
  },
  {
    id: "mgsm",
    name: "MGSM",
    shortName: "MGSM",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/juletxara/mgsm",
    sourceUrl: "https://huggingface.co/datasets/juletxara/mgsm",
    paperUrl: "https://arxiv.org/abs/2210.03057",
    description:
      "Multilingual grade-school math benchmark translated into 10 languages plus English.",
  },
  {
    id: "irokobench",
    name: "IrokoBench",
    shortName: "IrokoBench",
    sourceType: "dataset union",
    apiUrls: [
      "https://huggingface.co/api/datasets/masakhane/afrimmlu",
      "https://huggingface.co/api/datasets/masakhane/afrimgsm",
      "https://huggingface.co/api/datasets/masakhane/afrixnli",
    ],
    sourceUrl: "https://huggingface.co/datasets/masakhane/afrimmlu",
    paperUrl: "https://arxiv.org/abs/2406.03368",
    description:
      "African-language LLM evaluation suite combining AfriMMLU, AfriMGSM, and AfriXNLI.",
  },
  {
    id: "masakhanews",
    name: "MasakhaNEWS",
    shortName: "MasakhaNEWS",
    sourceType: "dataset card",
    apiUrl: "https://huggingface.co/api/datasets/masakhane/masakhanews",
    sourceUrl: "https://huggingface.co/datasets/masakhane/masakhanews",
    paperUrl: "https://aclanthology.org/2023.ijcnlp-main.10/",
    description:
      "African-language news topic classification benchmark by Masakhane.",
  },
  {
    id: "afrobench",
    name: "AfroBench",
    shortName: "AfroBench",
    sourceType: "dataset union",
    apiUrls: [
      "https://huggingface.co/api/datasets/masakhane/masakhapos",
      "https://huggingface.co/api/datasets/masakhane/masakhaner-x",
      "https://huggingface.co/api/datasets/masakhane/afrisenti",
      "https://huggingface.co/api/datasets/Davlan/nollysenti",
      "https://huggingface.co/api/datasets/Davlan/sib200",
      "https://huggingface.co/api/datasets/masakhane/masakhanews",
      "https://huggingface.co/api/datasets/masakhane/InjongoIntent",
      "https://huggingface.co/api/datasets/masakhane/afrixnli",
      "https://huggingface.co/api/datasets/masakhane/afriqa-gold-passages",
      "https://huggingface.co/api/datasets/facebook/belebele",
      "https://huggingface.co/api/datasets/Davlan/NaijaRC",
      "https://huggingface.co/api/datasets/masakhane/uhura-arc-easy",
      "https://huggingface.co/api/datasets/masakhane/afrimmlu",
      "https://huggingface.co/api/datasets/openai/MMMLU",
      "https://huggingface.co/api/datasets/masakhane/afrimgsm",
      "https://huggingface.co/api/datasets/facebook/flores",
      "https://huggingface.co/api/datasets/masakhane/mafand",
      "https://huggingface.co/api/datasets/masakhane/ntrex_african",
      "https://huggingface.co/api/datasets/Sunbird/salt",
      "https://huggingface.co/api/datasets/csebuetnlp/xlsum",
      "https://huggingface.co/api/datasets/masakhane/diacritics-restoration",
    ],
    sourceUrl: "https://mcgill-nlp.github.io/AfroBench/",
    paperUrl: "https://aclanthology.org/2025.findings-acl.976/",
    description:
      "Aggregate African-language LLM benchmark suite spanning many datasets and tasks.",
  },
]

async function fetchJson(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.json()
}

async function fetchWikidataCountryLanguages() {
  const query = `SELECT DISTINCT ?countryIso3 ?countryIso2 ?countryLabel ?lang ?langLabel ?iso3 ?iso1 ?speakers WHERE {
  ?lang wdt:P31/wdt:P279* wd:Q34770.
  FILTER NOT EXISTS {
    VALUES ?excludedLanguageClass { wd:Q45762 wd:Q2315359 wd:Q38058796 }
    ?lang wdt:P31/wdt:P279* ?excludedLanguageClass.
  }
  { ?lang wdt:P17 ?country. } UNION { ?lang wdt:P2341 ?country. } UNION { ?lang wdt:P495 ?country. }
  ?country wdt:P298 ?countryIso3.
  OPTIONAL { ?country wdt:P297 ?countryIso2. }
  OPTIONAL { ?lang wdt:P220 ?iso3. }
  OPTIONAL { ?lang wdt:P218 ?iso1. }
  OPTIONAL { ?lang wdt:P1098 ?speakers. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
  const url = `${wikidataSparqlUrl}?format=json&query=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: {
      "User-Agent": "lrl-map/0.1 (country language map data build)",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Wikidata country languages: ${response.status}`
    )
  }

  return response.json()
}

async function fetchHuggingFaceLanguages(url) {
  const metadata = await fetchJson(url)

  return metadata.cardData?.language ?? []
}

function normalizeLanguageCode(code) {
  const normalized = code.toLowerCase().replaceAll("-", "_")
  const base = normalized.split("_")[0]
  const aliased =
    languageCodeAliases.get(normalized) ?? languageCodeAliases.get(base)

  if (aliased) {
    return aliased
  }

  const byIso1 = iso6393.find((language) => language.iso6391 === base)
  if (byIso1) {
    return byIso1.iso6393
  }

  const byIso3 = iso6393.find((language) => language.iso6393 === base)
  if (byIso3) {
    return byIso3.iso6393
  }

  return base.length === 3 ? base : null
}

function languageNameForCode(code, fallbackName) {
  return (
    iso6393.find((language) => language.iso6393 === code)?.name ?? fallbackName
  )
}

function normalizeCountryLanguages(languages) {
  const languagesByCode = new Map()

  for (const [rawCode, rawName] of Object.entries(languages ?? {})) {
    const code = normalizeLanguageCode(rawCode)

    if (!code) continue

    languagesByCode.set(code, {
      code,
      name: code === rawCode ? rawName : languageNameForCode(code, rawName),
    })
  }

  return Array.from(languagesByCode.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

function parseXmlAttributes(attributeText) {
  return Object.fromEntries(
    Array.from(attributeText.matchAll(/([A-Za-z]+)="([^"]*)"/g)).map(
      ([, key, value]) => [key, value]
    )
  )
}

function parseCldrTerritoryLanguages(xml) {
  const territories = new Map()
  const territoryMatches = xml.matchAll(
    /<territory\s+([^>]*?)>([\s\S]*?)<\/territory>/g
  )

  for (const [, territoryAttributes, territoryBody] of territoryMatches) {
    const territory = parseXmlAttributes(territoryAttributes)
    const territoryCode = territory.type

    if (!territoryCode) continue

    const languageData = new Map()
    const languageMatches = territoryBody.matchAll(
      /<languagePopulation\s+([^/>]*?)\/>/g
    )

    for (const [, languageAttributes] of languageMatches) {
      const language = parseXmlAttributes(languageAttributes)
      const code = normalizeLanguageCode(language.type ?? "")

      if (!code) continue

      languageData.set(code, {
        officialStatus: language.officialStatus ?? null,
        populationPercent: Number(language.populationPercent ?? 0),
      })
    }

    territories.set(territoryCode, languageData)
  }

  return territories
}

function buildCountryLanguageCatalog({
  wikidata,
  restCountries,
  cldrTerritories,
}) {
  const restCountriesByIso3 = new Map(
    restCountries
      .filter((country) => country.cca3)
      .map((country) => [country.cca3, country])
  )
  const countriesByIso3 = new Map()

  for (const binding of wikidata.results.bindings) {
    const iso3 = binding.countryIso3?.value
    const rawLanguageCode = binding.iso3?.value ?? binding.iso1?.value
    const languageCode = normalizeLanguageCode(rawLanguageCode ?? "")

    if (!iso3 || !languageCode) continue

    const restCountry = restCountriesByIso3.get(iso3)
    const country = countriesByIso3.get(iso3) ?? {
      countryName:
        restCountry?.name?.common ?? binding.countryLabel?.value ?? iso3,
      iso2: restCountry?.cca2 ?? binding.countryIso2?.value ?? null,
      languagesByCode: new Map(),
    }
    const existingLanguage = country.languagesByCode.get(languageCode)
    const speakers = Number(binding.speakers?.value ?? 0)
    const cldrLanguage = country.iso2
      ? cldrTerritories.get(country.iso2)?.get(languageCode)
      : null

    country.languagesByCode.set(languageCode, {
      code: languageCode,
      name:
        existingLanguage?.name ??
        languageNameForCode(
          languageCode,
          binding.langLabel?.value ?? languageCode
        ),
      source: existingLanguage?.source ?? "wikidata",
      speakers: Math.max(existingLanguage?.speakers ?? 0, speakers),
      officialStatus:
        existingLanguage?.officialStatus ??
        cldrLanguage?.officialStatus ??
        null,
      populationPercent: Math.max(
        existingLanguage?.populationPercent ?? 0,
        cldrLanguage?.populationPercent ?? 0
      ),
    })
    countriesByIso3.set(iso3, country)
  }

  for (const country of restCountries) {
    if (!country.cca3 || !country.languages) continue

    const existingCountry = countriesByIso3.get(country.cca3) ?? {
      countryName: country.name?.common ?? country.cca3,
      iso2: country.cca2 ?? null,
      languagesByCode: new Map(),
    }

    for (const language of normalizeCountryLanguages(country.languages)) {
      if (existingCountry.languagesByCode.has(language.code)) continue

      const cldrLanguage = existingCountry.iso2
        ? cldrTerritories.get(existingCountry.iso2)?.get(language.code)
        : null

      existingCountry.languagesByCode.set(language.code, {
        ...language,
        source: "restcountries",
        speakers: 0,
        officialStatus: cldrLanguage?.officialStatus ?? "official",
        populationPercent: cldrLanguage?.populationPercent ?? 0,
      })
    }

    countriesByIso3.set(country.cca3, existingCountry)
  }

  return new Map(
    Array.from(countriesByIso3.entries()).map(([iso3, country]) => [
      iso3,
      {
        countryName: country.countryName,
        languages: Array.from(country.languagesByCode.values()).sort((a, b) => {
          const statusRank = (language) =>
            language.officialStatus ? 0 : language.populationPercent > 0 ? 1 : 2

          return (
            statusRank(a) - statusRank(b) ||
            b.populationPercent - a.populationPercent ||
            b.speakers - a.speakers ||
            a.name.localeCompare(b.name)
          )
        }),
      },
    ])
  )
}

async function buildBenchmarkCatalog() {
  const benchmarkCatalog = []

  for (const benchmark of benchmarkSources) {
    const apiUrls = benchmark.apiUrls ?? [benchmark.apiUrl]
    const rawLanguageCodes = new Set()

    for (const url of apiUrls) {
      if (!url) continue

      try {
        const languages = await fetchHuggingFaceLanguages(url)
        for (const language of languages) {
          rawLanguageCodes.add(language)
        }
      } catch (error) {
        console.warn(`Skipping benchmark source ${url}: ${error.message}`)
      }
    }

    const normalizedLanguageCodes = Array.from(rawLanguageCodes)
      .map(normalizeLanguageCode)
      .filter(Boolean)
      .sort()

    benchmarkCatalog.push({
      id: benchmark.id,
      name: benchmark.name,
      shortName: benchmark.shortName,
      sourceType: benchmark.sourceType,
      sourceUrl: benchmark.sourceUrl,
      paperUrl: benchmark.paperUrl,
      description: benchmark.description,
      rawLanguageCount: rawLanguageCodes.size,
      languageCodes: Array.from(new Set(normalizedLanguageCodes)),
    })
  }

  return benchmarkCatalog
}

async function fetchText(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.text()
}

function parseCommonCrawlLanguages(csv) {
  const [, ...lines] = csv.trim().split("\n")
  const rows = lines.map((line) => {
    const [crawl, languageCode, pages, urls, percentPages] = line.split(",")
    const normalizedLanguageCode =
      normalizeLanguageCode(languageCode) ?? languageCode

    return {
      crawl,
      languageCode: normalizedLanguageCode,
      pages: Number(pages),
      urls: Number(urls),
      percentPages: Number(percentPages),
    }
  })
  const latestCrawl = rows.at(-1)?.crawl

  if (!latestCrawl) {
    throw new Error("Unable to find latest Common Crawl language crawl.")
  }

  return {
    latestCrawl,
    byLanguageCode: rows
      .filter((row) => row.crawl === latestCrawl)
      .reduce((byLanguageCode, row) => {
        const existing = byLanguageCode.get(row.languageCode)

        byLanguageCode.set(row.languageCode, {
          crawl: row.crawl,
          languageCode: row.languageCode,
          pages: (existing?.pages ?? 0) + row.pages,
          urls: (existing?.urls ?? 0) + row.urls,
          percentPages: (existing?.percentPages ?? 0) + row.percentPages,
        })

        return byLanguageCode
      }, new Map()),
  }
}

function buildCommonCrawlCoverage(languages, commonCrawl) {
  const matchedLanguages = languages
    .map((language) => {
      const row = commonCrawl.byLanguageCode.get(language.code)

      if (!row) return null

      return {
        code: language.code,
        name: language.name,
        pages: row.pages,
        urls: row.urls,
        percentPages: row.percentPages,
      }
    })
    .filter(Boolean)
    .sort(
      (a, b) => b.percentPages - a.percentPages || a.name.localeCompare(b.name)
    )

  return {
    pages: matchedLanguages.reduce((sum, language) => sum + language.pages, 0),
    urls: matchedLanguages.reduce((sum, language) => sum + language.urls, 0),
    percentPages: matchedLanguages.reduce(
      (sum, language) => sum + language.percentPages,
      0
    ),
    matchedLanguages,
    topLanguage: matchedLanguages[0] ?? null,
  }
}

function colorForLanguage(code) {
  let hash = 0

  for (const char of code) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return palette[hash % palette.length]
}

const [
  countryPolygons,
  restCountries,
  wikidataCountryLanguages,
  cldrSupplementalData,
  commonCrawlCsv,
] = await Promise.all([
  fetchJson(countriesUrl),
  fetchJson(languagesUrl),
  fetchWikidataCountryLanguages(),
  fetchText(cldrSupplementalDataUrl),
  fetchText(commonCrawlLanguagesUrl),
])

const commonCrawl = parseCommonCrawlLanguages(commonCrawlCsv)
const llmBenchmarks = await buildBenchmarkCatalog()
const cldrTerritories = parseCldrTerritoryLanguages(cldrSupplementalData)
const languagesByIso3 = buildCountryLanguageCatalog({
  wikidata: wikidataCountryLanguages,
  restCountries,
  cldrTerritories,
})

const languageCounts = new Map()
const languageSpeakers = new Map()

for (const country of languagesByIso3.values()) {
  for (const language of country.languages) {
    languageCounts.set(
      language.code,
      (languageCounts.get(language.code) ?? 0) + 1
    )
    languageSpeakers.set(
      language.code,
      Math.max(languageSpeakers.get(language.code) ?? 0, language.speakers ?? 0)
    )
  }
}

const languageCatalog = Array.from(
  new Map(
    Array.from(languagesByIso3.values()).flatMap((country) =>
      country.languages.map(({ code, name }) => [
        code,
        {
          code,
          name,
          color: colorForLanguage(code),
          countryCount: languageCounts.get(code) ?? 0,
          speakers: languageSpeakers.get(code) ?? 0,
          commonCrawlLatestCrawl: commonCrawl.latestCrawl,
          commonCrawlPages: commonCrawl.byLanguageCode.get(code)?.pages ?? 0,
          commonCrawlUrls: commonCrawl.byLanguageCode.get(code)?.urls ?? 0,
          commonCrawlPercent:
            commonCrawl.byLanguageCode.get(code)?.percentPages ?? 0,
        },
      ])
    )
  ).values()
).sort((a, b) => a.name.localeCompare(b.name))

const features = countryPolygons.features
  .map((feature) => {
    const codeOverride = polygonCountryCodeOverrides.get(
      feature.properties.name
    )
    const iso3 = codeOverride?.iso3 ?? feature.properties["ISO3166-1-Alpha-3"]
    const iso2 = codeOverride?.iso2 ?? feature.properties["ISO3166-1-Alpha-2"]
    const languageData = languagesByIso3.get(iso3)

    if (!languageData?.languages.length) {
      return null
    }

    const primaryLanguage = languageData.languages[0]
    const languageCodes = languageData.languages.map(
      (language) => language.code
    )
    const commonCrawlCoverage = buildCommonCrawlCoverage(
      languageData.languages,
      commonCrawl
    )
    const llmBenchmarkIds = llmBenchmarks
      .filter((benchmark) =>
        languageCodes.some((languageCode) =>
          benchmark.languageCodes.includes(languageCode)
        )
      )
      .map((benchmark) => benchmark.id)

    return {
      ...feature,
      properties: {
        iso3,
        iso2,
        country: languageData.countryName,
        languages: languageData.languages.map((language) => language.name),
        languageCodes,
        languageList: languageData.languages
          .map((language) => language.name)
          .join(", "),
        primaryLanguage: primaryLanguage.name,
        primaryLanguageCode: primaryLanguage.code,
        primaryLanguageColor: colorForLanguage(primaryLanguage.code),
        commonCrawlLatestCrawl: commonCrawl.latestCrawl,
        commonCrawlPages: commonCrawlCoverage.pages,
        commonCrawlUrls: commonCrawlCoverage.urls,
        commonCrawlPercent: commonCrawlCoverage.percentPages,
        commonCrawlMatchedLanguageCount:
          commonCrawlCoverage.matchedLanguages.length,
        commonCrawlMatchedLanguageCodes:
          commonCrawlCoverage.matchedLanguages.map((language) => language.code),
        commonCrawlMatchedLanguageList: commonCrawlCoverage.matchedLanguages
          .slice(0, 12)
          .map(
            (language) =>
              `${language.name} (${language.percentPages.toFixed(4)}%)`
          )
          .join(", "),
        commonCrawlTopLanguage:
          commonCrawlCoverage.topLanguage?.name ?? "No matched language",
        commonCrawlTopLanguageCode:
          commonCrawlCoverage.topLanguage?.code ?? null,
        commonCrawlTopLanguagePercent:
          commonCrawlCoverage.topLanguage?.percentPages ?? 0,
        llmBenchmarkIds,
        llmBenchmarkCount: llmBenchmarkIds.length,
      },
    }
  })
  .filter(Boolean)

const knownCountryLanguageCodes = new Set(
  features.flatMap((feature) => feature.properties.languageCodes)
)
const llmBenchmarkCatalog = llmBenchmarks.map((benchmark) => ({
  ...benchmark,
  matchedLanguageCodes: benchmark.languageCodes.filter((languageCode) =>
    knownCountryLanguageCodes.has(languageCode)
  ),
  countryCount: features.filter((feature) =>
    feature.properties.languageCodes.some((languageCode) =>
      benchmark.languageCodes.includes(languageCode)
    )
  ).length,
}))

const output = {
  type: "FeatureCollection",
  metadata: {
    generatedAt: new Date().toISOString(),
    sources: {
      languages: {
        wikidata: wikidataSparqlUrl,
        cldrSupplementalData: cldrSupplementalDataUrl,
        restCountriesFallback: languagesUrl,
      },
      countryPolygons: countriesUrl,
      commonCrawlLanguages: commonCrawlLanguagesUrl,
    },
    limitation:
      "Country-level language membership is built from Wikidata language-country properties, ordered with CLDR territory-language population/status data where available, and supplemented by REST Countries official-language metadata. This is broader than official-language lists but still not a fully authoritative sub-national language atlas. Common Crawl percentages are global document-language shares from CLD2, summed across the listed country languages that are present in the crawl; listed languages missing from Common Crawl count as zero, and the result is not country-specific web traffic.",
    commonCrawlLatestCrawl: commonCrawl.latestCrawl,
    languageCount: languageCatalog.length,
    countryCount: features.length,
    languages: languageCatalog,
    llmBenchmarks: llmBenchmarkCatalog,
  },
  features,
}

await mkdir("public/data", { recursive: true })
await writeFile(
  "public/data/language-countries.geojson",
  `${JSON.stringify(output)}\n`
)

console.log(
  `Wrote ${features.length} country features covering ${languageCatalog.length} languages and ${llmBenchmarkCatalog.length} LLM benchmark sources.`
)
