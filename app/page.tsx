"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Map, MapPopup, useMap } from "@/components/ui/map"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl"

const LANGUAGE_GEOJSON_URL = "/data/language-countries.geojson"
const LANGUAGE_GEOJSON_REQUEST_URL = `${LANGUAGE_GEOJSON_URL}?v=${Date.now()}`
const LANGUAGE_FILL_LAYER_ID = "language-countries-fill"
const LANGUAGE_OUTLINE_LAYER_ID = "language-countries-outline"
const COMMON_CRAWL_FILL_LAYER_ID = "common-crawl-language-fill"
const LLM_BENCHMARK_FILL_LAYER_ID = "llm-benchmark-coverage-fill"
const LANGUAGE_SOURCE_ID = "language-countries"
const DEFAULT_MAP_CENTER: [number, number] = [0, 12]
const DEFAULT_MAP_ZOOM = 1.25

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

type LanguageFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  {
    languageCodes?: string[]
  }
>

type CountryPopup = {
  country: string
  languages: string[]
  commonCrawlPercent: number
  commonCrawlMatchedLanguageCount: number
  commonCrawlMatchedLanguageList: string
  commonCrawlTopLanguage: string
  commonCrawlTopLanguagePercent: number
  llmBenchmarkCount: number
  llmBenchmarkNames: string
  primaryLanguage: string
  longitude: number
  latitude: number
}

function ControlsPanel({
  activeLayer,
  languages,
  selectedLanguageCode,
  onLayerChange,
  onLanguageChange,
}: {
  activeLayer: "languages" | "commonCrawl" | "none"
  languages: LanguageMeta[]
  selectedLanguageCode: string
  onLayerChange: (layer: "languages" | "commonCrawl" | "none") => void
  onLanguageChange: (languageCode: string) => void
}) {
  const selectedLanguageLabel =
    selectedLanguageCode === "all"
      ? "All languages"
      : (languages.find((language) => language.code === selectedLanguageCode)
          ?.name ?? "All languages")

  return (
    <aside className="absolute top-3 right-3 z-10 flex w-72 flex-col gap-2 sm:top-7 sm:right-7">
      <Card
        size="sm"
        className="gap-2 bg-background/95 shadow-lg shadow-black/10 backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle>Layers</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <LayerControlRow
            label="Languages"
            isActive={activeLayer === "languages"}
            onOff={() => {
              if (activeLayer === "languages") onLayerChange("none")
            }}
            onOn={() => onLayerChange("languages")}
          />
          <LayerControlRow
            label="Common Crawl"
            isActive={activeLayer === "commonCrawl"}
            onOff={() => {
              if (activeLayer === "commonCrawl") onLayerChange("none")
            }}
            onOn={() => onLayerChange("commonCrawl")}
          />
        </CardContent>
      </Card>

      <Card
        size="sm"
        className="gap-2 bg-background/95 shadow-lg shadow-black/10 backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle>Language</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedLanguageCode}
            onValueChange={(value) => onLanguageChange(String(value))}
          >
            <SelectTrigger className="w-full bg-muted/70">
              <span className="text-muted-foreground">Lang</span>
              <span className="truncate text-left">
                {selectedLanguageLabel}
              </span>
            </SelectTrigger>
            <SelectContent
              align="end"
              alignItemWithTrigger={false}
              className="max-h-80"
            >
              <SelectGroup>
                <SelectItem value="all">All languages</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </aside>
  )
}

function LayerControlRow({
  label,
  isActive,
  onOff,
  onOn,
}: {
  label: string
  isActive: boolean
  onOff: () => void
  onOn: () => void
}) {
  return (
    <div className="flex h-9 items-center justify-between rounded-lg bg-muted/70 px-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={!isActive ? "secondary" : "ghost"}
          size="sm"
          onClick={onOff}
        >
          Off
        </Button>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="sm"
          onClick={onOn}
        >
          On
        </Button>
      </div>
    </div>
  )
}

