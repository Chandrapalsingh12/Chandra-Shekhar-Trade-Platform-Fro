"""
Frontend Build Script - Minifies and obfuscates JS for production
Protects intellectual property from view-source inspection
"""

import os
import subprocess
import sys
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
STATIC_DIR = PROJECT_ROOT / "src" / "app" / "static"
JS_SRC = STATIC_DIR / "js"
JS_DIST = STATIC_DIR / "js" / "dist"
CSS_SRC = STATIC_DIR / "css"
CSS_DIST = STATIC_DIR / "css" / "dist"


def check_terser():
    """Check if terser is installed"""
    try:
        subprocess.run(["npx", "terser", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_terser():
    """Install terser for minification"""
    print("📦 Installing terser...")
    subprocess.run(["npm", "install", "-g", "terser"], check=True)


def minify_js_file(src_path: Path, dest_path: Path):
    """Minify a single JS file with obfuscation"""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    cmd = [
        "npx", "terser",
        str(src_path),
        "--compress",
        "--mangle",
        "--mangle-props", "regex=/^_/",  # Mangle private properties
        "--output", str(dest_path)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        # Calculate size reduction
        orig_size = src_path.stat().st_size
        new_size = dest_path.stat().st_size
        reduction = ((orig_size - new_size) / orig_size) * 100
        print(f"  ✅ {src_path.name} → {dest_path.name} ({reduction:.1f}% smaller)")
    else:
        print(f"  ❌ Failed: {src_path.name}")
        print(f"     {result.stderr}")


def minify_css_file(src_path: Path, dest_path: Path):
    """Minify a single CSS file"""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Simple CSS minification (remove whitespace and comments)
    with open(src_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove comments
    import re
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Remove whitespace
    content = re.sub(r'\s+', ' ', content)
    # Remove space around punctuation
    content = re.sub(r'\s*([{};:,>+~])\s*', r'\1', content)
    content = content.strip()
    
    with open(dest_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    orig_size = src_path.stat().st_size
    new_size = dest_path.stat().st_size
    reduction = ((orig_size - new_size) / orig_size) * 100
    print(f"  ✅ {src_path.name} → {dest_path.name} ({reduction:.1f}% smaller)")


def bundle_js_files():
    """Bundle all JS files into a single minified file"""
    print("\n📦 Bundling JS files...")
    
    # Order matters - dependencies first
    js_files = [
        JS_SRC / "components" / "ui_utils.js",
        JS_SRC / "components" / "chart_grid.js",
        JS_SRC / "components" / "execution.js",
        JS_SRC / "components" / "tape.js",
        JS_SRC / "main.js",
    ]
    
    # Concatenate all files
    combined = ""
    for js_file in js_files:
        if js_file.exists():
            with open(js_file, 'r', encoding='utf-8') as f:
                combined += f"\n// === {js_file.name} ===\n"
                combined += f.read()
                combined += "\n"
    
    # Write combined file
    combined_path = JS_DIST / "pulse.bundle.js"
    combined_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(combined_path, 'w', encoding='utf-8') as f:
        f.write(combined)
    
    # Minify the bundle
    minified_path = JS_DIST / "pulse.bundle.min.js"
    minify_js_file(combined_path, minified_path)
    
    # Remove intermediate file
    combined_path.unlink()
    
    print(f"\n✅ Bundle created: {minified_path}")


def build():
    """Main build process"""
    print("🔨 Building frontend for production...")
    print("=" * 50)
    
    # Check/install terser
    if not check_terser():
        print("⚠️  Terser not found. Installing...")
        install_terser()
    
    # Minify individual JS files
    print("\n📄 Minifying JavaScript files...")
    js_files = list(JS_SRC.rglob("*.js"))
    for js_file in js_files:
        if "dist" not in str(js_file):
            rel_path = js_file.relative_to(JS_SRC)
            dest_path = JS_DIST / rel_path.with_suffix(".min.js")
            minify_js_file(js_file, dest_path)
    
    # Minify CSS files
    print("\n🎨 Minifying CSS files...")
    css_files = list(CSS_SRC.glob("*.css"))
    for css_file in css_files:
        if "dist" not in str(css_file):
            dest_path = CSS_DIST / css_file.name.replace(".css", ".min.css")
            minify_css_file(css_file, dest_path)
    
    # Create bundle
    bundle_js_files()
    
    print("\n" + "=" * 50)
    print("✅ Build complete!")
    print("\n📝 To use minified files in production:")
    print("   1. Update pro_terminal.html to load from /static/js/dist/")
    print("   2. Or load the single bundle: pulse.bundle.min.js")


if __name__ == "__main__":
    build()
