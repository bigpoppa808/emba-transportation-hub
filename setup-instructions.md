# Setting Up Shared Storage for EMBA Transportation Hub

Since GitHub Pages only serves static files, we need an external service for shared data storage. Here are the best FREE options:

## Option 1: Use the Current Local Storage Version
- Data is stored per browser/device
- Good for personal use
- No setup required

## Option 2: Google Sheets as Database (Recommended)
1. Create a Google Sheet
2. Use Google Apps Script to create an API
3. Free and reliable
4. Instructions: https://github.com/jamiewilson/form-to-google-sheets

## Option 3: Supabase (Best for Real Apps)
1. Go to https://supabase.com
2. Create free account (no credit card)
3. Create new project
4. Get your project URL and anon key
5. Update app with credentials

## Option 4: Use a Shared Google Form
1. Create a Google Form for submissions
2. Link to Google Sheet for viewing
3. Embed both in the page

## Quick Solution for Your Class

Since you need this working immediately, here's what I recommend:

1. **For Now**: Use the local storage version - each person can still use it, they just won't see each other's entries

2. **For Sharing**: Create a shared Google Sheet where people can manually add their travel plans

3. **Best Solution**: Set up a simple Google Form that feeds into a Google Sheet:
   - Form for adding entries: https://forms.google.com
   - Sheet for viewing: Share as view-only
   - Both links on your GitHub Pages site

Would you like me to create a version that works with Google Sheets API or would you prefer to use the local storage version for now?