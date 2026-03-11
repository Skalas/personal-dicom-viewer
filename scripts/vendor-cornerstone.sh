#!/bin/bash
# Script to vendor Cornerstone3D packages
# This copies the installed packages from node_modules to the vendor directory

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_DIR="$PROJECT_ROOT/vendor/cornerstone3d"
NODE_MODULES="$PROJECT_ROOT/app/node_modules/@cornerstonejs"

echo -e "${YELLOW}Cornerstone3D Vendoring Script${NC}"
echo "================================"
echo ""

# Check if node_modules exists
if [ ! -d "$NODE_MODULES" ]; then
    echo -e "${RED}Error: node_modules/@cornerstonejs not found${NC}"
    echo "Please run 'cd app && npm install' first"
    exit 1
fi

# Create vendor directory
echo -e "${GREEN}Creating vendor directory...${NC}"
mkdir -p "$VENDOR_DIR"

# List of packages to vendor
PACKAGES=(
    "core"
    "tools"
    "dicom-image-loader"
    "codec-openjpeg"
    "codec-libjpeg-turbo-8bit"
    "codec-charls"
    "codec-openjph"
)

echo -e "${GREEN}Copying packages...${NC}"
for package in "${PACKAGES[@]}"; do
    if [ -d "$NODE_MODULES/$package" ]; then
        echo "  - Copying $package..."
        rm -rf "$VENDOR_DIR/$package"
        cp -r "$NODE_MODULES/$package" "$VENDOR_DIR/"

        # Get package version
        VERSION=$(node -p "require('$NODE_MODULES/$package/package.json').version" 2>/dev/null || echo "unknown")
        echo "    Version: $VERSION"
    else
        echo -e "  ${YELLOW}- Warning: $package not found in node_modules${NC}"
    fi
done

echo ""
echo -e "${GREEN}Vendoring complete!${NC}"
echo ""
echo "Vendored packages location: $VENDOR_DIR"
echo ""
echo "Next steps:"
echo "1. Update vite.config.ts to resolve from vendor/"
echo "2. Test the build: cd app && npm run build"
echo "3. Commit the vendored packages to git"
