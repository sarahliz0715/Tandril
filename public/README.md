# Public Assets Folder

This folder contains static assets that are served directly by the application.

## Logo File

Place your Tandril vine-style logo here as:
- `tandril-logo.png` (recommended)
- `tandril-logo.svg` (also supported)

The logo will automatically appear on the landing page at the top of the hero section.

## How to Add Your Logo

### Via GitHub (Easiest):
1. Go to your GitHub repository
2. Navigate to the `public` folder
3. Click "Add file" → "Upload files"
4. Drag and drop your `tandril-logo.png` file
5. Commit the changes
6. Vercel will auto-deploy with your logo!

### Via Git (Command Line):
```bash
# Copy your logo file to this folder
cp /path/to/your/logo.png public/tandril-logo.png

# Commit and push
git add public/tandril-logo.png
git commit -m "Add Tandril vine logo"
git push
```

The logo should be approximately square and will display at 128px height on the landing page.
