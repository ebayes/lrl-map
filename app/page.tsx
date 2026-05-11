"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Map, MapControls, MapPopup, useMap } from "@/components/ui/map"

import type { MapLayerMouseEvent } from "maplibre-gl"

const LANGUAGE_GEOJSON_URL = "/data/language-countries.geojson"
const LANGUAGE_FILL_LAYER_ID = "language-countries-fill"
const LANGUAGE_OUTLINE_LAYER_ID = "language-countries-outline"
const COMMON_CRAWL_FILL_LAYER_ID = "common-crawl-language-fill"
const LLM_BENCHMARK_FILL_LAYER_ID = "llm-benchmark-coverage-fill"
const LANGUAGE_SOURCE_ID = "language-countries"

type LanguageMeta = {
  code: string
  name: string
  color: string
  countryCount: number
  commonCrawlPercent: number
}

type BenchmarkMeta = {
  id: string
  name: string
  shortName: string
  sourceType: string
  sourceUrl: string
  paperUrl: string
  description: string
  rawLanguageCount: number
  languageCodes: string[]
  matchedLanguageCodes: string[]
  countryCount: number
}

type CountryPopup = {
  country: string
  languages: string
  commonCrawlPercent: number
  llmBenchmarkCount: number
  llmBenchmarkNames: string
  primaryLanguage: string
  longitude: number
  latitude: number
}