function CommonCrawlLegend() {
  return (
    <section className="rounded-lg border border-border/70 bg-background/95 p-3 text-foreground shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex flex-col gap-2.5">
        <div>
          <div className="text-sm font-medium">Web language share</div>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            Color shows how much of Common Crawl&apos;s public web snapshot is
            written in this country&apos;s listed languages.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 rounded-full bg-[linear-gradient(to_right,rgba(255,247,188,0),#fff7bc_8%,#fee391_18%,#fec44f_36%,#fe9929_58%,#d7301f_82%,#7f0000_100%)] ring-1 ring-black/10" />
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>0%</span>
            <span>10%</span>
            <span>45%+</span>
          </div>
          <p className="text-[11px] leading-4 text-muted-foreground">
            Yellow means these languages are rare in the snapshot; dark red
            means they appear often.
          </p>
        </div>
      </div>
    </section>
  )
}

function LanguageCountryLayers({
  selectedLanguageCode,
  selectedBenchmarkId,
  showCommonCrawl,
  showLlmBenchmarks,
  showLanguages,
  benchmarks,
  countryFeatures,
  onCountryClick,
}: {
  selectedLanguageCode: string
  selectedBenchmarkId: string
  showCommonCrawl: boolean
  showLlmBenchmarks: boolean
  showLanguages: boolean
  benchmarks: BenchmarkMeta[]
  countryFeatures: LanguageFeature[]
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
        data: LANGUAGE_GEOJSON_REQUEST_URL,
      })
    } else {
      const source = map.getSource(LANGUAGE_SOURCE_ID) as
        | GeoJSONSource
        | undefined

      if (source) {
        source.setData(LANGUAGE_GEOJSON_REQUEST_URL)
      }
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
      const languages = Array.isArray(feature.properties.languages)
        ? feature.properties.languages.map(String)
        : String(feature.properties.languageList ?? "")
            .split(",")
            .map((language) => language.trim())
            .filter(Boolean)

      onCountryClick({
        country: String(feature.properties.country ?? "Unknown country"),
        languages,
        primaryLanguage: String(
          feature.properties.primaryLanguage ?? "Unknown language"
        ),
        commonCrawlPercent: Number(feature.properties.commonCrawlPercent ?? 0),
        commonCrawlMatchedLanguageCount: Number(
          feature.properties.commonCrawlMatchedLanguageCount ?? 0
        ),
        commonCrawlMatchedLanguageList: String(
          feature.properties.commonCrawlMatchedLanguageList ??
            "None of these languages were found in Common Crawl"
        ),
        commonCrawlTopLanguage: String(
          feature.properties.commonCrawlTopLanguage ?? "No language found"
        ),
        commonCrawlTopLanguagePercent: Number(
          feature.properties.commonCrawlTopLanguagePercent ?? 0
        ),
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

  useEffect(() => {
    if (!map) return

    if (selectedLanguageCode === "all") {
      map.easeTo({
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        duration: 900,
      })
      return
    }

    const bounds = boundsForLanguage(countryFeatures, selectedLanguageCode)

    if (!bounds) return

    map.fitBounds(bounds, {
      padding: 72,
      duration: 900,
      maxZoom: 4.5,
    })
  }, [countryFeatures, map, selectedLanguageCode])

  return null
}

function boundsForLanguage(
  features: LanguageFeature[],
  languageCode: string
): [[number, number], [number, number]] | null {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const feature of features) {
    if (!feature.properties.languageCodes?.includes(languageCode)) continue
    if (feature.geometry.type === "GeometryCollection") continue

    walkCoordinates(feature.geometry.coordinates, (lng, lat) => {
      minLng = Math.min(minLng, lng)
      minLat = Math.min(minLat, lat)
      maxLng = Math.max(maxLng, lng)
      maxLat = Math.max(maxLat, lat)
    })
  }

  if (
    !Number.isFinite(minLng) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLng) ||
    !Number.isFinite(maxLat)
  ) {
    return null
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

function walkCoordinates(
  coordinates: unknown,
  visit: (lng: number, lat: number) => void
) {
  if (!Array.isArray(coordinates)) return

  if (typeof coordinates[0] === "number") {
    const [lng, lat] = coordinates as GeoJSON.Position
    visit(lng, lat)
    return
  }

  for (const child of coordinates) {
    walkCoordinates(child, visit)
  }
}

export default function Page() {
  const [languages, setLanguages] = useState<LanguageMeta[]>([])
  const [benchmarks, setBenchmarks] = useState<BenchmarkMeta[]>([])
  const [countryFeatures, setCountryFeatures] = useState<LanguageFeature[]>([])
  const [countryPopup, setCountryPopup] = useState<CountryPopup | null>(null)
  const [showAllPopupLanguages, setShowAllPopupLanguages] = useState(false)
  const [selectedLanguageCode, setSelectedLanguageCode] = useState("all")
  const [activeLayer, setActiveLayer] = useState<
    "languages" | "commonCrawl" | "none"
  >("languages")

  useEffect(() => {
    async function loadLanguageMetadata() {
      const response = await fetch(LANGUAGE_GEOJSON_REQUEST_URL, {
        cache: "no-store",
      })
      const geojson = await response.json()
      setLanguages(geojson.metadata.languages)
      setBenchmarks(geojson.metadata.llmBenchmarks)
      setCountryFeatures(geojson.features)
    }

    loadLanguageMetadata()
  }, [])

  const popupLanguagePreview = countryPopup
    ? countryPopup.languages
        .slice(0, showAllPopupLanguages ? undefined : 10)
        .join(", ")
    : ""
  const hiddenPopupLanguageCount = countryPopup
    ? Math.max(countryPopup.languages.length - 10, 0)
    : 0

  function handleLanguageChange(languageCode: string) {
    setSelectedLanguageCode(languageCode)

    if (languageCode !== "all") {
      setActiveLayer("languages")
    }
  }

  return (
    <main className="relative h-svh overflow-hidden bg-muted/50 p-4">
      <div className="relative h-full overflow-hidden rounded-3xl">
        <Map
          center={DEFAULT_MAP_CENTER}
          zoom={DEFAULT_MAP_ZOOM}
          minZoom={0.8}
          maxZoom={8}
          attributionControl={false}
        >
          <LanguageCountryLayers
            selectedLanguageCode={selectedLanguageCode}
            selectedBenchmarkId="all"
            showCommonCrawl={activeLayer === "commonCrawl"}
            showLlmBenchmarks={false}
            showLanguages={activeLayer === "languages"}
            benchmarks={benchmarks}
            countryFeatures={countryFeatures}
            onCountryClick={(country) => {
              setCountryPopup(country)
              setShowAllPopupLanguages(false)
            }}
          />
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
                  {popupLanguagePreview || "No languages"}
                  {!showAllPopupLanguages && hiddenPopupLanguageCount > 0 ? (
                    <>
                      {" "}
                      <span>+ {hiddenPopupLanguageCount}</span>{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => setShowAllPopupLanguages(true)}
                      >
                        Show all
                      </button>
                    </>
                  ) : null}
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  Web snapshot: about{" "}
                  {countryPopup.commonCrawlPercent.toFixed(4)}% of pages are in
                  this country&apos;s listed languages.
                  {countryPopup.commonCrawlMatchedLanguageCount > 0
                    ? ` Biggest share: ${countryPopup.commonCrawlTopLanguage} (${countryPopup.commonCrawlTopLanguagePercent.toFixed(4)}%).`
                    : countryPopup.commonCrawlPercent > 0
                      ? " Some of these languages were found, but the detail list needs a refresh."
                      : " None of these languages were found in Common Crawl."}
                </div>
                {countryPopup.commonCrawlMatchedLanguageCount > 1 ? (
                  <div className="text-xs text-muted-foreground">
                    Found: {countryPopup.commonCrawlMatchedLanguageList}
                  </div>
                ) : null}
                <div className="text-[11px] leading-4 text-muted-foreground">
                  This is about languages on the public web, not internet use
                  inside the country.
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  AI test sets: {countryPopup.llmBenchmarkCount} include one of
                  these languages.
                  {countryPopup.llmBenchmarkCount > 0
                    ? ` ${countryPopup.llmBenchmarkNames}`
                    : ""}
                </div>
              </div>
            </MapPopup>
          ) : null}
        </Map>

        <ControlsPanel
          activeLayer={activeLayer}
          languages={languages}
          selectedLanguageCode={selectedLanguageCode}
          onLayerChange={setActiveLayer}
          onLanguageChange={handleLanguageChange}
        />

        {activeLayer === "commonCrawl" ? (
          <aside className="absolute right-3 bottom-3 left-3 z-10 flex flex-col gap-2 sm:left-auto sm:w-72">
            <CommonCrawlLegend />
          </aside>
        ) : null}
      </div>
    </main>
  )
}
