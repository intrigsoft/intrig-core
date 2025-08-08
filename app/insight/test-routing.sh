#!/bin/bash

echo "Building the application to test routing..."
cd /home/tiran-intrigsoft/IdeaProjects/intrig-core
npx nx build @intrig-core/insight

if [ $? -eq 0 ]; then
  echo "Build successful. The routing implementation should be working correctly."
  echo "To test the application, run: npx nx serve @intrig-core/insight"
  echo "Then navigate to the following routes in your browser:"
  echo "- Home: http://localhost:4200/"
  echo "- About: http://localhost:4200/about"
  echo "- Dashboard: http://localhost:4200/dashboard"
else
  echo "Build failed. Please check the error messages above."
fi