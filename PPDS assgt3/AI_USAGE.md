# AI Usage Report

## 🤖 Tools Used
- **ChatGPT (GPT-5)** → tutoring, code generation, debugging, documentation  
- **DeepSeek API** → data enrichment inside the ETL pipeline  

---

## 📌 How AI Helped

### 1. Idea Generation
- Brainstormed project scope (using Met Museum API + exhibitions scraping).  
- Suggested AI enrichment features (themes, buzz summaries, clustering).  
- Helped decide on repository structure and evaluation criteria coverage.  

### 2. Code Writing & Commenting
- Generated starter ETL code (`main.py`) with API calls, scraping logic, and enrichment hooks.  
- Wrote docstrings and inline **comments** to make the pipeline clearer.  
- Proposed reusable helper functions (retry, error handling, JSON dump helpers).  

### 3. Debugging & Bug Fixing
- Fixed **broken regex** for exhibition dates → added multiple fallback strategies.  
- Solved **JSON parse errors** from DeepSeek responses → added try/except + error flags.  
- Helped fix scraping issues when `location` or `dates` were missing by chaining multiple extraction methods (JSON-LD, scripts, DOM).  

### 4. Documentation
- helped in generating text for **README.md**, **DEEPSEEK_USAGE.md**, and this file.  
- Suggested before/after examples for showing AI value.  
- Ensured documentation followed **grading rubric** (PEP8, repo structure, enrichment explanation).  

---

## 🐞 Example Bugs AI Helped Fix
| Bug | AI Suggestion | Result |
|-----|---------------|--------|
| Dates missing on most exhibitions | Add JSON-LD + `<script>` text parsing fallback | Now at least one date is extracted in raw data |
| DeepSeek API returned non-JSON | Add `try/except` with error flag `_ai_error=True` | Pipeline no longer crashes |
| Coverage report missing | Add helper `_cov` to measure % filled columns | Console prints coverage stats |

---

## 📈 Performance Difference
- **Without AI**: raw datasets with many missing fields (artist, culture, dates).  
- **With AI**: enriched fields like `era_style`, `themes`, `buzz_summary`, `audience_takeaway`, making the dataset usable for analysis and linking.  

---

## 📝 Reflection
AI sped up:
- Brainstorming project direction.  
- Writing + commenting on code.  
- Debugging scraping issues.  
- Writing documentation.  

**Final judgment**: AI was a **collaborative coding partner**, but **human validation** was required to check scraping accuracy and enrichment quality.  
