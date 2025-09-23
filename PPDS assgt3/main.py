"""
Main ETL: Met Museum API (API) + Exhibitions scrape (Website) + DeepSeek enrichment (AI).

Outputs:
- data/raw/met_artworks_raw.json
- data/raw/exhibitions_raw.json
- data/enriched/artworks_enriched.csv
- data/enriched/exhibitions_enriched.csv
- data/enriched/links_artworks_exhibitions.csv   # simple cross-links by token overlap
- examples/before_after.json
- examples/sample_artworks_before.csv / after.csv
- examples/sample_exhibitions_before.csv / after.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

# --- load .env explicitly so CLI runs always see it ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from deepseek_enrichment import (  # noqa: E402
    enrich_artwork_row,
    enrich_exhibition_row,
)

# ====================== Paths / setup ======================
@dataclass
class Paths:
    raw_artworks: str = "data/raw/met_artworks_raw.json"
    raw_exhibitions: str = "data/raw/exhibitions_raw.json"
    enriched_artworks: str = "data/enriched/artworks_enriched.csv"
    enriched_exhibitions: str = "data/enriched/exhibitions_enriched.csv"
    links: str = "data/enriched/links_artworks_exhibitions.csv"


def ensure_dirs() -> None:
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("data/enriched", exist_ok=True)
    os.makedirs("examples", exist_ok=True)


# ====================== Met Museum API ======================
@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=8),
    retry=retry_if_exception_type((requests.RequestException,)),
)
def met_search_object_ids(
    query: str, department_id: Optional[int] = None, has_images: bool = True
) -> List[int]:
    params = {"q": query, "hasImages": str(has_images).lower()}
    if department_id is not None:
        params["departmentId"] = int(department_id)
    r = requests.get(
        "https://collectionapi.metmuseum.org/public/collection/v1/search",
        params=params,
        timeout=60,
    )
    r.raise_for_status()
    ids = r.json().get("objectIDs") or []
    print(
        f"[Met search] query={query!r} dept={department_id} "
        f"hasImages={has_images} -> {len(ids)} ids"
    )
    return ids[:500]


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=8),
    retry=retry_if_exception_type((requests.RequestException,)),
)
def met_get_object(object_id: int) -> Dict[str, Any]:
    r = requests.get(
        f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}",
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


def fetch_met_artworks(
    query: str,
    department: Optional[int],
    max_artworks: int = 30,
    has_images: bool = True,
) -> List[Dict[str, Any]]:
    ids = met_search_object_ids(query, department_id=department, has_images=has_images)
    out: List[Dict[str, Any]] = []
    ok = 0
    for oid in ids[:max_artworks]:
        try:
            o = met_get_object(oid)
            out.append(
                {
                    "objectID": o.get("objectID"),
                    "title": o.get("title"),
                    "artist": o.get("artistDisplayName") or o.get("artistRole"),
                    "culture": o.get("culture"),
                    "period": o.get("period"),
                    "medium": o.get("medium"),
                    "objectDate": o.get("objectDate"),
                    "department": o.get("department"),
                    "primaryImageSmall": o.get("primaryImageSmall"),
                }
            )
            ok += 1
            time.sleep(0.05)
        except Exception:
            continue
    print(f"[Met objects] fetched {ok}/{min(len(ids), max_artworks)}")
    return out


# ====================== Exhibitions scrape ======================
EXHIBITION_HINT_PAT = re.compile(r"(exhibition|exhibitions|on view|current)", re.I)
FALLBACK_EXHIBITION_URLS = [
    "https://www.metmuseum.org/exhibitions",
    "https://www.metmuseum.org/en/exhibitions/past",
]

DETAIL_URL_RE = re.compile(r"/exhibitions/[^/]+/?$", re.I)

# Broadened date patterns to catch "Through/Until ..." and "Opens ..." as well.
DATE_RE = re.compile(
    r"""(?ix)
    (?:                                    # "Month Day, Year – Month Day, Year" (or 'to'/'-')
        (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?
        |Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)   # month
        [^\d]{0,3}\d{1,2},?\s*\d{4}        # day, year
        \s*(?:–|-|to)\s*
        (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?
        |Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)
        [^\d]{0,3}\d{1,2},?\s*\d{4}
    )
    |
    (?:                                    # ISO ranges
        \d{4}-\d{2}-\d{2}\s*(?:–|-|to)\s*\d{4}-\d{2}-\d{2}
    )
    |
    (?:                                    # "Through/Until" single date
        (?:through|until|thru)\s+
        (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?
        |Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)
        [^\d]{0,3}\d{1,2},?\s*\d{4}
    )
    |
    (?:                                    # "Opens/Opening" single date
        (?:opens?|opening)\s+
        (?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?
        |Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)
        [^\d]{0,3}\d{1,2},?\s*\d{4}
    )
    """,
)

LOC_PAT = re.compile(r"(The Met (Fifth Avenue|Cloisters|Breuer)|Gallery\s+\d+|Floor\s+\w+)", re.I)


def _is_exhibition_detail_url(url: str) -> bool:
    u = url.rstrip("/")
    if u.endswith("/exhibitions") or u.endswith("/exhibitions/past"):
        return False
    return bool(DETAIL_URL_RE.search(u))


def _norm_en(url: str) -> str:
    # ensure language prefix; Met commonly uses /en/ on details
    if "://www.metmuseum.org/en/" in url or "://www.metmuseum.org/exhibitions" not in url:
        return url
    return url.replace("://www.metmuseum.org/", "://www.metmuseum.org/en/", 1)


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=8),
    retry=retry_if_exception_type((requests.RequestException,)),
)
def fetch_html(url: str) -> BeautifulSoup:
    r = requests.get(url, headers={"User-Agent": "edu-scraper/1.0"}, timeout=60)
    r.raise_for_status()
    return BeautifulSoup(r.text, "lxml")


def _try_pages(url: str) -> List[BeautifulSoup]:
    # try original, /en/ normalized, and AMP version
    variants = [url, _norm_en(url)]
    if "?" in url:
        base, _q = url.split("?", 1)
        variants.append(f"{base}?amp=1")
    else:
        variants.append(f"{url}?amp=1")
    soups: List[BeautifulSoup] = []
    for v in variants:
        try:
            soups.append(fetch_html(v))
        except Exception:
            continue
    return soups


def _extract_jsonld(soup: BeautifulSoup) -> Tuple[str, str]:
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or tag.text or "")
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for obj in items:
            if not isinstance(obj, dict):
                continue
            start = obj.get("startDate") or obj.get("start_date")
            end = obj.get("endDate") or obj.get("end_date")
            loc = ""
            loc_obj = obj.get("location") or obj.get("publisher")
            if isinstance(loc_obj, dict):
                loc = (loc_obj.get("name") or loc_obj.get("address") or "").strip()
            if start or end or loc:
                dates = f"{start} – {end}" if start and end else (start or end or "")
                return dates, loc
    return "", ""


def _extract_from_meta(soup: BeautifulSoup) -> Tuple[str, str]:
    # Try paired start/end first.
    start = ""
    end = ""
    for sel, attr in [
        ("meta[itemprop='startDate']", "content"),
        ("meta[property='event:start_date']", "content"),
        ("meta[name='startDate']", "content"),
        ("meta[name='start_date']", "content"),
    ]:
        tag = soup.select_one(sel)
        if tag and tag.get(attr):
            start = tag.get(attr).strip()
            break

    for sel, attr in [
        ("meta[itemprop='endDate']", "content"),
        ("meta[property='event:end_date']", "content"),
        ("meta[name='endDate']", "content"),
        ("meta[name='end_date']", "content"),
    ]:
        tag = soup.select_one(sel)
        if tag and tag.get(attr):
            end = tag.get(attr).strip()
            break

    loc = ""
    for sel, attr in [
        ("meta[property='og:site_name']", "content"),
        ("meta[name='twitter:data1']", "content"),
        ("meta[itemprop='location']", "content"),
    ]:
        tag = soup.select_one(sel)
        if tag and tag.get(attr):
            loc = tag.get(attr).strip()
            break

    dates = f"{start} – {end}" if start and end else (start or end or "")
    if dates or loc:
        return dates, loc

    # last resort: scan all meta contents for a date-like phrase
    meta_text = " ".join(m.get("content", "") for m in soup.find_all("meta"))
    dates = DATE_RE.search(meta_text).group(0) if DATE_RE.search(meta_text) else ""
    return dates, loc


def _extract_from_scripts(soup: BeautifulSoup) -> Tuple[str, str]:
    all_text = " ".join(
        (s.get_text(" ", strip=True) if hasattr(s, "get_text") else s)
        for s in soup.find_all("script")
    )
    dates = DATE_RE.search(all_text).group(0) if DATE_RE.search(all_text) else ""
    loc = LOC_PAT.search(all_text).group(0) if LOC_PAT.search(all_text) else ""
    return dates, loc


def _extract_dates_location_from_dom(soup: BeautifulSoup) -> Tuple[str, str]:
    # <time> tags
    for t in soup.select("time[datetime], time"):
        txt = t.get_text(" ", strip=True)
        if DATE_RE.search(txt):
            return txt, ""
    # common meta blocks
    candidates = soup.select(
        ".exhibition-hero__meta, .exhibition-meta, .meta, .module--meta, "
        ".eyebrow, .meta__item, .details, .at-a-glance"
    )
    block_txt = " ".join(el.get_text(" ", strip=True) for el in candidates)[:4000]
    dates = DATE_RE.search(block_txt).group(0) if DATE_RE.search(block_txt) else ""
    loc = LOC_PAT.search(block_txt).group(0) if LOC_PAT.search(block_txt) else ""
    if not loc:
        for sel in [".location", ".venue", "[itemprop='location']", "[aria-label*=location]"]:
            node = soup.select_one(sel)
            if node:
                loc = node.get_text(" ", strip=True)
                break
    return dates, loc


def _extract_dates_location_any(soups: List[BeautifulSoup]) -> Tuple[str, str]:
    # priority: jsonld → meta → scripts → dom
    for s in soups:
        d, l = _extract_jsonld(s)
        if d or l:
            return d, l
    for s in soups:
        d, l = _extract_from_meta(s)
        if d or l:
            return d, l
    for s in soups:
        d, l = _extract_from_scripts(s)
        if d or l:
            return d, l
    for s in soups:
        d, l = _extract_dates_location_from_dom(s)
        if d or l:
            return d, l
    return "", ""


def parse_exhibitions_listing(url: str) -> List[Dict[str, Any]]:
    tried = []
    soup = None
    for candidate in [url] + [u for u in FALLBACK_EXHIBITION_URLS if u != url]:
        try:
            soup = fetch_html(candidate)
            break
        except Exception:
            tried.append(candidate)
            continue
    if soup is None:
        raise RuntimeError(f"Could not fetch any exhibitions page. Tried: {tried}")

    # collect candidate links
    items: List[Dict[str, Any]] = []
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        text = (a.get_text(" ", strip=True) or "").strip()
        if not text:
            continue
        if "exhibition" in href or EXHIBITION_HINT_PAT.search(text):
            full = href if href.startswith("http") else f"https://www.metmuseum.org{href}"
            items.append({"title": text, "url": full})

    # dedupe & keep only detail pages
    seen = set()
    uniq = []
    for it in items:
        if it["title"] in seen:
            continue
        if not _is_exhibition_detail_url(it["url"]):
            continue
        uniq.append(it)
        seen.add(it["title"])

    detailed: List[Dict[str, Any]] = []
    got_dates = got_loc = 0
    for it in uniq[:30]:
        try:
            soups = _try_pages(it["url"])
            if not soups:
                continue
            head = soups[0]
            title = (head.find("meta", property="og:title") or {}).get("content") or it["title"]
            desc = (head.find("meta", property="og:description") or {}).get("content") or ""
            dates, loc = _extract_dates_location_any(soups)
            if dates:
                got_dates += 1
            if loc:
                got_loc += 1
            detailed.append(
                {
                    "title": title.strip(),
                    "dates": dates,
                    "location": loc,
                    "description": desc.strip(),
                    "url": it["url"],
                }
            )
            time.sleep(0.1)
        except Exception:
            continue

    print(
        f"[Exhibitions] kept {len(detailed)} detail pages | "
        f"dates on {got_dates} | location on {got_loc}"
    )
    # if nothing, fall back to a few titles so the pipeline still runs
    return detailed if detailed else uniq[:10]


# ====================== Transform (cleaning) ======================
def clean_artworks(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in ["title", "artist", "culture", "period", "medium", "objectDate", "department"]:
        df[col] = df[col].fillna("").astype(str).str.strip()
    df = df.drop_duplicates(subset=["objectID"]).reset_index(drop=True)
    return df


def clean_exhibitions(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in ["title", "dates", "location", "description", "url"]:
        if col in df:
            df[col] = df[col].fillna("").astype(str).str.strip()
    df = df.drop_duplicates(subset=["title", "url"]).reset_index(drop=True)
    return df


# ====================== Enrich (AI) ======================
def enrich_rows(df: pd.DataFrame, kind: str, rpm: int) -> pd.DataFrame:
    rows = []
    for _, row in df.iterrows():
        data = row.to_dict()
        try:
            add = enrich_artwork_row(data) if kind == "artwork" else enrich_exhibition_row(data)
        except Exception as e:
            print(f"[ENRICH ERROR] kind={kind} title={data.get('title')!r}: {e}")
            add = {"_ai_error": True}
        rows.append({**data, **add})
        time.sleep(60.0 / max(rpm, 1))
    return pd.DataFrame(rows)


# ====================== I/O helpers ======================
def write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def write_csv(path: str, df: pd.DataFrame) -> None:
    df.to_csv(path, index=False, quoting=csv.QUOTE_MINIMAL)


# ====================== Linking (make datasets work together) ======================
_WORDS = re.compile(r"[a-z]{3,}")


def _tok(s: str) -> set[str]:
    return set(_WORDS.findall((s or "").lower()))


def link_artworks_exhibitions(art_en: pd.DataFrame, ex_en: pd.DataFrame) -> pd.DataFrame:
    def art_tokens(row) -> set[str]:
        bag = " ".join(
            [
                str(row.get("title", "")),
                str(row.get("artist", "")),
                str(row.get("culture", "")),
                str(row.get("period", "")),
                str(row.get("medium", "")),
                str(row.get("era_style", "")),
                str(row.get("themes", "")).replace(";", " "),
            ]
        )
        return _tok(bag)

    def ex_tokens(row) -> set[str]:
        bag = " ".join(
            [
                str(row.get("title", "")),
                str(row.get("description", "")),
                str(row.get("buzz_summary", "")),
                str(row.get("audience_takeaway", "")),
                str(row.get("similarity_cluster", "")),
            ]
        )
        return _tok(bag)

    def overlap(a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        return len(a & b) / max(1, len(a))

    art_rows = art_en.to_dict(orient="records")
    ex_rows = ex_en.to_dict(orient="records")
    art_tok = [(r.get("objectID"), art_tokens(r)) for r in art_rows]
    ex_tok = [(r.get("title"), ex_tokens(r)) for r in ex_rows]

    links: List[Dict[str, Any]] = []
    for ex_title, ex_t in ex_tok:
        scored = []
        for art_id, a_t in art_tok:
            s = overlap(a_t, ex_t)
            if s >= 0.15:
                scored.append((art_id, s))
        scored.sort(key=lambda x: x[1], reverse=True)
        for art_id, s in scored[:5]:
            links.append(
                {"exhibition_title": ex_title, "objectID": art_id, "match_score": round(s, 3)}
            )
    return pd.DataFrame(links)


# ====================== CLI ======================
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Met API + Exhibitions scrape + DeepSeek enrichment"
    )
    p.add_argument("--met-query", default="Impressionism", help="Search query for Met API")
    p.add_argument("--department", type=int, default=None, help="Met department ID (optional)")
    p.add_argument("--max-artworks", type=int, default=30, help="Max artworks to fetch")
    p.add_argument(
        "--has-images",
        default="true",
        choices=["true", "false"],
        help="Whether to require objects with images (Met API filter)",
    )
    p.add_argument(
        "--exhibitions-url",
        default="https://www.metmuseum.org/exhibitions",
        help="Exhibitions listing URL",
    )
    p.add_argument(
        "--exhibition-filter",
        default="",
        help="Keep exhibitions whose title/desc contains this term",
    )
    p.add_argument("--rate-limit", type=int, default=40, help="DeepSeek requests per minute")
    return p.parse_args()


# ====================== Main ======================
def main() -> None:
    ensure_dirs()
    paths = Paths()
    args = parse_args()

    # Extract
    artworks = fetch_met_artworks(
        args.met_query,
        args.department,
        max_artworks=args.max_artworks,
        has_images=(args.has_images == "true"),
    )
    exhibitions = parse_exhibitions_listing(args.exhibitions_url)

    # Save raw
    write_json(paths.raw_artworks, artworks)
    write_json(paths.raw_exhibitions, exhibitions)

    # Transform
    art_df = clean_artworks(pd.DataFrame(artworks))
    ex_df = clean_exhibitions(pd.DataFrame(exhibitions))

    # Optional filter (bonus: user-directed output)
    if args.exhibition_filter:
        term = args.exhibition_filter.lower()
        mask = ex_df["title"].str.lower().str.contains(term) | ex_df["description"].str.lower().str.contains(term)
        ex_df = ex_df[mask].reset_index(drop=True)

    # Enrich
    art_en = enrich_rows(art_df, kind="artwork", rpm=args.rate_limit)
    ex_en = enrich_rows(ex_df, kind="exhibition", rpm=args.rate_limit)

    # Data-quality flags (non-AI)
    def _flag_missing(row: pd.Series, cols: List[str]) -> str:
        missing = [c for c in cols if not str(row.get(c, "")).strip()]
        return ";".join(f"missing:{c}" for c in missing)

    art_en["raw_quality_flags"] = art_en.apply(
        _flag_missing, axis=1, cols=["title", "artist", "culture", "period", "medium", "objectDate"]
    )
    ex_en["raw_quality_flags"] = ex_en.apply(
        _flag_missing, axis=1, cols=["title", "dates", "location", "description"]
    )

    # Links (make the two sources work together)
    links_df = link_artworks_exhibitions(art_en, ex_en)
    write_csv(paths.links, links_df)

    # Load
    write_csv(paths.enriched_artworks, art_en)
    write_csv(paths.enriched_exhibitions, ex_en)

    # Examples for docs
    art_df.head(10).to_csv("examples/sample_artworks_before.csv", index=False)
    art_en.head(10).to_csv("examples/sample_artworks_after.csv", index=False)
    ex_df.head(10).to_csv("examples/sample_exhibitions_before.csv", index=False)
    ex_en.head(10).to_csv("examples/sample_exhibitions_after.csv", index=False)

    examples = {
        "artworks_before": art_df.head(3).to_dict(orient="records"),
        "artworks_after": art_en.head(3).to_dict(orient="records"),
        "exhibitions_before": ex_df.head(3).to_dict(orient="records"),
        "exhibitions_after": ex_en.head(3).to_dict(orient="records"),
    }
    write_json("examples/before_after.json", examples)

    # Coverage report (print to console)
    def _cov(df: pd.DataFrame, col: str) -> float:
        return float((df[col].astype(str).str.strip() != "").mean()) * 100 if col in df else 0.0

    print(
        f"Coverage (artworks): artist={_cov(art_en,'artist'):.0f}% "
        f"culture={_cov(art_en,'culture'):.0f}% period={_cov(art_en,'period'):.0f}%"
    )
    print(
        f"Coverage (exhibitions): dates={_cov(ex_en,'dates'):.0f}% "
        f"location={_cov(ex_en,'location'):.0f}%"
    )

    print("DONE ✅")
    print(f"Raw: {paths.raw_artworks}, {paths.raw_exhibitions}")
    print(f"Enriched: {paths.enriched_artworks}, {paths.enriched_exhibitions}")
    print(f"Links: {paths.links}")
    print("Examples: examples/before_after.json (+ sample CSVs)")


if __name__ == "__main__":
    main()
