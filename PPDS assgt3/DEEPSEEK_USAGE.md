# 🤖 DeepSeek AI Enrichment

### Artworks
- `era_style`  
- `summary`  
- `themes`  
- `quality_flags`  

### Exhibitions
- `audience_takeaway`  
- `buzz_summary`  
- `similarity_cluster`  
- `data_flags`  

---

## 📖 Before & After
```json
{
  "artworks_before": [
    { "objectID": 436121, "title": "Wheat Field with Cypresses", "artist": "Van Gogh" }
  ],
  "artworks_after": [
    { 
      "objectID": 436121,
      "title": "Wheat Field with Cypresses",
      "artist": "Van Gogh",
      "era_style": "Post-Impressionism",
      "themes": "nature;landscape"
    }
  ]
}
```

## 🧠 Prompts

### Artworks
```json
{
  "role": "system",
  "content": "You are a museum metadata assistant. Given raw artwork info (title, artist, medium, date, culture, period), return structured JSON with:\n- era_style\n- summary (≤22 words)\n- themes (2–4 tags)\n- quality_flags"
}

```

### Exhibitions
```json
{
  "role": "system",
  "content": "You are an exhibition reviewer. Given exhibition title + description, return structured JSON with:\n- audience_takeaway\n- buzz_summary (≤20 words)\n- similarity_cluster\n- data_flags"
}
```

## 📖 Before & After
-Turned sparse metadata → thematic, usable insights
-Audience-facing buzz lines
-Machine-friendly clustering labels


