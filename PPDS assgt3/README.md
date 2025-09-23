# Met Museum ETL + DeepSeek Enrichment

## 📌 Overview
This project builds an **AI-enhanced ETL pipeline** that combines:
1. **API extraction** → from the [Metropolitan Museum of Art Collection API](https://metmuseum.github.io/).  
2. **Web scraping** → from The Met’s exhibitions pages (which don’t expose a public API).  
3. **Data cleaning & transformation** → using **pandas** to normalize inconsistent fields.  
4. **AI enrichment** → via the **DeepSeek API**, which generates additional insights such as summaries, themes, and audience takeaways.  

The result is a **clean, enriched dataset** linking artworks with exhibitions, showing both raw and AI-augmented value.

---

## ⚙️ Setup

### 1. Clone and create environment
```bash
git clone <your-repo-url>
cd project-name
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

```

### Example Run 

python main.py \
  --met-query "European Paintings" \
  --department 11 \
  --max-artworks 40 \
  --has-images true \
  --exhibitions-url "https://www.metmuseum.org/en/exhibitions/past" \
  --rate-limit 30


## 📊 Outputs

- **Raw**  
  - `data/raw/met_artworks_raw.json`  
  - `data/raw/exhibitions_raw.json`

- **Enriched**  
  - `data/enriched/artworks_enriched.csv`  
  - `data/enriched/exhibitions_enriched.csv`  
  - `data/enriched/links_artworks_exhibitions.csv`

- **Examples**  
  - Before/after JSON  
  - Sample CSVs

- **Console Logs**  
  - Prints coverage report for missing fields:
    - Artist  
    - Culture  
    - Dates  
    - etc.
