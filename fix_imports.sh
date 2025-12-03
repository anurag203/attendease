#!/bin/bash

# Fix all screen files to properly import SafeAreaView
for file in src/screens/**/*.js; do
  # Remove SafeAreaView from react-native import if it exists
  sed -i '' 's/SafeAreaView, //g' "$file"
  sed -i '' 's/, SafeAreaView//g' "$file"
  sed -i '' 's/SafeAreaView,//g' "$file"
  
  # Add SafeAreaView import from react-native-safe-area-context if not present
  if ! grep -q "import { SafeAreaView } from 'react-native-safe-area-context';" "$file"; then
    # Add after the react-native import
    sed -i '' "/from 'react-native';/a\\
import { SafeAreaView } from 'react-native-safe-area-context';
" "$file"
  fi
done

echo "Fixed all imports!"