function LanguageCountryLayers({
  selectedLanguageCode,
  selectedBenchmarkId,
  showCommonCrawl,
  showLlmBenchmarks,
  showLanguages,
  benchmarks,
  onCountryClick,
}: {
  selectedLanguageCode: string
  selectedBenchmarkId: string
  showCommonCrawl: boolean
  showLlmBenchmarks: boolean
  showLanguages: boolean
  benchmarks: BenchmarkMeta[]
  onCountryClick: (country: CountryPopup) => void
}) {
  const { map, isLoaded } = useMap()
  const benchmarkNameById = useMemo(
    () =>
      new globalThis.Map(
        benchmarks.map((benchmark) => [benchmark.id, benchmark.name])
      ),
    [benchmarks]
  )

  useEffect(() => {
    if (!map || !isLoaded) return

    if (!map.getSource(LANGUAGE_SOURCE_ID)) {
      map.addSource(LANGUAGE_SOURCE_ID, {
        type: "geojson",
        data: LANGUAGE_GEOJSON_URL,
      })
    }

    if (!map.getLayer(LANGUAGE_FILL_LAYER_ID)) {
      map.addLayer({
        id: LANGUAGE_FILL_LAYER_ID,
        type: "fill",
        source: LANGUAGE_SOURCE_ID,
        paint: {
          "fill-color": ["get", "primaryLanguageColor"],
          "fill-opacity": 0.42,
        },
      })
    }

    if (!map.getLayer(LANGUAGE_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: LANGUAGE_OUTLINE_LAYER_ID,
        type: "line",
        source: LANGUAGE_SOURCE_ID,
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.68,
          "line-width": 0.8,
        },
      })
    }

    if (!map.getLayer(COMMON_CRAWL_FILL_LAYER_ID)) {
      map.addLayer({
        id: COMMON_CRAWL_FILL_LAYER_ID,
        type: "fill",
        source: LANGUAGE_SOURCE_ID,
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "commonCrawlPercent"],
            0,
            "rgba(255, 247, 188, 0)",
            0.001,
            "#fff7bc",
            0.01,
            "#fee391",
            0.1,
            "#fec44f",
            1,
            "#fe9929",
            10,
            "#d7301f",
            45,
            "#7f0000",
          ],
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "commonCrawlPercent"],
            0,
            0,
            0.001,
            0.22,
            0.1,
            0.42,
            1,
            0.58,
            10,
            0.72,
          ],
        },
      })
    }

    if (!map.getLayer(LLM_BENCHMARK_FILL_LAYER_ID)) {
      map.addLayer({
        id: LLM_BENCHMARK_FILL_LAYER_ID,
        type: "fill",
        source: LANGUAGE_SOURCE_ID,
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "llmBenchmarkCount"],
            0,
            "rgba(255, 247, 188, 0)",
            1,
            "#fff7bc",
            3,
            "#fee391",
            5,
            "#fec44f",
            7,
            "#fe9929",
            10,
            "#d7301f",
          ],
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["get", "llmBenchmarkCount"],
            0,
            0,
            1,
            0.28,
            5,
            0.52,
            10,
            0.72,
          ],
        },
      })
    }

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]

      if (!feature?.properties) return

      const llmBenchmarkIds = Array.isArray(feature.properties.llmBenchmarkIds)
        ? feature.properties.llmBenchmarkIds
        : JSON.parse(String(feature.properties.llmBenchmarkIds ?? "[]"))
      const llmBenchmarkNames = llmBenchmarkIds
        .map((benchmarkId: string) => benchmarkNameById.get(benchmarkId))
        .filter(Boolean)
        .join(", ")

      onCountryClick({
        country: String(feature.properties.country ?? "Unknown country"),
        languages: String(feature.properties.languageList ?? "No languages"),
        primaryLanguage: String(
          feature.properties.primaryLanguage ?? "Unknown language"
        ),
        commonCrawlPercent: Number(feature.properties.commonCrawlPercent ?? 0),
        llmBenchmarkCount: Number(feature.properties.llmBenchmarkCount ?? 0),
        llmBenchmarkNames:
          llmBenchmarkNames || "No selected benchmark coverage",
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      })
    }

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer"
    }

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ""
    }

    map.on("click", LANGUAGE_FILL_LAYER_ID, handleClick)
    map.on("click", COMMON_CRAWL_FILL_LAYER_ID, handleClick)
    map.on("click", LLM_BENCHMARK_FILL_LAYER_ID, handleClick)
    map.on("mouseenter", LANGUAGE_FILL_LAYER_ID, handleMouseEnter)
    map.on("mouseenter", COMMON_CRAWL_FILL_LAYER_ID, handleMouseEnter)
    map.on("mouseenter", LLM_BENCHMARK_FILL_LAYER_ID, handleMouseEnter)
    map.on("mouseleave", LANGUAGE_FILL_LAYER_ID, handleMouseLeave)
    map.on("mouseleave", COMMON_CRAWL_FILL_LAYER_ID, handleMouseLeave)
    map.on("mouseleave", LLM_BENCHMARK_FILL_LAYER_ID, handleMouseLeave)

    return () => {
      map.off("click", LANGUAGE_FILL_LAYER_ID, handleClick)
      map.off("click", COMMON_CRAWL_FILL_LAYER_ID, handleClick)
      map.off("click", LLM_BENCHMARK_FILL_LAYER_ID, handleClick)
      map.off("mouseenter", LANGUAGE_FILL_LAYER_ID, handleMouseEnter)
      map.off("mouseenter", COMMON_CRAWL_FILL_LAYER_ID, handleMouseEnter)
      map.off("mouseenter", LLM_BENCHMARK_FILL_LAYER_ID, handleMouseEnter)
      map.off("mouseleave", LANGUAGE_FILL_LAYER_ID, handleMouseLeave)
      map.off("mouseleave", COMMON_CRAWL_FILL_LAYER_ID, handleMouseLeave)
      map.off("mouseleave", LLM_BENCHMARK_FILL_LAYER_ID, handleMouseLeave)
    }
  }, [map, isLoaded, onCountryClick, benchmarkNameById])

  useEffect(() => {
    if (!map || !map.getLayer(LANGUAGE_FILL_LAYER_ID)) return

    const visibility = showLanguages ? "visible" : "none"
    map.setLayoutProperty(LANGUAGE_FILL_LAYER_ID, "visibility", visibility)
    map.setLayoutProperty(LANGUAGE_OUTLINE_LAYER_ID, "visibility", visibility)
  }, [map, showLanguages])

  useEffect(() => {
    if (!map || !map.getLayer(COMMON_CRAWL_FILL_LAYER_ID)) return

    map.setLayoutProperty(
      COMMON_CRAWL_FILL_LAYER_ID,
      "visibility",
      showCommonCrawl ? "visible" : "none"
    )
  }, [map, showCommonCrawl])

  useEffect(() => {
    if (!map || !map.getLayer(LLM_BENCHMARK_FILL_LAYER_ID)) return

    map.setLayoutProperty(
      LLM_BENCHMARK_FILL_LAYER_ID,
      "visibility",
      showLlmBenchmarks ? "visible" : "none"
    )
  }, [map, showLlmBenchmarks])

  useEffect(() => {
    if (!map || !map.getLayer(LLM_BENCHMARK_FILL_LAYER_ID)) return

    if (selectedBenchmarkId === "all") {
      map.setPaintProperty(LLM_BENCHMARK_FILL_LAYER_ID, "fill-color", [
        "interpolate",
        ["linear"],
        ["get", "llmBenchmarkCount"],
        0,
        "rgba(255, 247, 188, 0)",
        1,
        "#fff7bc",
        3,
        "#fee391",
        5,
        "#fec44f",
        7,
        "#fe9929",
        10,
        "#d7301f",
      ])
      map.setPaintProperty(LLM_BENCHMARK_FILL_LAYER_ID, "fill-opacity", [
        "interpolate",
        ["linear"],
        ["get", "llmBenchmarkCount"],
        0,
        0,
        1,
        0.28,
        5,
        0.52,
        10,
        0.72,
      ])
      return
    }

    map.setPaintProperty(LLM_BENCHMARK_FILL_LAYER_ID, "fill-color", [
      "case",
      ["in", ["literal", selectedBenchmarkId], ["get", "llmBenchmarkIds"]],
      "#7f0000",
      "#d8dadd",
    ])
    map.setPaintProperty(LLM_BENCHMARK_FILL_LAYER_ID, "fill-opacity", [
      "case",
      ["in", ["literal", selectedBenchmarkId], ["get", "llmBenchmarkIds"]],
      0.72,
      0.1,
    ])
  }, [map, selectedBenchmarkId])

  useEffect(() => {
    if (!map || !map.getLayer(LANGUAGE_FILL_LAYER_ID)) return

    if (selectedLanguageCode === "all") {
      map.setPaintProperty(LANGUAGE_FILL_LAYER_ID, "fill-color", [
        "get",
        "primaryLanguageColor",
      ])
      map.setPaintProperty(LANGUAGE_FILL_LAYER_ID, "fill-opacity", 0.42)
      map.setPaintProperty(LANGUAGE_OUTLINE_LAYER_ID, "line-opacity", 0.68)
      return
    }

    map.setPaintProperty(LANGUAGE_FILL_LAYER_ID, "fill-color", [
      "case",
      ["in", selectedLanguageCode, ["get", "languageCodes"]],
      "#d7301f",
      "#d8dadd",
    ])
    map.setPaintProperty(LANGUAGE_FILL_LAYER_ID, "fill-opacity", [
      "case",
      ["in", selectedLanguageCode, ["get", "languageCodes"]],
      0.7,
      0.12,
    ])
    map.setPaintProperty(LANGUAGE_OUTLINE_LAYER_ID, "line-opacity", 0.52)
  }, [map, selectedLanguageCode])

  return null
}

