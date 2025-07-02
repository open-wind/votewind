#!/bin/bash

set -e

echo "Preparing static export..."

# # Step 1: Rename [[...slug]] folder to hide it from Next.js
# if [ -d "src/app/[[...slug]]" ]; then
#   mv src/app/[[...slug]] src/app/[[...slug]]_dev
#   echo "Moved [[...slug]] → [[...slug]]_dev"
# fi

# # Step 2: Copy dev router to app/page.js
# cp src/app/[[...slug]]_dev/page.js src/app/page.js
# echo "Copied catch-all router to app/page.js"

# Step 3: Run build + export
npm run build
npm run export

# # Step 4: Clean up
# rm src/app/page.js
# mv src/app/[[...slug]]_dev src/app/[[...slug]]
# echo "Restored [[...slug]] and cleaned up"
