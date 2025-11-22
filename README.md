# comparepassword
compare the strength of 2 passwords

This repository contains a small static webapp that compares two passwords by estimating their effective entropy (in bits) and assigning a strength label. The app also deterministically selects which password is stronger.

Run locally:

1. Open `index.html` directly in a browser (for local testing) or serve the folder using a static server:

```bash
# from the repository root
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

2. Enter two passwords and the page will show each password's estimated entropy, strength label, and a highlighted stronger password.

Notes about the estimator:
- The app computes a pool-based entropy estimate (based on character classes) and a Shannon entropy estimate, then combines them into an effective-entropy score.
- It applies deductions for repeated characters and long sequences to better reflect real-world strength.
- The estimator is intentionally lightweight and conservative; for stronger, more accurate checks consider libraries such as `zxcvbn`.
