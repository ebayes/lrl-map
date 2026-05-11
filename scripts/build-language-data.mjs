import { mkdir, writeFile } from "node:fs/promises"
import { iso6393 } from "iso-639-3"

const countriesUrl =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
const languagesUrl =
  "https://restcountries.com/v3.1/all?fields=name,cca3,languages"
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
    nn: "nor",
    no: "nor",
    pt_br: "por",
    zh_cn: "zho",
    zh_tw: "zho",
  }),
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
    description:
      "OpenAI multilingual MMLU translations covering 14 locales.",
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

async function fetchHuggingFaceLanguages(url) {
  const metadata = await fetchJson(url)

  return metadata.cardData?.language ?? []
}

function normalizeLanguageCode(code) {
  const normalized = code.toLowerCase().replaceAll("-", "_")
  const base = normalized.split("_")[0]
  const aliased = languageCodeAliases.get(normalized) ?? languageCodeAliases.get(base)

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

    return {
      crawl,
      languageCode,
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
    byLanguageCode: new Map(
      rows
        .filter((row) => row.crawl === latestCrawl)
        .map((row) => [row.languageCode, row]),
    ),
  }
}

function colorForLanguage(code) {
  let hash = 0

  for (const char of code) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return palette[hash % palette.length]
}

const [countryPolygons, countryLanguages, commonCrawlCsv] = await Promise.all([
  fetchJson(countriesUrl),
  fetchJson(languagesUrl),
  fetchText(commonCrawlLanguagesUrl),
])

const commonCrawl = parseCommonCrawlLanguages(commonCrawlCsv)
const llmBenchmarks = await buildBenchmarkCatalog()

const languagesByIso3 = new Map(
  countryLanguages
    .filter((country) => country.cca3 && country.languages)
    .map((country) => [
      country.cca3,
      {
        countryName: country.name?.common ?? country.cca3,
        languages: Object.entries(country.languages)
          .map(([code, name]) => ({ code, name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
    ]),
)

const languageCounts = new Map()

for (const country of languagesByIso3.values()) {
  for (const language of country.languages) {
    languageCounts.set(language.code, (languageCounts.get(language.code) ?? 0) + 1)
  }
}

const languageCatalog = Array.from(
  new Map(
    countryLanguages.flatMap((country) =>
      Object.entries(country.languages ?? {}).map(([code, name]) => [
        code,
        {
          code,
          name,
          color: colorForLanguage(code),
          countryCount: languageCounts.get(code) ?? 0,
          commonCrawlLatestCrawl: commonCrawl.latestCrawl,
          commonCrawlPages:
            commonCrawl.byLanguageCode.get(code)?.pages ?? 0,
          commonCrawlUrls:
            commonCrawl.byLanguageCode.get(code)?.urls ?? 0,
          commonCrawlPercent:
            commonCrawl.byLanguageCode.get(code)?.percentPages ?? 0,
        },
      ]),
    ),
  ).values(),
).sort((a, b) => a.name.localeCompare(b.name))

const features = countryPolygons.features
  .map((feature) => {
    const iso3 = feature.properties["ISO3166-1-Alpha-3"]
    const languageData = languagesByIso3.get(iso3)

    if (!languageData?.languages.length) {
      return null
    }

    const primaryLanguage = languageData.languages[0]
    const primaryLanguageCommonCrawl =
      commonCrawl.byLanguageCode.get(primaryLanguage.code)
    const languageCodes = languageData.languages.map((language) => language.code)
    const llmBenchmarkIds = llmBenchmarks
      .filter((benchmark) =>
        languageCodes.some((languageCode) =>
          benchmark.languageCodes.includes(languageCode),
        ),
      )
      .map((benchmark) => benchmark.id)

    return {
      ...feature,
      properties: {
        iso3,
        iso2: feature.properties["ISO3166-1-Alpha-2"],
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
        commonCrawlPages: primaryLanguageCommonCrawl?.pages ?? 0,
        commonCrawlUrls: primaryLanguageCommonCrawl?.urls ?? 0,
        commonCrawlPercent: primaryLanguageCommonCrawl?.percentPages ?? 0,
        llmBenchmarkIds,
        llmBenchmarkCount: llmBenchmarkIds.length,
      },
    }
  })
  .filter(Boolean)

const knownCountryLanguageCodes = new Set(
  features.flatMap((feature) => feature.properties.languageCodes),
)
const llmBenchmarkCatalog = llmBenchmarks.map((benchmark) => ({
  ...benchmark,
  matchedLanguageCodes: benchmark.languageCodes.filter((languageCode) =>
    knownCountryLanguageCodes.has(languageCode),
  ),
  countryCount: features.filter((feature) =>
    feature.properties.languageCodes.some((languageCode) =>
      benchmark.languageCodes.includes(languageCode),
    ),
  ).length,
}))

const output = {
  type: "FeatureCollection",
  metadata: {
    generatedAt: new Date().toISOString(),
    sources: {
      languages: languagesUrl,
      countryPolygons: countriesUrl,
      commonCrawlLanguages: commonCrawlLanguagesUrl,
    },
    limitation:
      "Country-level languages from REST Countries. Common Crawl percentages are global document-language shares from CLD2, joined to countries by listed language. This does not model sub-national language regions, every minority language community, or country-specific web representation.",
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
  `${JSON.stringify(output)}\n`,
)

console.log(
  `Wrote ${features.length} country features covering ${languageCatalog.length} languages and ${llmBenchmarkCatalog.length} LLM benchmark sources.`,
)
