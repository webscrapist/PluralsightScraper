# Pluralsight Scraper

This is a script that collects video courses from Plurasight and stores them properly in a structured format.

## Usage

In `user.js` put your Pluralsight account email and password and supply a location to save the videos to (By default in `C:\Pluralsight-Courses`)
> If the Pluralsight credentials aren't provided in `user.js` the script will prompt you for them. However, the save location is required.
After modifying `user.js` proceed with these commands:

    git clone https://github.com/AhmedMoalla/PluralsightScraper
    npm install
    npm start table-of-contents-url


In the last command, replace `table-of-content-url` with a valid url from a pluralsight course as indicated in the following GIF:
![Usage](https://i.imgur.com/CnCeBNh.gif)


Inspired by: https://github.com/knyzorg/pluralsight-scraper