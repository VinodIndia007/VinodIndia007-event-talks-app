# BigQuery Release Pulse 🚀

**BigQuery Release Pulse** is a premium, modern web application built using Python Flask on the backend and plain vanilla HTML, CSS, and JavaScript on the frontend. It fetches the official Google Cloud BigQuery Release Notes RSS/Atom feed, parses and splits multi-announcement daily feeds into individual updates, caches the results to optimize performance, and enables users to quickly draft and share updates to X (formerly Twitter).

---

## ✨ Features

* **Real-time Feed Parser**: Automatically fetches and parses Google's BigQuery release notes XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
* **Sub-Update Splitting**: Uses a stateful Python `HTMLParser` to split grouped daily release entries into individual, select-able announcement cards (Features, Changes, Issues, Deprecated).
* **Smart Memory Caching**: Implements a 10-minute automatic caching policy to prevent hitting Google Cloud rate limits, with a manual fallback support.
* **Premium Glassmorphic Design**: Responsive dashboard featuring a dark-mode-first aesthetic with a fluid light-mode transition, glowing search boxes, and smooth animations.
* **Search & Filters**: Instantly search updates by keywords or filter by type (Features, Changes, Issues, Deprecated) with live counts.
* **X (Twitter) Share Hub**:
  * Customizable post composition modal.
  * Live character counter with standard 280-limit warning thresholds.
  * Quick hashtag toggles (`#BigQuery`, `#GoogleCloud`, `#GCP`, `#DataEngineering`).
  * Direct clipboard copy with feedback animations.
  * Integration with Twitter Web Intent for secure publishing without requiring API credentials.
* **Toast System**: Slide-in success, info, and error banners.

---

## 📁 Directory Structure

```
agy-cli-projects/
├── app.py                   # Flask server, Atom XML parser, & memory cache
├── requirements.txt         # Backend Python dependencies
├── README.md                # Project documentation
├── .gitignore               # Excludes python cache, envs, & local configurations
├── templates/
│   └── index.html           # Main dashboard template, modals, and indicators
└── static/
    ├── css/
    │   └── style.css        # Glassmorphic layout styles and theme variable mappings
    └── js/
        └── app.js           # AJAX fetches, rendering, filter state, & sharing controllers
```

---

## 🛠️ Getting Started

### Prerequisites

Make sure you have Python 3.14+ installed on your machine.

### Installation

1. Clone or download this project to your local workspace directory.
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

1. Start the Flask server:
   ```bash
   python app.py
   ```
2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```
3. To view raw parsed release updates as JSON, visit:
   ```
   http://127.0.0.1:5000/api/updates
   ```

---

## ⚙️ Architecture Detail

* **Backend**: Flask routing, cached API request handling, XML tag bindings, and content string splits.
* **Frontend**: HTML5 structural layout, custom CSS3 variable definitions (Light/Dark themes), and JavaScript ES6+ AJAX requests, client-side arrays filtering, clipboard API bindings, and web intent triggers.
* **Icons**: [Lucide Icons](https://lucide.dev)
* **Fonts**: Outfit (headings) & Inter (body)