export default function Page() {
  const [showLanguages, setShowLanguages] = useState(true)
  const [showCommonCrawl, setShowCommonCrawl] = useState(false)
  const [showLlmBenchmarks, setShowLlmBenchmarks] = useState(false)
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("all")
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState("all")
  const [languages, setLanguages] = useState<LanguageMeta[]>([])
  const [benchmarks, setBenchmarks] = useState<BenchmarkMeta[]>([])
  const [countryPopup, setCountryPopup] = useState<CountryPopup | null>(null)

  useEffect(() => {
    async function loadLanguageMetadata() {
      const response = await fetch(LANGUAGE_GEOJSON_URL)
      const geojson = await response.json()
      setLanguages(geojson.metadata.languages)
      setBenchmarks(geojson.metadata.llmBenchmarks)
    }

    loadLanguageMetadata()
  }, [])

  const selectedLanguage = useMemo(
    () =>
      selectedLanguageCode === "all"
        ? null
        : languages.find((language) => language.code === selectedLanguageCode),
    [languages, selectedLanguageCode]
  )
  const selectedBenchmark = useMemo(
    () =>
      selectedBenchmarkId === "all"
        ? null
        : benchmarks.find((benchmark) => benchmark.id === selectedBenchmarkId),
    [benchmarks, selectedBenchmarkId]
  )

  return (
    <main className="relative h-svh overflow-hidden bg-muted/50 p-5">
      <div className="relative h-full overflow-hidden rounded-3xl">
        <Map center={[0, 12]} zoom={1.25} minZoom={0.8} maxZoom={8}>
          <LanguageCountryLayers
            selectedLanguageCode={selectedLanguageCode}
            selectedBenchmarkId={selectedBenchmarkId}
            showCommonCrawl={showCommonCrawl}
            showLlmBenchmarks={showLlmBenchmarks}
            showLanguages={showLanguages}
            benchmarks={benchmarks}
            onCountryClick={setCountryPopup}
          />
          <MapControls position="bottom-right" showCompass showFullscreen />
          {countryPopup ? (
            <MapPopup
              longitude={countryPopup.longitude}
              latitude={countryPopup.latitude}
              closeButton
              onClose={() => setCountryPopup(null)}
            >
              <div className="flex max-w-64 flex-col gap-1">
                <div className="font-medium">{countryPopup.country}</div>
                <div className="text-xs text-muted-foreground">
                  {countryPopup.languages}
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  Common Crawl: {countryPopup.primaryLanguage} is{" "}
                  {countryPopup.commonCrawlPercent.toFixed(4)}% of latest crawl
                  pages.
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  LLM benchmarks: {countryPopup.llmBenchmarkCount} matched.
                  {countryPopup.llmBenchmarkCount > 0
                    ? ` ${countryPopup.llmBenchmarkNames}`
                    : ""}
                </div>
              </div>
            </MapPopup>
          ) : null}
        </Map>
      </div>

      <Card className="absolute top-10 left-10 z-10 w-80" size="sm">
        <CardHeader>
          <CardTitle>Layers</CardTitle>
          <CardDescription>
            Country-level language coverage from REST Countries.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showLanguages}
              onCheckedChange={(checked) => setShowLanguages(Boolean(checked))}
            />
            Languages by country
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showCommonCrawl}
              onCheckedChange={(checked) =>
                setShowCommonCrawl(Boolean(checked))
              }
            />
            Common Crawl representation
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showLlmBenchmarks}
              onCheckedChange={(checked) =>
                setShowLlmBenchmarks(Boolean(checked))
              }
            />
            LLM benchmark coverage
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Highlight language</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={selectedLanguageCode}
              onChange={(event) => setSelectedLanguageCode(event.target.value)}
            >
              <option value="all">All primary country languages</option>
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Benchmark source</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={selectedBenchmarkId}
              onChange={(event) => setSelectedBenchmarkId(event.target.value)}
            >
              <option value="all">All benchmark sources</option>
              {benchmarks.map((benchmark) => (
                <option key={benchmark.id} value={benchmark.id}>
                  {benchmark.shortName}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
            {selectedBenchmark ? (
              <>
                {selectedBenchmark.name} maps to{" "}
                {selectedBenchmark.matchedLanguageCodes.length} listed country
                languages across {selectedBenchmark.countryCount} countries.
              </>
            ) : selectedLanguage ? (
              <>
                {selectedLanguage.name} appears in{" "}
                {selectedLanguage.countryCount}{" "}
                {selectedLanguage.countryCount === 1 ? "country" : "countries"}.{" "}
                Common Crawl share:{" "}
                {selectedLanguage.commonCrawlPercent.toFixed(4)}%.
              </>
            ) : (
              <>
                Showing each country by its first listed language. Select a
                language to highlight all countries where it is listed.
              </>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-5 gap-1.5">
              {["#fff7bc", "#fee391", "#fec44f", "#fe9929", "#d7301f"].map(
                (color) => (
                  <span
                    key={color}
                    className="h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Lower web share</span>
              <span>Higher</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
